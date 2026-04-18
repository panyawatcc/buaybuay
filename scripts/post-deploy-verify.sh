#!/bin/bash
# Post-Deploy Verification Script for facebook-ad-scaler
# Usage: bash scripts/post-deploy-verify.sh [BASE_URL] [SESSION_COOKIE] [CRON_SECRET]
# Exit 0 = all pass, Exit 1 = failure detected

set -euo pipefail

BASE_URL="${1:-https://facebook-ad-scaler.pages.dev}"
SESSION_COOKIE="${2:-}"
CRON_SECRET="${3:-}"

PASS=0
FAIL=0
RESULTS=()

check() {
  local name="$1"
  local method="$2"
  local url="$3"
  local expected_status="$4"
  local extra_headers="${5:-}"
  local body="${6:-}"

  local curl_args=(-s -o /tmp/verify-response.json -w "%{http_code}" --max-time 10)

  if [ -n "$extra_headers" ]; then
    while IFS= read -r header; do
      [ -n "$header" ] && curl_args+=(-H "$header")
    done <<< "$extra_headers"
  fi

  if [ "$method" = "POST" ]; then
    curl_args+=(-X POST)
    [ -n "$body" ] && curl_args+=(-d "$body")
  fi

  local status
  status=$(curl "${curl_args[@]}" "$url" 2>/dev/null || echo "000")

  if [ "$status" = "$expected_status" ]; then
    PASS=$((PASS + 1))
    RESULTS+=("✅ $name: $status")
  else
    FAIL=$((FAIL + 1))
    RESULTS+=("❌ $name: got $status, expected $expected_status")
  fi
}

echo "🔍 Post-Deploy Verification: $BASE_URL"
echo "================================================"

# --- Layer 1: Health (no auth needed) ---
echo ""
echo "--- Layer 1: Health ---"
check "GET /" "GET" "$BASE_URL/" "200"
check "GET /campaigns (SPA)" "GET" "$BASE_URL/campaigns" "200"
check "GET /settings (SPA)" "GET" "$BASE_URL/settings" "200"
check "GET /team (SPA)" "GET" "$BASE_URL/team" "200"
check "GET /bot-rules (SPA)" "GET" "$BASE_URL/bot-rules" "200"

# --- Layer 2: Auth Gates (expect 401 without cookie) ---
echo ""
echo "--- Layer 2: Auth Gates ---"
check "GET /api/auth/me (no auth)" "GET" "$BASE_URL/api/auth/me" "200"
check "GET /api/rules (no auth)" "GET" "$BASE_URL/api/rules" "401"
check "GET /api/bot/actions (no auth)" "GET" "$BASE_URL/api/bot/actions" "401"
check "GET /api/notifications/settings (no auth)" "GET" "$BASE_URL/api/notifications/settings" "401"
check "GET /api/team/members (no auth)" "GET" "$BASE_URL/api/team/members" "401"
check "GET /api/telegram/status (no auth)" "GET" "$BASE_URL/api/telegram/status" "401"

# --- Layer 3: Cron Secret (if provided) ---
if [ -n "$CRON_SECRET" ]; then
  echo ""
  echo "--- Layer 3: Cron Endpoints ---"
  check "POST /api/rules/evaluate (cron)" "POST" "$BASE_URL/api/rules/evaluate" "200" "X-Cron-Secret: $CRON_SECRET
Content-Type: application/json"
  check "POST /api/telegram/daily-summary (cron)" "POST" "$BASE_URL/api/telegram/daily-summary" "200" "X-Cron-Secret: $CRON_SECRET
Content-Type: application/json"
  check "POST /api/auth/refresh-token (cron)" "POST" "$BASE_URL/api/auth/refresh-token" "200" "X-Cron-Secret: $CRON_SECRET
Content-Type: application/json"

  # Verify wrong secret rejected
  check "POST /api/rules/evaluate (wrong secret)" "POST" "$BASE_URL/api/rules/evaluate" "401" "X-Cron-Secret: wrong-secret
Content-Type: application/json"
fi

# --- Layer 4: Authenticated Endpoints (if session cookie provided) ---
if [ -n "$SESSION_COOKIE" ]; then
  echo ""
  echo "--- Layer 4: Authenticated ---"
  check "GET /api/fb/campaigns (auth)" "GET" "$BASE_URL/api/fb/campaigns" "200" "Cookie: adbot_session=$SESSION_COOKIE"
  check "GET /api/fb/adsets (auth)" "GET" "$BASE_URL/api/fb/adsets" "200" "Cookie: adbot_session=$SESSION_COOKIE"
  check "GET /api/fb/ads (auth)" "GET" "$BASE_URL/api/fb/ads" "200" "Cookie: adbot_session=$SESSION_COOKIE"
  check "GET /api/fb/insights/summary (auth)" "GET" "$BASE_URL/api/fb/insights/summary" "200" "Cookie: adbot_session=$SESSION_COOKIE"
  check "GET /api/fb/audience (auth)" "GET" "$BASE_URL/api/fb/audience" "200" "Cookie: adbot_session=$SESSION_COOKIE"
  check "GET /api/rules (auth)" "GET" "$BASE_URL/api/rules" "200" "Cookie: adbot_session=$SESSION_COOKIE"
fi

# --- Results ---
echo ""
echo "================================================"
echo "Results: $PASS passed, $FAIL failed"
echo "================================================"
for r in "${RESULTS[@]}"; do
  echo "  $r"
done
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "❌ VERIFICATION FAILED — $FAIL endpoint(s) down"
  exit 1
else
  echo "✅ ALL CHECKS PASSED"
  exit 0
fi
