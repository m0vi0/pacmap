#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

PYTHON_BIN="$ROOT/.venv/bin/python"
if [ ! -x "$PYTHON_BIN" ]; then
  echo "Virtual environment not found. Run ./setup-linux.sh first." >&2
  exit 1
fi

IP="$(ip route get 1.1.1.1 2>/dev/null | sed -n 's/.* dev \([^ ]*\).*/\1/p')"
IFACE="${1:-${IP:-eth0}}"

cleanup() {
  if [ -n "${VITE_PID:-}" ]; then kill "$VITE_PID" 2>/dev/null || true; fi
  if [ -n "${SERVER_PID:-}" ]; then kill "$SERVER_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

(cd "$ROOT/client" && npm run dev) &
VITE_PID=$!
sleep 1
echo "PacMap: http://127.0.0.1:5176"
echo "Capture interface: $IFACE"
sudo "$PYTHON_BIN" server.py --iface "$IFACE" --app-url http://127.0.0.1:5176 &
SERVER_PID=$!
wait "$VITE_PID" "$SERVER_PID"