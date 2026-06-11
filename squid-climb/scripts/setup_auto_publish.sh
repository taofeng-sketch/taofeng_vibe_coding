#!/usr/bin/env bash
# Install / uninstall macOS launchd job: auto-publish squid-climb every 30 min.
set -euo pipefail

LABEL="com.taofeng.squid-climb.autopublish"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST_SRC="$ROOT/scripts/com.taofeng.squid-climb.autopublish.plist"
PLIST_DST="$HOME/Library/LaunchAgents/$LABEL.plist"
AUTO="$ROOT/scripts/auto_publish.sh"

usage() {
  echo "Usage: $0 {install|uninstall|status|run-now}"
}

write_plist() {
  cat > "$PLIST_SRC" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$AUTO</string>
  </array>
  <key>StartInterval</key>
  <integer>1800</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$ROOT/.publish_state/launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>$ROOT/.publish_state/launchd.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF
}

cmd="${1:-install}"
case "$cmd" in
  install)
    chmod +x "$ROOT/scripts/publish_to_github.sh" "$AUTO"
    write_plist
    mkdir -p "$ROOT/.publish_state"
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
    cp "$PLIST_SRC" "$PLIST_DST"
    launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"
    echo "Installed. Auto-publish every 30 min + on login."
    echo "Log: $ROOT/.publish_state/publish.log"
    ;;
  uninstall)
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
    rm -f "$PLIST_DST"
    echo "Uninstalled auto-publish."
    ;;
  status)
    launchctl print "gui/$(id -u)/$LABEL" 2>/dev/null || echo "Not loaded."
    tail -5 "$ROOT/.publish_state/publish.log" 2>/dev/null || true
    ;;
  run-now)
    bash "$AUTO"
    tail -10 "$ROOT/.publish_state/publish.log" 2>/dev/null || true
    ;;
  *)
    usage
    exit 1
    ;;
esac
