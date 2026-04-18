# AdsPanda AI — Customer Template Repo

> 🚀 **1-click install**: [Click here to deploy via Cloudflare](https://deploy.workers.cloudflare.com/?url=https://github.com/mymint0840-web/adbot-ai-template)
>
> 📚 **Read first**: https://adbot-ai.pages.dev/docs/quick-install
>
> ⚠️ **This is a public template**, auto-synced from Golf's private main repo. Do not open PRs here — they'll be closed. Bugs/feedback → https://adbot-ai.pages.dev/docs or email the maintainer.

---

# adbot-ai-product

Self-hosted Facebook ad automation — rule engine + auto-clone + AI features. Deploy to your own Cloudflare Pages + D1 and run it entirely on your own infrastructure.

Built on Cloudflare Pages Functions (edge runtime), D1 (SQLite), KV (OAuth state + rate limit). No servers to manage.

---

## What it does

- **Rule engine v2** — trigger actions when campaign metrics cross thresholds (spend, ROAS, CPA, CPC, CTR, purchases, messages). Multi-condition AND/OR logic, profit gates, cooldowns, incremental-delta mode, per-rule max-budget-change safety cap.
- **Actions** — `pause`, `enable`, `auto_pause`, `budget_increase`, `budget_decrease`, `clone_ad`, `clone_campaign`, `telegram_notify`, plus Phase-4 `clone_winner` and `auto_pause` gates.
- **Path-G creative-reference clone** — avoids Facebook's deprecated /copies endpoints and works on Outcome-Driven campaigns with modern creatives.
- **Audit trail** — bot_actions + rule_executions + admin_fb_tokens_history (append-only trigger) + rule_executions_debug.
- **Emergency kill-switch** — `POST /api/rules/emergency-pause-all` instantly disables every rule for the caller's account.
- **Telegram alerts** — per-user bot + chat configuration, opt-out per user.
- **AI features (optional)** — post booster, copywriter, CRM intake, trend spotter, retargeting, LTV calculator — require `ANTHROPIC_API_KEY`.

---

## 5-minute quickstart

Prerequisites:
- [Bun](https://bun.sh) or [Node 20+](https://nodejs.org)
- [Cloudflare account](https://dash.cloudflare.com) with Pages + D1 enabled
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) — `npm i -g wrangler` or invoke via `bunx wrangler`
- [Facebook Developer account](https://developers.facebook.com) with an app (see [META_DEV_CONSOLE.md](./META_DEV_CONSOLE.md))

### Deploy

```bash
# 1. Clone and install
git clone <your-fork-of-this-repo>
cd adbot-ai-product
bun install

# 2. Log in to Cloudflare
bunx wrangler login

# 3. Run the guided setup (creates D1 + KV, generates secrets, prints
#    the database_id / kv_id you need to paste into wrangler.toml)
bash ./setup.sh

# 4. Build + deploy
bun run build
bunx wrangler pages deploy dist --project-name adbot-ai
```

Point your domain at the resulting `*.pages.dev` URL (or use a CF custom domain). Open `https://<your-domain>`, register as the first user (you become admin), click "Connect Facebook", grant access.

Detailed walkthrough in [DEPLOY.md](./DEPLOY.md).

---

## Documentation map

| Doc | Purpose |
|-----|---------|
| [README.md](./README.md) | this file — overview + quickstart |
| [DEPLOY.md](./DEPLOY.md) | step-by-step Cloudflare Pages deploy + custom domain |
| [META_DEV_CONSOLE.md](./META_DEV_CONSOLE.md) | Facebook Developer Console setup (App ID, OAuth redirect, App Review) |
| [.env.example](./.env.example) | all env vars with comments + example values |
| [CHANGELOG.md](./CHANGELOG.md) | version history |

---

## Architecture at a glance

```
┌────────────────────────────────────────────────────────────────┐
│ Cloudflare Pages (Vite SPA + Pages Functions)                  │
│                                                                 │
│  React frontend (src/)                                         │
│       │                                                         │
│       ▼                                                         │
│  functions/api/* — edge functions (auth, rules, fb, ai, ...)   │
│       │                                                         │
│       ├──► D1 database (users, rules, bot_actions, history)    │
│       ├──► KV namespace (OAuth state, rate-limit counters)     │
│       └──► Facebook Graph API (via user-specific OAuth token)  │
└────────────────────────────────────────────────────────────────┘
```

Optional workers:
- `adbot-cron/` — scheduled rule evaluation (alternative to external cron)
- `ai-features-consumer/` — queue consumer for async AI jobs

---

## Self-host vs hosted SaaS

This is the **self-host template**. Every customer deploys their own isolated instance with their own D1, their own admin user, their own FB ad-account access. No shared tenant.

The hosted-SaaS product is a separate service (not this repo). Use this template if you want full data ownership and control.

---

## Tech stack

- **Frontend**: React 19, React Router 7, Tailwind 4, Recharts
- **Runtime**: Cloudflare Pages Functions (TypeScript)
- **Database**: Cloudflare D1 (SQLite edge replicas)
- **Cache/State**: Cloudflare KV
- **Auth**: JWT in HttpOnly session cookie, password hash (scrypt)
- **FB Graph**: v25.0, `fbFetch` wrapper with retry + rate-limit + Thai error messages

---

## License

Self-host deployments are licensed individually. Contact the maintainer for terms.

---

## Support

- Issues: file in your copy of this repo
- FB app setup / OAuth troubles: see [META_DEV_CONSOLE.md](./META_DEV_CONSOLE.md) troubleshooting section
- Runtime errors: check Cloudflare Pages → Functions → Logs (tail live with `bunx wrangler pages deployment tail --project-name adbot-ai`)
