> Español: [NETWORK-INCIDENT.es.md](./NETWORK-INCIDENT.es.md)

# Network incident: same SSID on two routers (silent roaming)

**Date:** 2026-10-04 · **Severity:** high (server unreachable) · **Type:** WiFi · **Environment:** Ubuntu homelab (Docker + WiFi), home network with two routers.

## Summary

The server stopped responding from the PC (ping and SSH), while containers kept running. Root cause: the server "roamed" to the secondary router's AP, which broadcasts the **same SSID and password** as the main router but on a different network (double NAT). The server's static IP did not exist on that network, ARP for the gateway never resolved, and it ended up isolated. Fixed by pinning the correct AP's BSSID in `wpa_supplicant` and, to survive reboots, with a systemd service that re-applies it at boot.

## Topology (simplified)

```
                 ┌────────────────────┐        ┌────────────────────┐
   PC ──cable──► │ Main router        │  ?───► │ Secondary router   │
                 │ 192.168.1.1        │        │ (ISP / 2nd)        │
                 │ SSID "YOUR-SSID"   │        │ SSID "YOUR-SSID" ✱ │
                 └─────────┬──────────┘        └─────────┬──────────┘
                           │                             │
                     network 192.168.1.x             other network (NAT)
                           │                             │
                           ▼                             ▼
                    expected IP:                   roamed server:
                    192.168.1.206                  ARP broken, isolated ✗
```

✱ Two different APs advertising the same SSID with the same password.

## Symptoms

- The PC could not ping the server; ports 22/80 timed out.
- Docker and all containers `Up` (no reboot; uptime 3 days).
- The server still showed as **associated** to the WiFi (`wpa_state=COMPLETED`).

## Diagnosis (step by step)

| Command / test | Finding | Conclusion |
|---|---|---|
| `ip route` (server) | `default via 192.168.1.1` present | network config "looked" correct |
| `ping 192.168.1.1` (server) | *Destination Host Unreachable* from its own IP | not a routing gap: **ARP failure** |
| `ip neigh` | gateway `INCOMPLETE` | the gateway never answers ARP on that segment |
| `wpa_cli status` | `COMPLETED`, static IP OK, -66 dBm, power-save off | L2 association "healthy" |
| `ping6 fe80::1%wlp1s0` | **works** (0 % loss) | L2 alive; what's broken is **IPv4/ARP** |
| Gateway MAC: seen from PC (wired) vs from server (WiFi) | MACs from **different vendors** | the server was talking to a **different device** |
| PTR of `192.168.1.1` + its web UI | `XiaoQiang` / `router.miwifi.com` | identifies the wired-side router |
| `wpa_cli scan_results` (server) | **3 BSSIDs with the same SSID**: 2 from the main router + 1 from another vendor | **two different networks sharing the same name** |
| Server's current BSSID | `dd:ee:ff:…` (the "foreign" AP) | the server was on the wrong network |

## Root cause

Two routers broadcast the **same SSID and password** but are **different networks** (the secondary one does NAT). A WiFi client can silently "roam" between them. Once on the wrong AP:

- The server's static IP (192.168.1.206) **does not belong** to that network.
- Therefore ARP for the gateway never resolves (`INCOMPLETE`): with no IPv4 there is no ping, SSH or internet.
- The IPv6 link-local to the local AP kept working because it does not depend on the IPv4 gateway, only on the link.
- The PC (on the main router's network) and the server ended up on **separate segments**.

## Solution

### 1. Immediate — pin the correct AP by BSSID

```bash
sudo wpa_cli -i wlp1s0 list_networks          # note the network id (usually 0)
sudo wpa_cli -i wlp1s0 set_network 0 bssid aa:bb:cc:44:55:66
sudo wpa_cli -i wlp1s0 reassociate
sudo wpa_cli -i wlp1s0 status                 # should show the right bssid and IP
ping -c 3 192.168.1.1
```

Result: the server was back on its network within seconds, keeping the same static IP.

### 2. Persistent — survive reboots (systemd)

The BSSID pin lives in memory only: it is lost when the server or `wpa_supplicant` restarts. One-shot service that re-applies it at boot:

```ini
# /etc/systemd/system/wifi-pin-bssid.service
[Unit]
Description=Pin correct AP BSSID on wlp1s0 (anti-roaming)
After=network.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'for i in $(seq 1 40); do wpa_cli -i wlp1s0 status 2>/dev/null | grep -q "wpa_state=COMPLETED" && break; sleep 2; done; wpa_cli -i wlp1s0 set_network 0 bssid aa:bb:cc:44:55:66; wpa_cli -i wlp1s0 reassociate'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now wifi-pin-bssid.service
```

### 3. Verification

- `ping` server ↔ PC and SSH working.
- Containers `healthy`.
- `scripts/verify-deploy.sh` → **10/10**.

## Lessons learned

1. **Never run two APs with the same SSID on different networks.** Rename one, turn it off, or bridge them (single flat network).
2. A server should be **wired**; WiFi only as a fallback.
3. BSSID pinning is a useful **patch**, not a root fix.
4. Diagnostics that paid off:
   - "IPv6 link-local works but IPv4/ARP does not" ⇒ network/segment problem, not a radio issue.
   - Comparing the **gateway MAC** over cable vs WiFi reveals you are on different devices.
   - `wpa_cli scan_results` shows **duplicate BSSIDs with the same SSID**.
   - *Destination Host Unreachable* for an on-link destination = **ARP**, not routing.

## Anti-recurrence checklist

- [ ] One SSID per home network (or distinct SSIDs per router).
- [ ] Server wired (Ethernet) with a static IP or DHCP reservation.
- [ ] With two routers: bridge/AP mode, or distinct subnets and SSIDs.
- [ ] Document the server's static IP and MAC.
- [ ] When "the server is down": check `ip neigh`, the gateway MAC and `wpa_cli scan_results` before touching anything.
