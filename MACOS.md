# PacMap on macOS

## Install

```bash
./install-macos.sh
```

This creates `.venv`, installs Python dependencies, and installs the client dependencies.

## Run

```bash
./run-pacmap.sh
```

Open `http://127.0.0.1:5176`.

The launcher detects the default interface and starts `server.py` with `sudo`. PacMap deliberately uses `promisc=False` on macOS because that is sufficient for host traffic capture and avoids the promiscuous-mode restriction seen on macOS BPF sockets.

To choose an interface manually:

```bash
./run-pacmap.sh --iface en0
```
