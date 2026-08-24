# PacMap

PacMap is a live network-traffic visualizer that turns packet capture into an interactive 3D map of hosts and connections.

## macOS

Use the native macOS launcher. Docker Desktop is not used for host packet capture.

```bash
./install-macos.sh
./run-pacmap.sh
```

Open `http://127.0.0.1:5176`.

The launcher detects the default route interface (for example `en0`) and starts the capture service with `sudo`. macOS capture is configured without promiscuous mode.

## Linux / self-hosting

Use Docker Compose on a Linux host where the container can share the host network namespace.

```bash
docker compose up -d --build
```

Set the host interface when needed:

```bash
PACMAP_IFACE=eth0 docker compose up -d --build
```

PacMap serves the UI on port `5176` and proxies the WebSocket through `/ws`.

## Windows

See `WINDOWS.md`. Native Windows packet capture requires Npcap.

## Troubleshooting

Verify the capture interface with:

```bash
route -n get default | grep interface
```

and test Scapy on macOS with `promisc=False` using the project's `.venv` Python.

See `MACOS.md` and `SELFHOSTING.md` for platform-specific details.
