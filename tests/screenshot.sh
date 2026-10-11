#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${BEAT_GARDEN_PORT:-4302}"
CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser)"
mkdir -p screenshots dist
if [[ ! -f dist/beat-garden.html ]]; then python3 build.py; fi
if ! ss -ltn | grep -q "127.0.0.1:$PORT "; then
  nohup python3 server.py > /tmp/beat-garden-$PORT.log 2>&1 &
  sleep 1
fi
shot() {
  local url="$1" out="$2" size="$3"; shift 3 || true
  local prof; prof="$(mktemp -d /tmp/bgshot.XXXX)"
  "$CHROME" --headless=new --no-sandbox --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --run-all-compositor-stages-before-draw --virtual-time-budget=28000 \
    --window-size="$size" --user-data-dir="$prof" --screenshot="$out" "$@" "$url" >/dev/null 2>&1
  rm -rf "$prof"; echo "  $out ($(wc -c < "$out") bytes)"
}
U="http://127.0.0.1:$PORT"
shot "file://$PWD/dist/beat-garden.html?shot=1#play" screenshots/00-best-home.png 1440,1100
shot "$U/?shot=1#play" screenshots/00-desktop-play.png 1440,1000
shot "$U/?shot=1#seq" screenshots/01-sequencer.png 1440,1100
shot "$U/?shot=1#kits" screenshots/02-kits.png 1440,1100
shot "$U/?shot=1#about" screenshots/03-about.png 1440,1000
shot "$U/?shot=1#play" screenshots/04-phone.png 390,844 --user-agent="Mozilla/5.0 (iPhone)"
echo "screenshots done"
