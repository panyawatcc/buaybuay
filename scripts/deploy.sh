#!/bin/bash
# Deploy Pipeline: build → deploy → verify → rollback if fail
# Usage: bash scripts/deploy.sh [CRON_SECRET] [SESSION_COOKIE]

set -euo pipefail

CRON_SECRET="${1:-}"
SESSION_COOKIE="${2:-}"
PROJECT="facebook-ad-scaler"
BASE_URL="https://facebook-ad-scaler.pages.dev"

echo "🚀 Deploy Pipeline: $PROJECT"
echo "================================================"

# Step 1: Build
echo ""
echo "--- Step 1: Build ---"
npm run build
echo "✅ Build passed"

# Step 2: Deploy
echo ""
echo "--- Step 2: Deploy ---"
DEPLOY_OUTPUT=$(npx wrangler pages deploy dist --project-name="$PROJECT" --commit-dirty=true 2>&1)
echo "$DEPLOY_OUTPUT" | tail -5

# Extract preview URL
PREVIEW_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[a-z0-9]*\.facebook-ad-scaler\.pages\.dev' | head -1)
echo "Preview: ${PREVIEW_URL:-unknown}"

# Check Functions bundle uploaded
if echo "$DEPLOY_OUTPUT" | grep -q "Uploading Functions bundle"; then
  echo "✅ Functions bundle uploaded"
else
  echo "⚠️  No Functions bundle upload detected"
fi

# Step 3: Verify
echo ""
echo "--- Step 3: Post-Deploy Verify ---"
if bash scripts/post-deploy-verify.sh "$BASE_URL" "$SESSION_COOKIE" "$CRON_SECRET"; then
  echo ""
  echo "🎉 DEPLOY COMPLETE — all checks passed"
  echo "Production: $BASE_URL"
  echo "Preview: ${PREVIEW_URL:-unknown}"
  exit 0
else
  echo ""
  echo "❌ VERIFICATION FAILED — triggering rollback guidance"
  bash scripts/auto-rollback.sh "$PROJECT"
  exit 1
fi
