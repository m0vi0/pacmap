#!/bin/sh
set -eu
IFACE="${PACMAP_IFACE:-}"
python3 /app/server.py --iface "$IFACE" --app-url http://127.0.0.1:5176 &
SERVER_PID=$!
nginx -g 'daemon off;' &
NGINX_PID=$!
trap 'kill "$SERVER_PID" "$NGINX_PID" 2>/dev/null || true' INT TERM EXIT
while kill -0 "$SERVER_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do sleep 1; done
