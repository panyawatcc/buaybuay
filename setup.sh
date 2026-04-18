#!/usr/bin/env bash
#
# adbot-ai-product — guided first-time setup for Hybrid C self-host
#
# What this does:
#   1. Prompts for all the things you only know once — license JWT, Anthropic
#      key, FB app creds, your CF Pages domain, and (optionally) a brain URL
#      override.
#   2. Creates Cloudflare D1 + KV resources (idempotent — reuses existing).
#   3. Generates secure JWT + token-encryption secrets locally (openssl).
#   4. Patches wrangler.toml with the D1 + KV ids.
#   5. Pushes every secret to Cloudflare Pages via `wrangler pages secret put`.
#   6. Optionally: bun install + build + deploy in one go (or print commands).
#
# Re-running is safe — D1 / KV get reused, not duplicated.
#
# Requirements:
#   - bun  (https://bun.sh) — `bunx` is used throughout
#   - openssl (for random secret gen)
#   - wrangler logged in: `bunx wrangler login`
#   - Cloudflare account with Pages enabled
#
# Inputs you need handy before running:
#   - License JWT (from Golf — `eyJhbGci…`)
#   - Anthropic API key (sk-ant-api03-…) — https://console.anthropic.com
#   - Facebook App ID + Secret — https://developers.facebook.com/apps
#   - Your Pages project domain (e.g. abc-ads.pages.dev or custom)

set -euo pipefail

YELLOW='\033[1;33m'
GREEN='\033[1;32m'
RED='\033[1;31m'
CYAN='\033[1;36m'
BOLD='\033[1m'
RESET='\033[0m'

banner() { echo -e "\n${YELLOW}${BOLD}==> $*${RESET}"; }
ok()     { echo -e "${GREEN}✓${RESET} $*"; }
info()   { echo -e "${CYAN}  $*${RESET}"; }
fail()   { echo -e "${RED}✗${RESET} $*" >&2; exit 1; }

# ─── Preflight ─────────────────────────────────────────────────────────

banner "Preflight checks"
command -v bunx >/dev/null 2>&1    || fail "bunx not found — install Bun: https://bun.sh"
command -v openssl >/dev/null 2>&1 || fail "openssl not found — install with: brew install openssl (macOS) / apt install openssl (Linux)"
bunx wrangler whoami >/dev/null 2>&1 || fail "Not logged in to Cloudflare. Run: bunx wrangler login"
[[ -f wrangler.toml ]] || fail "wrangler.toml not found — run this script from the project root"
ok "Cloudflare login OK"
ok "bun, openssl, wrangler all present"

# ─── Input validators ──────────────────────────────────────────────────

validate_jwt() {
  # Three base64url segments separated by dots; starts with eyJ (base64 "{")
  [[ "$1" =~ ^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$ ]]
}
validate_anthropic_key() {
  [[ "$1" =~ ^sk-ant-api03-[A-Za-z0-9_-]{20,}$ ]]
}
validate_fb_app_id() {
  # FB app ids are all digits, typically 15–16 chars
  [[ "$1" =~ ^[0-9]{12,20}$ ]]
}
validate_fb_app_secret() {
  # 32-char hex
  [[ "$1" =~ ^[a-f0-9]{32}$ ]]
}
validate_domain() {
  # bare hostname (no scheme, no path) — e.g. abc-ads.pages.dev, app.example.com
  [[ "$1" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$ ]]
}
validate_https_url() {
  [[ "$1" =~ ^https://[a-z0-9]([a-z0-9.-]*[a-z0-9])?(/.*)?$ ]]
}

# Prompt helpers — one for public input, one for secret input (read -s).
ask() {
  local prompt="$1" validator="$2" value=""
  while :; do
    read -rp "$prompt" value
    if [[ -z "$value" ]]; then
      echo "  (empty — try again)" >&2; continue
    fi
    if [[ -n "$validator" ]] && ! $validator "$value"; then
      echo -e "  ${RED}format looks wrong — try again${RESET}" >&2; continue
    fi
    echo "$value"
    return
  done
}
ask_secret() {
  local prompt="$1" validator="$2" value=""
  while :; do
    read -rsp "$prompt" value; echo
    if [[ -z "$value" ]]; then
      echo "  (empty — try again)" >&2; continue
    fi
    if [[ -n "$validator" ]] && ! $validator "$value"; then
      echo -e "  ${RED}format looks wrong — try again${RESET}" >&2; continue
    fi
    echo "$value"
    return
  done
}
ask_optional() {
  # No validator, empty OK, default value
  local prompt="$1" default="$2" value=""
  read -rp "$prompt" value
  echo "${value:-$default}"
}

# --from-env mode — non-interactive: load values from ./.env and skip prompts
# for any var that's already set. Keeps interactive mode as the default so
# manual customers still get prompted; lets AI-assisted flows pre-populate
# .env and then run `bash ./setup.sh --from-env` to handle the CF infra
# operations (D1 create, KV create, secret push, deploy) without fighting
# with stdin piping through Claude Code bash or similar wrappers.
FROM_ENV=false
for arg in "$@"; do
  case "$arg" in
    --from-env) FROM_ENV=true ;;
    --help|-h)
      cat <<HELP
Usage: bash ./setup.sh [--from-env]

  (default)    Interactive — prompts for each value.
  --from-env   Load values from ./.env first; only prompt for missing ones.
               Used by AI-assisted install flows that pre-populate .env.
HELP
      exit 0 ;;
  esac
done

if $FROM_ENV; then
  if [[ ! -f .env ]]; then
    fail "--from-env given but no ./.env found. Create it first (cp .env.example .env, then fill in values)."
  fi
  banner "Loading .env (--from-env mode)"
  # shellcheck disable=SC1091
  set -a; source .env; set +a
  ok "Loaded ./.env — prompts will be skipped for any pre-set values"
fi

# Pre-set-aware prompt helpers: use env if set, else prompt.
ask_or_env() {
  local varname="$1" prompt="$2" validator="$3"
  local current="${!varname:-}"
  if [[ -n "$current" ]]; then
    if [[ -n "$validator" ]] && ! $validator "$current"; then
      echo "  ${RED}Pre-set $varname failed validation — re-prompting${RESET}" >&2
    else
      echo "$current"; return
    fi
  fi
  ask "$prompt" "$validator"
}
ask_secret_or_env() {
  local varname="$1" prompt="$2" validator="$3"
  local current="${!varname:-}"
  if [[ -n "$current" ]]; then
    if [[ -n "$validator" ]] && ! $validator "$current"; then
      echo "  ${RED}Pre-set $varname failed validation — re-prompting${RESET}" >&2
    else
      echo "$current"; return
    fi
  fi
  ask_secret "$prompt" "$validator"
}

# Secret prompt that allows EMPTY (customer skips the value). Validates
# format if non-empty; accepts "" as "skip for now". Caller should doc
# how to add later (wrangler pages secret put …).
ask_secret_optional() {
  local prompt="$1" validator="$2" value=""
  read -rsp "$prompt" value; echo
  if [[ -z "$value" ]]; then
    echo ""  # explicit empty — caller treats as skip
    return
  fi
  if [[ -n "$validator" ]] && ! $validator "$value"; then
    echo -e "  ${RED}format looks wrong — try again or press Enter to skip${RESET}" >&2
    ask_secret_optional "$prompt" "$validator"
    return
  fi
  echo "$value"
}

ask_secret_optional_or_env() {
  local varname="$1" prompt="$2" validator="$3"
  local current="${!varname:-}"
  if [[ -n "$current" ]]; then
    if [[ -n "$validator" ]] && ! $validator "$current"; then
      echo "  ${RED}Pre-set $varname failed validation — re-prompting (Enter to skip)${RESET}" >&2
    else
      echo "$current"; return
    fi
  fi
  ask_secret_optional "$prompt" "$validator"
}

# ─── 1. Hybrid C — license + brain ─────────────────────────────────────

banner "License + brain configuration"
info "License JWT is the one Golf sent you at purchase (eyJ…). Paste the"
info "full line — the script checks the shape before accepting."
ADBOT_LICENSE_JWT=$(ask_secret_or_env "ADBOT_LICENSE_JWT" "License JWT: " validate_jwt)
ok "License JWT format OK"

info "Your public domain — the one this Pages project serves from."
info "Examples: abc-ads.pages.dev  OR  app.yourcompany.com"
info "Must match the domain Golf used when issuing your license."
ADBOT_DOMAIN=$(ask_or_env "ADBOT_DOMAIN" "Your domain (no https://, no trailing /): " validate_domain)
ok "Domain: $ADBOT_DOMAIN"

# ─── 1a. Derive Pages project slug from domain ─────────────────────────
# Customer puts their full domain into ADBOT_DOMAIN (e.g. panyawatcc.pages.dev
# or app.mybrand.com). The wrangler project slug is derived:
#   - `<slug>.pages.dev`   → slug = strip `.pages.dev`
#   - custom domain        → prompt for slug (or --from-env PROJECT_NAME wins)
# This matches MANUAL_INSTALL.md + CONTENT docs: customer never has to
# pick a PROJECT_NAME separately when they deploy to *.pages.dev.

banner "Pages project configuration"
if $FROM_ENV && [[ -n "${PROJECT_NAME:-}" ]]; then
  ok "Project (from .env): $PROJECT_NAME"
elif [[ "$ADBOT_DOMAIN" == *.pages.dev ]]; then
  PROJECT_NAME="${ADBOT_DOMAIN%.pages.dev}"
  ok "Project (derived from ADBOT_DOMAIN): $PROJECT_NAME"
else
  # Custom domain — we can't derive. Ask.
  info "ADBOT_DOMAIN=$ADBOT_DOMAIN is a custom domain, so we can't derive"
  info "the wrangler project slug. Type the CF Pages project name you"
  info "registered (or will register) for this deployment."
  DEFAULT_PROJECT="adbot-ai"
  PROJECT_NAME=$(ask_optional "Pages project slug (default: ${DEFAULT_PROJECT}): " "$DEFAULT_PROJECT")
  ok "Project: $PROJECT_NAME"
fi

DEFAULT_BRAIN_URL="https://api.adbot.io"
info "Brain URL — leave blank for production ($DEFAULT_BRAIN_URL)."
info "Only override if Golf gave you a staging URL (e.g. *.workers.dev)."
if $FROM_ENV && [[ -n "${ADBOT_BRAIN_URL:-}" ]]; then
  ok "Brain (from .env): $ADBOT_BRAIN_URL"
else
  ADBOT_BRAIN_URL=$(ask_optional "Brain URL (default: $DEFAULT_BRAIN_URL): " "$DEFAULT_BRAIN_URL")
fi
validate_https_url "$ADBOT_BRAIN_URL" || fail "Brain URL must be https://"
ok "Brain: $ADBOT_BRAIN_URL"

# ─── 2. Anthropic BYOK (optional — skip allowed) ─────────────────────

banner "Anthropic API key (BYOK — optional)"
info "Your key from https://console.anthropic.com (sk-ant-api03-…)."
info "Required for AI features (copywriter, rule-suggest, trend-spotter)."
info "The app boots fine without it — non-AI features (dashboard, rules,"
info "FB campaign management) work regardless. You can add it later via:"
info "  bunx wrangler pages secret put ANTHROPIC_API_KEY --project-name $PROJECT_NAME"
info "Press Enter to skip for now."
ANTHROPIC_API_KEY=$(ask_secret_optional_or_env "ANTHROPIC_API_KEY" "Anthropic API key (Enter to skip): " validate_anthropic_key)
if [[ -n "$ANTHROPIC_API_KEY" ]]; then
  ok "Anthropic key set — AI features enabled"
else
  info "Skipped — AI features disabled until key is added later"
fi

# ─── 4. Facebook app ──────────────────────────────────────────────────

banner "Facebook App credentials"
info "From https://developers.facebook.com/apps — see META_DEV_CONSOLE.md"
info "for the full walk-through."
FB_APP_ID=$(ask "FB App ID (digits only): " validate_fb_app_id)
FB_APP_SECRET=$(ask_secret "FB App Secret (32 hex chars): " validate_fb_app_secret)

# Derive redirect URI + origin from domain — saves the customer from typing
# the full URL twice and guarantees the two agree.
FB_REDIRECT_URI="https://${ADBOT_DOMAIN}/api/auth/callback"
PUBLIC_ORIGIN="https://${ADBOT_DOMAIN}"
info "Derived from your domain:"
info "  FB_REDIRECT_URI = $FB_REDIRECT_URI"
info "  PUBLIC_ORIGIN   = $PUBLIC_ORIGIN"
info "⚠️  You MUST register FB_REDIRECT_URI in Meta Dev Console →"
info "    App Settings → Facebook Login → Valid OAuth Redirect URIs."
info "    OAuth login will fail until you do."

# ─── 5. Create D1 ─────────────────────────────────────────────────────

DB_NAME="${PROJECT_NAME}-db"
banner "Creating D1 database: $DB_NAME"
D1_OUT=$(bunx wrangler d1 create "$DB_NAME" 2>&1 || true)
if echo "$D1_OUT" | grep -q "already exists"; then
  info "D1 '$DB_NAME' already exists — fetching existing id"
  D1_INFO=$(bunx wrangler d1 info "$DB_NAME" 2>&1)
  DATABASE_ID=$(echo "$D1_INFO" | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' | head -1)
else
  DATABASE_ID=$(echo "$D1_OUT" | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' | head -1)
fi
[[ -n "$DATABASE_ID" ]] || fail "Could not parse database_id from wrangler output"
ok "database_id: $DATABASE_ID"

# ─── 6. Create KV ─────────────────────────────────────────────────────

KV_NAME="${PROJECT_NAME}-state"
banner "Creating KV namespace: $KV_NAME"
KV_OUT=$(bunx wrangler kv namespace create "$KV_NAME" 2>&1 || true)
if echo "$KV_OUT" | grep -q "already exists"; then
  KV_LIST=$(bunx wrangler kv namespace list 2>/dev/null || true)
  KV_ID=$(echo "$KV_LIST" | grep -B1 "\"$KV_NAME\"" | grep -oE '[a-f0-9]{32}' | head -1)
else
  KV_ID=$(echo "$KV_OUT" | grep -oE '[a-f0-9]{32}' | head -1)
fi
[[ -n "$KV_ID" ]] || fail "Could not parse KV id from wrangler output"
ok "kv id: $KV_ID"

# ─── 7. Generate local secrets ────────────────────────────────────────

banner "Generating local secrets (JWT_SECRET / TOKEN_ENCRYPTION_KEY / CRON_SECRET)"
JWT_SECRET=$(openssl rand -hex 32)
TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 16)
ok "generated 3 secrets (not printed — they'll live in CF Pages only)"

# ─── 8. Patch wrangler.toml ───────────────────────────────────────────

banner "Writing resource IDs to wrangler.toml"

# Back up first — customer can diff if something goes wrong.
cp wrangler.toml wrangler.toml.preSetup.bak

# Two passes: if placeholders exist, replace; otherwise rewrite the
# existing id line in-place. Using `awk` over a regex-scoped `sed` because
# the id lines appear in two different sections (d1_databases + kv_namespaces).
awk -v dbid="$DATABASE_ID" -v kvid="$KV_ID" -v proj="$PROJECT_NAME" '
  BEGIN { in_d1 = 0; in_kv = 0 }
  /^\[\[d1_databases\]\]/ { in_d1 = 1; in_kv = 0; print; next }
  /^\[\[kv_namespaces\]\]/ { in_d1 = 0; in_kv = 1; print; next }
  /^\[/ { in_d1 = 0; in_kv = 0 }
  in_d1 && /^database_id/ { print "database_id = \"" dbid "\""; next }
  in_kv && /^id/          { print "id = \"" kvid "\""; next }
  /^name = "adbot-ai"/    { print "name = \"" proj "\""; next }
  { print }
' wrangler.toml > wrangler.toml.new && mv wrangler.toml.new wrangler.toml
ok "wrangler.toml patched (backup: wrangler.toml.preSetup.bak)"

# ─── 9. Push secrets to Cloudflare Pages ──────────────────────────────

# ─── 9a. Pages project create (idempotent) ──────────────────────────────
# Needed before `wrangler pages deploy` — deploy errors if the project
# doesn't exist yet. Caught by DEVOPS first-deploy of adbot-ai-admin.

banner "Ensuring Pages project: $PROJECT_NAME"
PROJECT_OUT=$(bunx wrangler pages project create "$PROJECT_NAME" --production-branch main 2>&1 || true)
if echo "$PROJECT_OUT" | grep -qiE "already exists|conflict"; then
  ok "Project '$PROJECT_NAME' already exists — reusing"
elif echo "$PROJECT_OUT" | grep -qE "Successfully created"; then
  ok "Created Pages project: $PROJECT_NAME"
else
  # Unknown output — print + continue; `wrangler pages deploy` will fail
  # below if the project truly doesn't exist, so we won't silently succeed.
  info "wrangler pages project create output: $PROJECT_OUT"
fi

# ─── 9b. Push CF Pages secrets ──────────────────────────────────────────

banner "Setting Cloudflare Pages secrets (production)"
# ADBOT_BRAIN_URL is INTENTIONALLY NOT in this list. It's a plain [vars]
# binding in wrangler.toml with a production default. Customers who need
# to override (e.g., staging brain) can set it as a secret via the CF
# dashboard OR via `bunx wrangler pages secret put ADBOT_BRAIN_URL` —
# setup.sh doesn't push it by default to avoid the var-vs-secret collision
# that confused DEVOPS on first deploy.
SECRET_VARS=(
  # Hybrid C — license + domain binding
  ADBOT_LICENSE_JWT
  ADBOT_DOMAIN
  # AI BYOK
  ANTHROPIC_API_KEY
  # Core app
  JWT_SECRET
  TOKEN_ENCRYPTION_KEY
  CRON_SECRET
  # Facebook
  FB_APP_ID
  FB_APP_SECRET
  FB_REDIRECT_URI
  PUBLIC_ORIGIN
)
for VAR in "${SECRET_VARS[@]}"; do
  VAL="${!VAR:-}"
  if [[ -z "$VAL" ]]; then
    info "skipping $VAR (empty)"; continue
  fi
  if echo -n "$VAL" | bunx wrangler pages secret put "$VAR" --project-name "$PROJECT_NAME" >/dev/null 2>&1; then
    ok "$VAR set"
  else
    echo -e "${RED}  failed to set $VAR — retry:${RESET} bunx wrangler pages secret put $VAR --project-name $PROJECT_NAME"
  fi
done

# ─── 10. Migrations ───────────────────────────────────────────────────

banner "D1 migrations"
MIG_COUNT=$(ls migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')
if [[ "$MIG_COUNT" -eq 0 ]]; then
  info "No migrations/ files — skipping"
else
  info "Found $MIG_COUNT migration files."
  read -rp "Apply all migrations to $DB_NAME now? [y/N]: " APPLY_MIG
  if [[ "$APPLY_MIG" =~ ^[yY]$ ]]; then
    for f in migrations/*.sql; do
      if bunx wrangler d1 execute "$DB_NAME" --remote --file "$f" >/dev/null 2>&1; then
        ok "$f applied"
      else
        echo -e "${RED}  $f FAILED — review and re-run manually${RESET}"
      fi
    done
  else
    info "skipped — re-run later with:"
    info "  for f in migrations/*.sql; do bunx wrangler d1 execute $DB_NAME --remote --file \$f; done"
  fi
fi

# ─── 11. Optional: build + deploy ─────────────────────────────────────

banner "Build + deploy"
read -rp "Build & deploy now? [y/N]: " DO_DEPLOY
if [[ "$DO_DEPLOY" =~ ^[yY]$ ]]; then
  info "bun install..."
  bun install || fail "bun install failed — fix errors and re-run"
  info "bun run build..."
  bun run build || fail "bun run build failed"
  info "wrangler pages deploy dist..."
  if bunx wrangler pages deploy dist --project-name "$PROJECT_NAME"; then
    ok "deployed"
  else
    fail "deploy failed — check the wrangler output above"
  fi
else
  info "skipped — run manually when ready:"
  info "  bun install && bun run build"
  info "  bunx wrangler pages deploy dist --project-name $PROJECT_NAME"
fi

# ─── 12. Summary ──────────────────────────────────────────────────────

banner "Setup complete 🎉"
cat <<EOF

Your deployment:
  Pages project:  $PROJECT_NAME
  Domain:         https://$ADBOT_DOMAIN
  Brain:          $ADBOT_BRAIN_URL
  D1 id:          $DATABASE_ID
  KV id:          $KV_ID

Still to do manually:

  1. Register the FB OAuth redirect URI in Meta Dev Console:
     App Settings → Facebook Login → Valid OAuth Redirect URIs
     Add: $FB_REDIRECT_URI
     Until this is done, the "Connect Facebook" button will fail.

  2. Visit https://$ADBOT_DOMAIN/
     → Register the first user (becomes admin automatically).
     → Click "Connect Facebook" and authorize.

  3. Verify the license is live:
       curl https://$ADBOT_DOMAIN/api/license/status
     Should return { ok: true, mode: "active", ... }.

If anything broke, wrangler.toml.preSetup.bak is your restore point.
EOF
