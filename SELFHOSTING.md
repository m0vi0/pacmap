# Linux self-hosting

PacMap's Docker deployment is intended for Linux hosts. Host networking is used because live packet capture needs access to the host's network namespace.

```bash
docker compose up -d --build
```

Set the interface explicitly when required:

```bash
PACMAP_IFACE=ens18 docker compose up -d --build
```

The container exposes the application on host port `5176`. The WebSocket is available internally through nginx at `/ws`.

For a reverse proxy, proxy HTTP traffic to `127.0.0.1:5176` and allow WebSocket upgrades.
