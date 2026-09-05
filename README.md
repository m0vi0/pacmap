# PacMap

PacMap is a live network-traffic visualizer that turns packet capture into an interactive 3D map of hosts and connections.

## Run

Open `http://127.0.0.1:5176` after starting, then click **Start host capture** in the browser.

### macOS

```bash
./install-macos.sh
./run-pacmap.sh
```

To choose an interface manually:

```bash
./run-pacmap.sh --iface en0
```

The launcher detects the default route interface and starts the capture service with `sudo`. macOS capture runs without promiscuous mode.

### Linux / self-hosting

```bash
./setup-linux.sh
sudo ./run-linux.sh
```

To choose an interface manually:

```bash
sudo ./run-linux.sh eth0
```

`setup-linux.sh` creates the virtualenv and installs Python + client dependencies. `run-linux.sh` detects the default route interface and starts the capture service with `sudo`.

## Docker (optional)

A Docker Compose path exists for Linux self-hosting — see `SELFHOSTING.md`. It is not recommended on macOS or Windows: Docker Desktop runs containers in a VM, so a container cannot capture the host's network traffic there.

## Platform notes

macOS capture detail (BPF, `promisc=False`) — see `MACOS.md`. Windows capture requires Npcap — see `WINDOWS.md`.

## Troubleshooting

Verify the capture interface:

```bash
# macOS
route -n get default | grep interface

# Linux
ip route get 1.1.1.1 | grep dev
```

and test Scapy on macOS with `promisc=False` using the project's `.venv` Python.