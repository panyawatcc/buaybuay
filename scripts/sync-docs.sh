#!/usr/bin/env bash
# sync-docs.sh — pull latest CONTENT pack into src/pages/docs/.
#
# CONTENT owns canonical files under ~/shared/content-self-host-onboarding-pack/.
# This script mirrors them into the Vite bundle location. Run whenever CONTENT
# pushes a material update (version bumps, new sections, cross-doc edits).
#
# Usage: bash scripts/sync-docs.sh
#        Flags: --dry-run  (show diffs only)
#               --check    (exit 1 if out of sync — for CI / pre-commit)

set -euo pipefail

SRC_DIR="${HOME}/shared/content-self-host-onboarding-pack"
DEST_DIR="$(cd "$(dirname "$0")/.." && pwd)/src/pages/docs"

# file-in-src  →  file-in-dest
declare -a PAIRS=(
  "CUSTOMER_GUIDE_v2.md     customer-guide.md"
  "TOS-v1.md                tos.md"
  "DPA-v1.md                dpa.md"
  "AI_ASSISTED_INSTALL.md   ai-install.md"
  "MANUAL_INSTALL.md        manual-install.md"
)

mode="copy"
for arg in "$@"; do
  case "$arg" in
    --dry-run) mode="dry" ;;
    --check) mode="check" ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

status=0
for pair in "${PAIRS[@]}"; do
  src_file="${pair%% *}"
  dest_file="${pair##* }"
  src_path="${SRC_DIR}/${src_file}"
  dest_path="${DEST_DIR}/${dest_file}"

  if [[ ! -f "$src_path" ]]; then
    echo "✗ missing source: $src_path" >&2
    status=2
    continue
  fi

  if [[ ! -f "$dest_path" ]] || ! cmp -s "$src_path" "$dest_path"; then
    case "$mode" in
      copy)
        cp "$src_path" "$dest_path"
        echo "✓ synced $dest_file (was stale or missing)"
        ;;
      dry)
        echo "would sync $dest_file — diff:"
        diff -u "$dest_path" "$src_path" 2>/dev/null | head -20 || true
        ;;
      check)
        echo "✗ out of sync: $dest_file"
        status=1
        ;;
    esac
  else
    echo "= up to date: $dest_file"
  fi
done

if [[ "$mode" == "check" && $status -ne 0 ]]; then
  echo "" >&2
  echo "Run: bash scripts/sync-docs.sh  (no flags) to update." >&2
fi

exit $status
