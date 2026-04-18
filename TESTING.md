# Testing — adbot-ai-product

## Running

```bash
bun install
bunx playwright install chromium   # one-time
bunx playwright test               # full suite
bunx playwright test --reporter=list   # verbose per-test output
bunx playwright test -g "warning"  # filter by test name
```

`playwright.config.ts` spawns `vite --port 5173 --host 127.0.0.1` as the
webServer. Tests bind to `http://127.0.0.1:5173` and mock `/api/**` per
test — no real brain, no real session backend, no rate-limit budget
consumed.

## Architecture

Route-mock the API surface at the Playwright `page.route('**/api/**', ...)`
level. Dispatch by pathname inside a single handler; per-test helpers
register more specific routes via `page.route('**/api/auth/register', ...)`
and the global dispatcher calls `route.fallback()` so the per-test handler
wins.

See `tests/e2e-license-phases.spec.ts` — 12 tests cover the 4-phase
license lockdown UI + 6 register 402 modes, all via mocks, runs in ~5s.

## 🪤 Durable gotchas (worth reading before touching the test infra)

These are the kind of knowledge that re-costs a bug each time someone new
hits them. Preserved here so the next session doesn't have to rediscover.

### 1. Auth-endpoint divergence: `/api/auth/me` vs `/admin/auth/session`

Customer product (`adbot-ai-product`) authenticates via
**`/api/auth/me`** (AuthContext.tsx — customer product's own Functions).

Admin dashboard (`adbot-ai-admin`) authenticates via
**`/admin/auth/session`** at the brain (workers.dev — Golf's operator
surface).

They're different surfaces on different origins with different cookie
names (`adbot_session` vs `adbot_admin_session`). When you mock the auth
route in a Playwright test, match the repo you're testing:

- adbot-ai-product → `page.route('**/api/auth/me', ...)`
- adbot-ai-admin   → `page.route('**/admin/auth/session', ...)`

**Symptom of getting this wrong**: tests redirect to `/login` and
assertions about post-login UI time out with the login form visible in
the page snapshot.

### 2. Playwright routing is last-registered-wins → single-dispatcher

`page.route()` calls register handlers; when multiple patterns match the
same URL, the **last registered** one wins. Overlapping patterns like:

```ts
await page.route('**/api/license/status', h1);
await page.route('**/api/**', h2);   // wins for /api/license/status too!
```

…silently breaks — `h1` never fires because `h2` registered after.

**The fix**: register **one** `**/api/**` dispatcher that switches on
`new URL(route.request().url()).pathname`. For per-test overrides, use
`route.fallback()` inside the dispatcher so the per-test handler (added
**after** `mockBackend`) gets a chance:

```ts
await page.route('**/api/**', async (route) => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/api/auth/register') return route.fallback();   // per-test
  if (path === '/api/license/status') return route.fulfill({...});
  // ...
});
// later in the test:
await page.route('**/api/auth/register', respondWith402);
```

**Symptom of getting this wrong**: tests look correct but assertions time
out because the wrong mock response reached the UI.

### 3. Thai text collisions with `getByRole` strict mode

Thai UI copy overlaps more than English because the same root word
(e.g. `ตั้งค่า` = "settings"/"set up") appears in many labels. A locator
like `page.getByRole('link', { name: /ตั้งค่า/ })` can resolve to 3+
elements:
- Banner CTA: "ตั้งค่า"
- Sidebar: "ตั้งค่าเงื่อนไขบอท" (bot rule settings)
- Sidebar: "เชื่อมต่อ & ตั้งค่า" (connections & settings)

Strict mode (Playwright default) fails with
`strict mode violation: resolved to 3 elements`.

**The fix**: use `exact: true` to match only the literal label:

```ts
page.getByRole('link', { name: 'ตั้งค่า', exact: true })
```

When `exact` isn't enough (e.g. trailing whitespace), fall back to
`.locator('a:has-text("ตั้งค่า")').first()` — but `exact: true` handles
the common case cleanly.

**Symptom of getting this wrong**: `strict mode violation` in the error
log, usually surfaces as a generic "resolved to N elements" message.

## Test discipline

- **Fix + test together** — see the test FAIL without the fix first, then
  apply the fix and see it GREEN. Catches aspirational commits (the fix
  that "looks right" but never fires). Pattern locked across
  FRONTEND + BACKEND + GUARD this session.
- **Mock at the API layer, not the module layer** — Playwright routes
  give you the same thing the browser sees. Jest/Vitest module mocks can
  hide real bugs (e.g. wrong endpoint name, as gotcha #1 proved).
- **Opt-in for side-effect-ful tests** — real-KV suites, real-auth
  suites that burn rate-limit budget = gated by env flag
  (`ADBOT_E2E_REAL_KV=1` / `ADBOT_E2E_AUTH=1` pattern from the admin repo).
  Default test runs stay side-effect free.

## Related suites

- `adbot-ai-admin/tests/smoke.spec.ts` — admin helper smoke (skipped, superseded)
- `adbot-ai-admin/tests/e2e-real-kv.spec.ts` — admin data layer (opt-in)
- `adbot-ai-admin/tests/e2e-auth-flow.spec.ts` — admin magic-link (opt-in)
- `adbot-ai-product/tests/e2e-license-phases.spec.ts` — this repo (default)
