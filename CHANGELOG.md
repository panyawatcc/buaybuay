# Changelog

All notable changes to adbot-ai-product are documented here. Format follows [Keep a Changelog](https://keepachangelog.com).

---

## [1.0.0] — 2026-04-18

Initial release as a self-host template. Forked from the hosted-SaaS codebase `facebook-ad-scaler` at commit `119eb29`.

### Added
- `README.md`, `DEPLOY.md`, `META_DEV_CONSOLE.md`, `.env.example`, `setup.sh` — complete onboarding documentation
- `PUBLIC_ORIGIN` env var — drives CORS header on ad-image proxy (defaults to `*` if unset)
- `wrangler.toml` converted to template with `REPLACE_ME_DATABASE_ID` / `REPLACE_ME_KV_ID` placeholders
- Full per-customer isolation via migration 0017 `admin_fb_tokens.admin_user_id UNIQUE` + migration 0023 per-rule watermarking
- Emergency kill-switch endpoint (`POST /api/rules/emergency-pause-all`)

### Changed
- `functions/api/auth/facebook.ts` — `FB_REDIRECT_URI` is now strictly required. Endpoint returns 500 + hint if missing (previously fell back to the upstream SaaS URL)
- `getFbContext` (upstream commit 273d2f8) — admin callers get their OWN admin_fb_tokens row (not `LIMIT 1 ANY admin`); per-tenant isolation on reads
- `register.ts` (upstream commit 119eb29) — every public signup gets role=admin (each user owns their own space)
- `package.json` — renamed to `adbot-ai-product`, version 1.0.0

### Removed
- `functions/api/dev/*` — 7 diagnostic endpoints (admin-token-set, app-check, clone-probe, clone-campaign-probe, fb-debug, set-token, trigger-rule). Not shipped in self-host deployments.
- Hardcoded `facebook-ad-scaler.pages.dev` domain from CORS header (2 sites in `functions/api/fb/ads/[id]/image.ts`)
- Hardcoded OAuth callback fallback URL (`functions/api/auth/facebook.ts`)

### Included upstream feature set
- Rule engine v2 with multi-condition AND/OR, profit gates, Phase 2-5 features
- `clone_ad` via Path G creative-reference (avoids FB /copies deprecation path)
- `clone_campaign` via full manual reconstruction
- Cooldown (minutes + hours, minutes-precision override)
- Max budget change percent safety cap
- Per-rule `trigger_mode` (absolute | incremental) with `last_metric_value` watermark
- Telegram alerts per-user + emergency channel
- bot_actions audit + status column (success/failure/skipped)
- admin_fb_tokens append-only history via AFTER UPDATE trigger (migration 0019)
- AI features scaffold (post booster, copywriter, LTV, trend, retargeting)
- fb-fetch wrapper with retry + rate-limit + Thai error messages

### Migration count
21 migrations (0001 through 0023; 0011 reserved, not present).

---

## Unreleased

### Planned
- OAuth proxy worker (so customers don't need their own FB app secret)
- License-server integration
- Multi-tenant mode (many admins per instance) — currently every admin is expected to deploy their own instance
