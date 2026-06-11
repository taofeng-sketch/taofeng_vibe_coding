#!/usr/bin/env bash
# Publish squid-climb to taofeng-sketch/taofeng_vibe_coding (public GitHub Pages).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKDIR="${SQUID_PUBLISH_DIR:-$HOME/.cache/squid-climb-publish}"
REPO="https://github.com/taofeng-sketch/taofeng_vibe_coding.git"
SKIP_TESTS="${SKIP_TESTS:-0}"

if [[ "$SKIP_TESTS" != "1" ]]; then
  echo "==> Running unit tests"
  node "$ROOT/tests/hand_layout_test.js"
  node "$ROOT/tests/combat_sim_test.js"
fi

echo "==> Preparing publish clone at $WORKDIR"
mkdir -p "$(dirname "$WORKDIR")"
if [[ -d "$WORKDIR/.git" ]]; then
  git -C "$WORKDIR" fetch origin main --depth 1
  git -C "$WORKDIR" reset --hard origin/main
else
  git clone --depth 1 "$REPO" "$WORKDIR"
fi

echo "==> Syncing squid-climb/"
rsync -a --delete \
  --exclude='CLAUDE.md' --exclude='CODEX_HANDOFF.md' --exclude='V3_REDESIGN_PLAN.md' \
  --exclude='.DS_Store' --exclude='.publish_state' \
  "$ROOT/" "$WORKDIR/squid-climb/"

cd "$WORKDIR"
git add squid-climb/
if git diff --cached --quiet; then
  echo "No changes to publish."
  exit 0
fi

git commit -m "Update squid-climb: $(date +%Y-%m-%d_%H%M)"

# large PNG push — avoid 408 timeouts
git config http.postBuffer 524288000
git config http.lowSpeedLimit 0
git config http.lowSpeedTime 999999

if command -v gh >/dev/null 2>&1; then
  git push "https://x-access-token:$(gh auth token)@github.com/taofeng-sketch/taofeng_vibe_coding.git" main
else
  git push origin main
fi

echo ""
echo "Published: https://github.com/taofeng-sketch/taofeng_vibe_coding"
echo "Play:      https://taofeng-sketch.github.io/taofeng_vibe_coding/squid-climb/"
