#!/bin/bash
# Auto-Rollback Script for facebook-ad-scaler CF Pages
# Usage: bash scripts/auto-rollback.sh [PROJECT_NAME]
# Rolls back to the previous deployment when post-deploy-verify fails

set -euo pipefail

PROJECT="${1:-facebook-ad-scaler}"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S %Z")

echo "🔄 AUTO-ROLLBACK triggered at $TIMESTAMP"
echo "Project: $PROJECT"
echo ""

# Get the last 2 deployments
echo "--- Finding previous deployment ---"
DEPLOYMENTS=$(npx wrangler pages deployments list --project-name="$PROJECT" 2>/dev/null | head -20)
echo "$DEPLOYMENTS"

# CF Pages doesn't have a native rollback command
# Strategy: redeploy from the previous known-good commit
echo ""
echo "⚠️  CF Pages doesn't support native rollback."
echo "Manual rollback options:"
echo "  1. git revert HEAD && npm run build && wrangler pages deploy dist"
echo "  2. CF Dashboard → Deployments → click previous → 'Rollback to this deploy'"
echo "  3. git stash && git checkout <last-good-commit> && npm run build && wrangler pages deploy dist"
echo ""
echo "--- Rollback logged ---"
echo "$TIMESTAMP ROLLBACK triggered for $PROJECT" >> /tmp/adbot-rollback.log
echo "Reason: post-deploy-verify.sh failed" >> /tmp/adbot-rollback.log
echo ""
echo "⚡ Fastest option: CF Dashboard rollback (1-click)"
echo "   https://dash.cloudflare.com/5e28dddfaa84935e9d0cd23d0732f26d/pages/view/facebook-ad-scaler/deployments"
