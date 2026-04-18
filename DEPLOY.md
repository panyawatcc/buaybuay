# DEPLOY.md — step-by-step Cloudflare Pages deploy

Target audience: you have a Cloudflare account and a Facebook Developer app, you want to deploy this template to `https://<your-subdomain>.pages.dev` (or a custom domain) in under 15 minutes.

If you need to create the FB app first, do [META_DEV_CONSOLE.md](./META_DEV_CONSOLE.md) in parallel.

---

## 0. Prerequisites

- Bun or Node 20+ installed locally
- `bunx wrangler --version` works (install with `bun add -g wrangler` or `npm i -g wrangler`)
- Cloudflare account with Pages + D1 enabled (free tier is enough to start)
- Your Meta app: FB_APP_ID, FB_APP_SECRET
- Your future public origin picked (e.g. `https://adbot.example.com` or `https://adbot-ai-<slug>.pages.dev`)

---

## 1. Clone + install

```bash
git clone <your-fork-of-this-repo>
cd adbot-ai-product
bun install
```

---

## 2. Log in to Cloudflare

```bash
bunx wrangler login
```

Browser opens → authorize. `wrangler whoami` will now show your account.

---

## 3. Run the guided setup

```bash
bash ./setup.sh
```

The script:
1. Creates a D1 database named `<project>-db`
2. Creates a KV namespace named `<project>-state`
3. Generates secure random `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`
4. Prompts for `FB_APP_ID`, `FB_APP_SECRET`, `FB_REDIRECT_URI`, `PUBLIC_ORIGIN`
5. Writes the database_id + kv_id into `wrangler.toml` (replaces the `REPLACE_ME_*` placeholders)
6. Sets every secret via `wrangler pages secret put`
7. Optionally applies all 21 D1 migrations in order

When it finishes, your `wrangler.toml` is configured and all secrets are in place.

If you skipped the migration step, apply them manually:

```bash
for f in migrations/*.sql; do
  bunx wrangler d1 execute <your-db-name> --remote --file "$f"
done
```

---

## 4. Build the frontend

```bash
bun run build
```

Output goes to `dist/`. Cloudflare Pages deploys that dir.

---

## 5. First deploy

```bash
bunx wrangler pages deploy dist --project-name adbot-ai
```

(Use the same project slug you passed to `setup.sh`.)

First deploy prints a URL like `https://abc123.adbot-ai.pages.dev` — this is your **preview** URL. The project's **production** URL is `https://adbot-ai.pages.dev`.

---

## 6. Register your OAuth redirect URI in Meta Dev Console

This is the step that can't be automated. In the Meta Developer Console for your app:

- App Settings → Facebook Login → Settings → "Valid OAuth Redirect URIs"
- Add: `https://<your-public-origin>/api/auth/callback`
  - Example: `https://adbot-ai.pages.dev/api/auth/callback`
  - If using a custom domain: `https://adbot.example.com/api/auth/callback`
- Save

Confirm `FB_REDIRECT_URI` secret you set in step 3 matches this URL exactly (protocol, host, port, path, trailing slash — all identical).

Full checklist in [META_DEV_CONSOLE.md](./META_DEV_CONSOLE.md).

---

## 7. First run — create your admin account

Visit `https://<your-public-origin>` in a browser.

- Click "Register"
- Enter email + password + name → submit
- You're now logged in as **admin** (first user is always admin in a fresh deploy; in this multi-admin template every public signup also becomes admin)

---

## 8. Connect your Facebook account

On the Settings page:

- Click "Connect Facebook"
- You'll be redirected to Facebook OAuth consent
- Grant the requested scopes (ads_management, ads_read, business_management, pages_*)
- Return to the app; you should see your ad accounts populate the dropdown

If the dropdown is empty or OAuth fails, see [META_DEV_CONSOLE.md](./META_DEV_CONSOLE.md) troubleshooting.

---

## 9. (Optional) Custom domain

Cloudflare dashboard → Pages → your project → Custom domains → Set up a custom domain → follow the flow. CF auto-issues a TLS cert via Let's Encrypt.

After the domain is live:
1. Update `PUBLIC_ORIGIN` secret: `echo -n 'https://adbot.example.com' | bunx wrangler pages secret put PUBLIC_ORIGIN --project-name adbot-ai`
2. Update `FB_REDIRECT_URI` secret: `echo -n 'https://adbot.example.com/api/auth/callback' | bunx wrangler pages secret put FB_REDIRECT_URI --project-name adbot-ai`
3. Update the OAuth redirect URI in Meta Dev Console to match
4. Redeploy: `bunx wrangler pages deploy dist --project-name adbot-ai`

---

## 10. (Optional) External cron

Rule engine needs periodic triggers. Options:

- **Cloudflare Cron Triggers** — via `adbot-cron/` worker (see its own README if using)
- **GitHub Actions** — scheduled workflow POSTing to `/api/rules/evaluate` with `X-Cron-Secret`
- **cron-job.org / UptimeRobot** — free webhook scheduler, POST once per hour

Set `CRON_SECRET` (already done by setup.sh), point your chosen scheduler at:

```
POST https://<your-public-origin>/api/rules/evaluate
Header: X-Cron-Secret: <the value you set>
```

---

## Troubleshooting

### "Failed to create D1 database" during setup
- Your CF account may not have D1 enabled. Dashboard → Workers & Pages → D1 → Create database to accept terms, then re-run `setup.sh`.

### OAuth redirects back with `error=invalid_redirect_uri`
- The `FB_REDIRECT_URI` you passed doesn't match what's registered in Meta Dev Console.
- Check exact match (scheme, host, path, trailing slash).

### Ad-account dropdown stays empty after OAuth
- Your FB user might not have ads_management granted for any BM. Try `https://<your-origin>/api/fb/ad-accounts` in the browser — response should be `{ "ad_accounts": [...], "role": "admin" }`.
- If empty `[]`, your FB user has no ad accounts reachable with the granted scopes. Check Meta → Business Settings → Users to ensure you're assigned to at least one ad account.

### App mode: Development vs Live
- In Development mode, only registered Testers see the OAuth consent screen. Add yourself as a Tester in Meta Dev Console, or switch to Live after submitting required App Review.

### Cloudflare deploy error "FB_REDIRECT_URI not configured"
- The `/api/auth/facebook` endpoint returns 500 with a hint if the secret wasn't set. Set via `setup.sh` (step 3) or manually:
  ```bash
  echo -n 'https://<your-origin>/api/auth/callback' | bunx wrangler pages secret put FB_REDIRECT_URI --project-name adbot-ai
  ```

### Live tail logs
```bash
bunx wrangler pages deployment tail --project-name adbot-ai
```
