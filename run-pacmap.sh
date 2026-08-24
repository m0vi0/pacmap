#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

PYTHON_BIN="$ROOT/.venv/bin/python"
if [ ! -x "$PYTHON_BIN" ]; then
  echo "Virtual environment not found. Run ./install-macos.sh first."
  exit 1
fi

IFACE="$(route -n get default 2>/dev/null | awk '/interface:/{print $2; exit}')"
IFACE="${IFACE:-en0}"
ARGS=(--iface "$IFACE" --app-url http://127.0.0.1:5176)
if [ "$#" -gt 0 ]; then
  ARGS+=("$@")
fi

cleanup() {
  if [ -n "${VITE_PID:-}" ]; then kill "$VITE_PID" 2>/dev/null || true; fi
  if [ -n "${SERVER_PID:-}" ]; then sudo kill "$SERVER_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

cd "$ROOT/client"
npm run dev &
VITE_PID=$!
cd "$ROOT"
sleep 1

echo "PacMap: http://127.0.0.1:5176"
echo "Capture interface: $IFACE"
echo "Starting capture service with sudo..."
sudo "$PYTHON_BIN" server.py "${ARGS[@]}" &
SERVER_PID=$!
wait "$VITE_PID" "$SERVER_PID"
