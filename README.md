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

## Node realness

Not every IP that appears in a packet is a real host — tools like `nmap` send probes to hundreds of IPs that don't exist, and they show up as phantom nodes in the graph.

PacMap classifies every node into three categories:

- **Confirmed** — a unicast host that has transmitted a packet (it answered back) or carries a MAC address (L2-reachable). These are real.
- **Unconfirmed (ghost)** — a unicast IP that only ever *received* packets and never sent one. These are dead probe targets from scanners. Ghosts render dimmed at 22% opacity and are 30% smaller. A toggle in the dock ("Unconfirmed: visible/hidden") lets you hide them entirely.
- **Special** — multicast, broadcast, loopback, and link-local addresses. These are traffic groups, not individual hosts. They are never shown as ghosts.

The server also captures ARP replies (`arp or ip` filter). When a local host responds to ARP, a `host_alive` event is sent to the client and the node is confirmed with its MAC address. This is the definitive signal for LAN hosts — even if a device silently drops IP probes, an ARP reply proves it exists.

First-seen rx-only IPs no longer trigger "New Host" alerts or auto-checkpoints. They appear as low-severity `probe-target` feed events instead.

## Troubleshooting

Verify the capture interface:

```bash
# macOS
route -n get default | grep interface

# Linux
ip route get 1.1.1.1 | grep dev
```

and test Scapy on macOS with `promisc=False` using the project's `.venv` Python.
