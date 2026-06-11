#!/usr/bin/env bash
# Auto-publish squid-climb when local files change.
# Installed by setup_auto_publish.sh (launchd, every 30 min).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE="$ROOT/.publish_state"
HASH_FILE="$STATE/last_tree_hash"
LOG="$STATE/publish.log"
LOCK="$STATE/.publishing.lock"

mkdir -p "$STATE"

# fingerprint the publishable tree (exclude agent docs + state)
current_hash="$(find "$ROOT" \
  -type f \
  ! -path '*/.publish_state/*' \
  ! -name 'CLAUDE.md' \
  ! -name 'CODEX_HANDOFF.md' \
  ! -name 'V3_REDESIGN_PLAN.md' \
  ! -name '.DS_Store' \
  -print0 | sort -z | xargs -0 shasum -a 256 2>/dev/null | shasum -a 256 | awk '{print $1}')"

if [[ -f "$HASH_FILE" ]] && [[ "$(cat "$HASH_FILE")" == "$current_hash" ]]; then
  exit 0
fi

# avoid overlapping runs
if [[ -f "$LOCK" ]]; then
  pid="$(cat "$LOCK" 2>/dev/null || true)"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    exit 0
  fi
fi
echo $$ > "$LOCK"
trap 'rm -f "$LOCK"' EXIT

{
  echo "=== $(date -Iseconds) auto-publish start ==="
  if bash "$ROOT/scripts/publish_to_github.sh"; then
    echo "$current_hash" > "$HASH_FILE"
    echo "=== $(date -Iseconds) published OK ==="
  else
    echo "=== $(date -Iseconds) publish FAILED ==="
    exit 1
  fi
} >> "$LOG" 2>&1
