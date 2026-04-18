# CONTRIBUTOR.md — extending AdBot AI (for technical customers)

You own this codebase. You can add features, endpoints, UI pages, new
rule actions — whatever fits your business. This doc shows you how to
do it WITHOUT accidentally breaking the license gate that protects the
software you paid for.

If you just want to install + use AdBot AI as-is, stop reading here and
open `CUSTOMER_GUIDE_v2.md` or run `bash ./setup.sh` for the guided
install. This file is for people who want to write code.

---

## The license gate — the one rule you need to respect

**Every route under `/api/*` is license-gated by default.** This is
enforced by `functions/_middleware.ts`, which CF Pages runs before
every API handler.

What this means for you:

- **You don't need to add a license check to a new endpoint.** Just
  create `functions/api/<yourfeature>/<handler>.ts`, and the middleware
  gates it automatically.
- **You don't have to remember anything.** Forget to add a check → it's
  still gated, because the middleware is default-deny.
- **You can't accidentally expose a feature pre-license.** Any endpoint
  you add lands behind the wall the moment it deploys.

The only exceptions are the explicit public allow-list inside the
middleware:

```
/api/license/*      ← license setup + status (bootstrap)
/api/auth/*         ← login / register / logout (works without license)
/api/cron/*         ← cron hits, own-secret gated
/api/health         ← liveness probe
/api/telegram/webhook  ← external callback, own-secret verification
```

If you need a new public route for a similar reason (e.g., a third-party
webhook), add its prefix to `PUBLIC_PATH_PREFIXES` in
`functions/_middleware.ts` AND make sure it has its own authentication
(webhook signature, shared secret, IP allow-list). Don't just add a
path because "it's simpler."

---

## How the license gate works (for the curious)

```
┌─ client request: POST /api/rules/my-new-thing
│
└─> functions/_middleware.ts onRequest
      ├─ Is path in PUBLIC_PATH_PREFIXES? ─ YES ─> pass through
      │                                    └─ NO
      ├─> checkLicense(env)
      │     ├─ KV cache hit (fresh)? ─ YES ─> use cached decision
      │     │                          └─ NO
      │     ├─> brain /v1/license/validate (HTTPS, JWT + domain)
      │     └─> cache the response for cache_ttl_sec (default 1h)
      │
      └─> switch on phase:
            active      → pass through
            warning     → pass through + banner headers (SPA shows countdown)
            degrade     → GET/HEAD pass (read-only); POST/PUT/PATCH/DELETE 402
            hard_block  → 402 everything
            misconfigured → 402 everything (env not set)
```

### The four phases (B29 soft-cutoff)

| Phase      | Customer sees                   | What works |
|------------|---------------------------------|------------|
| active     | Normal UI                        | Everything |
| warning    | Yellow banner + day countdown    | Everything (banner only) |
| degrade    | Orange banner + read-only notice | Reads only; all mutations 402 |
| hard_block | Red lockout screen               | Nothing (full 402) |

Phases are computed at the brain from `grace_until` + `expires_at` + 7-day / 21-day windows. You don't configure them — the brain does.

### Response headers (for the SPA)

On every `/api/*` response the middleware sets headers so the UI can
react without a second API call:

```
X-Adbot-License-State:        active | warning | degrade
X-Adbot-License-Warning:      license_expiring | license_revoked_grace | …
X-Adbot-License-Days-Remaining:       7  (warning phase)
X-Adbot-License-Days-Remaining-Hard:  14 (degrade phase)
X-Adbot-License-Revoked-Reason:       chargeback | fraud | …
X-Adbot-License-Grace-Until:          1745000000 (Unix sec)
```

---

## Adding a new feature endpoint — minimal example

### 1. Create the Function

```typescript
// functions/api/marketing/campaign-planner.ts
type Env = { DB: D1Database; [k: string]: unknown };
type Context = EventContext<Env, string, Record<string, unknown>>;

export async function onRequestPost(context: Context): Promise<Response> {
  // You don't have to touch the license here — middleware already did.
  const body = await context.request.json();
  // … your logic …
  return Response.json({ ok: true });
}
```

That's it. The middleware gates this route. Revoked licenses get 402.
Active licenses get your code.

### 2. (Optional) Scattered-check defense in depth

For feature-critical code paths you want to protect more aggressively
— e.g., a rule evaluator that could be patched out of the UI — call
`requireLicense()` at the top:

```typescript
import { requireLicense, LicenseRequiredError } from '../../_lib/license-guard';

export async function onRequestPost(context: Context): Promise<Response> {
  try {
    await requireLicense(context.env, 'campaign_planner');
  } catch (e) {
    if (e instanceof LicenseRequiredError) {
      return Response.json({ error: e.message }, { status: 402 });
    }
    throw e;
  }
  // … your logic …
}
```

Why do this when the middleware already gates the route?

- **Defense in depth.** If someone patches out `_middleware.ts`, the
  scattered checks in feature code still fire.
- **Distinct error messages.** Each scattered check uses a different
  feature name, so a patcher can't grep one sentinel string and null-
  patch the whole system with a single replace.
- **Per-feature gating.** If you ever move to tiered licenses (basic /
  pro / enterprise), `requireLicense('feature_name')` verifies the
  license's `features[]` includes your feature. `features: ['all']`
  passes everything; anything else must include the feature name.

Use `requireLicense()` sparingly — in hot paths, in mutation
endpoints, in AI-proxy call sites. Don't wrap every handler; the
middleware already covers those.

### 3. Don't do this

```typescript
// ❌ Bad — hard-coded bypass
export async function onRequestGet(_context: Context): Promise<Response> {
  if (process.env.NODE_ENV === 'development') return Response.json({ ok: true });
  // …
}
```

```typescript
// ❌ Worse — monkey-patching the guard
import * as guard from '../../_lib/license-guard';
(guard as any).checkLicense = async () => ({ ok: true });
```

Both of these defeat the whole point of the gate. If you need a dev-
mode shortcut, use `ADBOT_BRAIN_URL=https://staging.brain.example.com`
pointed at a test brain that mints you a valid staging license.

---

## Adding a route that should NOT be license-gated

Think carefully: does this route really need to work without a
license? The default-deny is load-bearing. Good reasons:

- External webhook (needs to deliver even if the customer's license
  lapsed — you wouldn't want to miss a chargeback notification)
- Health/liveness check (for uptime monitors)
- The license bootstrap itself (setting/reading license state)

Bad reasons:

- "It's a public page" — UI pages are static assets, not `/api/*`
  routes. The middleware only runs on Functions.
- "It's internal" — internal means "call it from server-side code,"
  not "put it on the public internet without auth."

### How to add a public route

1. Create the Function under `functions/api/<path>.ts` as usual.
2. Open `functions/_middleware.ts`.
3. Add your path prefix to `PUBLIC_PATH_PREFIXES`:
   ```typescript
   const PUBLIC_PATH_PREFIXES = [
     '/api/license',
     '/api/auth',
     '/api/cron',
     '/api/health',
     '/api/healthz',
     '/api/telegram/webhook',
     '/api/your-new-public',   // ← add here
   ];
   ```
4. **Add your own authentication.** Public-from-the-license-gate does
   NOT mean public-to-the-world. Every public route needs:
   - A shared secret (for webhooks — verify the incoming signature)
   - Or IP allow-listing (for known external services)
   - Or rate limiting (for health endpoints that could be spammed)
5. Run `bun run smoke-license-gate.ts` to confirm your new prefix
   passes through during a revoked-license test.

---

## Testing your changes

Run the full license-gate smoke suite:

```bash
bun run smoke-license-gate.ts
```

29 assertions cover:
- Golf's 3 spec cases (revoked→402, active→200, custom-endpoint-default-deny)
- All public prefixes pass through
- Warning phase passes through + sets headers
- Degrade phase: GET passes, POST/PUT/PATCH/DELETE → 402
- Misconfigured → 402
- Prefix-smuggling defense (e.g. `/api/licensesomething` doesn't match `/api/license`)

If you add a new public prefix, add a smoke assertion for it too —
otherwise a future refactor could accidentally close it off.

---

## Contract references

- `~/shared/contracts/adbot-license-contract.json` — the brain ↔ self-host wire contract
- `functions/_lib/brain-client.ts` — typed client for brain HTTPS endpoints
- `functions/_lib/license-guard.ts` — local validation + caching
- `functions/_middleware.ts` — the gate itself

Security invariants are documented in the brain contract's
`security_invariants[]` array. Don't violate those — you'll make your
own installation easier to attack.

---

## Shipping your changes

When you deploy your fork:

1. Make sure `bun run smoke-license-gate.ts` passes.
2. `bun run build`
3. `bunx wrangler pages deploy dist --project-name <your-slug>`

Your changes go through the same license gate as the stock code. If
the license is revoked, your extensions stop working along with the
base app — that's the point.

---

*Questions? Your license includes email support. Contact the vendor
who sold you this code — don't ask Cloudflare or Anthropic.*
