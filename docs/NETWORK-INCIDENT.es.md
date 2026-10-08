> English: [NETWORK-INCIDENT.md](./NETWORK-INCIDENT.md)

# Incidente de red: mismo SSID en dos routers (roaming silencioso)

**Fecha:** 2026-10-04 · **Severidad:** alta (server inaccesible) · **Tipo:** WiFi · **Entorno:** homelab Ubuntu (Docker + WiFi), red doméstica con dos routers.

## Resumen

El server dejó de responder desde la PC (ping y SSH), pero los contenedores seguían corriendo. La causa: el server "roameó" al AP del router secundario, que emite el **mismo SSID y la misma clave** que el router principal pero en una red distinta (doble NAT). La IP estática del server no existía en esa red, el ARP al gateway nunca resolvía y quedó aislado. Se resolvió fijando la BSSID del AP correcto en `wpa_supplicant` y, para que sobreviva reinicios, con un servicio systemd que lo reaplica al arrancar.

## Topología (simplificada)

```
                 ┌────────────────────┐        ┌────────────────────┐
   PC ──cable──► │ Router principal   │  ?───► │ Router secundario  │
                 │ 192.168.1.1        │        │ (proveedor / 2º)   │
                 │ SSID "TU-SSID"     │        │ SSID "TU-SSID" ✱   │
                 └─────────┬──────────┘        └─────────┬──────────┘
                           │                             │
                     red 192.168.1.x                 otra red (NAT)
                           │                             │
                           ▼                             ▼
                    IP esperada:                  server "roameado":
                    192.168.1.206                 ARP roto, aislado ✗
```

✱ Dos APs distintos anunciando el mismo SSID con la misma clave.

## Síntomas

- La PC no podía hacer ping al server; puertos 22/80 en time out.
- Docker y todos los contenedores `Up` (el server no se reinició; uptime de 3 días).
- El server sí figuraba como **asociado** a la WiFi (`wpa_state=COMPLETED`).

## Diagnóstico (paso a paso)

| Comando / prueba | Hallazgo | Conclusión |
|---|---|---|
| `ip route` (server) | `default via 192.168.1.1` presente | la configuración de red "parecía" correcta |
| `ping 192.168.1.1` (server) | *Destination Host Unreachable* desde su propia IP | no es falta de ruta: **falla ARP** |
| `ip neigh` | gateway `INCOMPLETE` | el gateway no responde ARP en ese segmento |
| `wpa_cli status` | `COMPLETED`, IP estática OK, señal -66 dBm, power-save off | asociación L2 "sana" |
| `ping6 fe80::1%wlp1s0` | **funciona** (0 % de pérdida) | L2 viva; lo roto es **IPv4/ARP** |
| MAC del gateway: vista desde la PC (cable) vs desde el server (WiFi) | MACs de **fabricantes distintos** | el server hablaba con **otro equipo** |
| PTR de `192.168.1.1` + su web UI | `XiaoQiang` / `router.miwifi.com` | identifica el router del lado cableado |
| `wpa_cli scan_results` (server) | **3 BSSID con el mismo SSID**: 2 del router principal + 1 de otro fabricante | existían **dos redes distintas con el mismo nombre** |
| BSSID actual del server | `dd:ee:ff:…` (el del AP "ajeno") | el server estaba conectado a la red equivocada |

## Causa raíz

Dos routers emiten el **mismo SSID y la misma clave** pero son **redes diferentes** (el secundario hace NAT). Un cliente WiFi puede "roamear" entre ambos sin avisar. Al quedar en el AP equivocado:

- La IP estática del server (192.168.1.206) **no pertenece** a esa red.
- Por eso el ARP por el gateway nunca se resuelve (`INCOMPLETE`): sin IPv4 no hay ping, SSH ni salida a internet.
- El IPv6 link-local hacia el AP local seguía funcionando porque no depende del gateway IPv4, solo del enlace.
- La PC (en la red del router principal) y el server quedaron en **segmentos separados**.

## Solución

### 1. Inmediata — fijar el AP correcto por BSSID

```bash
sudo wpa_cli -i wlp1s0 list_networks          # anotar el id de la red (normalmente 0)
sudo wpa_cli -i wlp1s0 set_network 0 bssid aa:bb:cc:44:55:66
sudo wpa_cli -i wlp1s0 reassociate
sudo wpa_cli -i wlp1s0 status                 # debe mostrar el bssid correcto y la IP
ping -c 3 192.168.1.1
```

Resultado: el server volvió a su red en segundos, conservando la misma IP estática.

### 2. Persistente — sobrevivir reinicios (systemd)

El pin de BSSID vive solo en memoria: se pierde al reiniciar el server o `wpa_supplicant`. Servicio oneshot que lo reaplica al arrancar:

```ini
# /etc/systemd/system/wifi-pin-bssid.service
[Unit]
Description=Fija BSSID del AP correcto en wlp1s0 (anti-roaming)
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

### 3. Verificación

- `ping` server ↔ PC y SSH funcionando.
- Contenedores `healthy`.
- `scripts/verify-deploy.sh` → **10/10**.

## Lecciones aprendidas

1. **Nunca dos APs con el mismo SSID en redes distintas.** Renombrar uno, apagarlo, o unificarlos en modo puente (una sola red plana).
2. Un server debería ir **por cable**; WiFi solo como respaldo.
3. El pin de BSSID es un **parche** útil y rápido, no un arreglo de raíz.
4. Diagnóstico que sirvió:
   - "IPv6 link-local anda pero IPv4/ARP no" ⇒ problema de red/segmento, no de radio WiFi.
   - Comparar la **MAC del gateway** vista por cable vs por WiFi delata estar en equipos distintos.
   - `wpa_cli scan_results` muestra **BSSIDs duplicados con el mismo SSID**.
   - *Destination Host Unreachable* hacia un destino on-link = **ARP**, no ruta.

## Checklist anti-repetición

- [ ] Un solo SSID por red doméstica (o SSIDs distintos por router).
- [ ] Servidor cableado (Ethernet) con IP estática o reserva DHCP.
- [ ] Si hay dos routers: modo puente/AP, o subredes y SSIDs distintos.
- [ ] Documentar IP estática y MAC del server.
- [ ] Ante "el server no responde": revisar `ip neigh`, la MAC del gateway y `wpa_cli scan_results` antes de tocar nada.
