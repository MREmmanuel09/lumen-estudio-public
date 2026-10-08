> English: [HOMELAB.md](./HOMELAB.md)

# LUMEN Estudio — Guía de homelab (seguridad ante todo)

Guía única para correr la plataforma completa en tu propio servidor: setup
base, red, CI/CD, email, backups y checklist de seguridad. Consolida los
anteriores `DEPLOY.md` + `HOMELAB-CICD.md`.

> Convención: `homelab` = tu servidor. `APP_DIR=~/lumen` (cambialo en todos
> lados si usás otra ruta; CI lo lee del secret `HOMELAB_APP_DIR`).

---

## 1. Arquitectura (qué habla con qué)

```
Internet ──(Tailscale Funnel opcional :443)──► Caddy :80 ──► app :3000 (Next.js)
                                                     │
PC / LAN ──SSH (22, solo LAN)──► homelab             ├──► db :5432 (Postgres, interno)
                                                     ├──► uploads (volumen con nombre)
CI (GitHub Actions) ──SSH vía Tailscale──► deploy.sh └──► salida SMTP (Gmail 587 / Postfix)
```

- **Sin puertos publicados** além del 80 (Caddy) y el 22 (SSH desde LAN).
  Postgres, Next (:3000) y Mailpit (:8025, solo loopback) nunca se exponen.
- El estado vive en dos volúmenes con nombre: `lumen_lumen_pg_data` (BD) y
  `lumen_lumen_uploads` (fotos). Todo lo demás es prescindible.

## 2. Checklist de seguridad (P0 — antes de abrirle a usuarios)

Si algo falla, NO pongas en producción hasta resolverlo.

### 2.1 Secretos y entorno

- [ ] `SESSION_PASSWORD` ≥32 chars, generado con `openssl rand -base64 48`
      (nunca el dummy del CI).
- [ ] `DB_PASSWORD` aleatorio en **hex** (`openssl rand -hex 16`).
      **Hex, no base64**: la password va embebida en `DATABASE_URL` y el
      base64 puede traer `/` o `@` que rompen el connection string de Prisma.
- [ ] Permisos de `.env`: `chmod 600`. Los backups de `.env` viven **fuera**
      del repo (ej. `~/backups/…`), nunca dentro de `APP_DIR`.
- [ ] Un solo admin existe; usuarios de prueba/seed eliminados.
- [ ] `.env`, `*.pem`, `*.db` están gitignoreados — `git status` no los muestra.

### 2.2 Red

- [ ] `ufw` activo, default deny incoming; SSH (22) solo desde tu LAN.
- [ ] ACL de Tailscale: el tag de CI llega a `homelab` por `tcp:22` **nada más**.
- [ ] Funnel (si está activo) expone **solo** Caddy (:80). Los puertos
      3000/5432/8025 no se reenvían nunca en el router.
- [ ] UIs de administración (ej. Portainer :9000) solo desde LAN/Tailnet.

### 2.3 App (un comando)

```bash
bash scripts/verify-deploy.sh https://<machine>.<tu-tailnet>.ts.net
```

10 checks: home 200, shape de sesión, headers de seguridad (HSTS, nosniff,
CSP, frame options), CSRF cross-origin 403, `/admin` → redirect a login,
login malo → 401, base HTTPS.

### 2.4 Sesión y archivos

- [ ] 6 logins malos seguidos → 429 con `Retry-After` (rate limit).
- [ ] Cookie de sesión alterada → el siguiente request a `/admin` redirige
      a `/login`.
- [ ] Cookie con flag `Secure` en producción.
- [ ] Subir un `.exe` renombrado a `.jpg` → 415/400 (magic bytes).
- [ ] Upload de 25 MB → 413/400.

### 2.5 Backups

- [ ] Cron diario de `pg_dump` activo.
- [ ] Backup del volumen de uploads programado.
- [ ] Restauraste un backup al menos una vez, en otro lado.
- [ ] Backups encriptados en reposo si salen de la máquina.

### 2.6 Logs

- [ ] Sin passwords/tokens en `docker compose logs app` (grep manual).
- [ ] Rotación de logs configurada (logrotate / `max-size` de Docker).
- [ ] Heartbeat externo (UptimeRobot / Healthchecks.io) avisa si cae.

---

## 3. Setup base (una vez, Ubuntu)

```bash
sudo apt update && sudo apt upgrade -y
# Docker oficial
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update && sudo apt install -y docker-ce docker-ce-cli \
  containerd.io docker-buildx-plugin docker-compose-plugin git curl
sudo usermod -aG docker $USER   # reloguear después
```

Firewall — denegar todo lo entrante, SSH solo desde LAN:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.1.0/24 to any port 22  # ← tu LAN
sudo ufw enable && sudo ufw status
```

## 4. Tailscale (una vez)

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh=false
tailscale status   # anotá el nombre de tu máquina en el tailnet
```

Exposición pública opcional (TLS lo termina Tailscale, solo Caddy):

```bash
sudo tailscale funnel --bg http://localhost:80
# URL pública: https://<machine>.<tu-tailnet>.ts.net
```

ACL recomendada: el nodo de CI solo alcanza el homelab por SSH (`tcp:22`),
con tags `tag:ci` → `tag:homelab`. Las auth keys del CI son de vida corta
(30–90 días).

## 5. Primer despliegue de la app

```bash
mkdir -p ~/lumen ~/backups/lumen && cd ~/lumen
git clone <tu-repo-privado> .
cp .env.example .env && chmod 600 .env && nano .env
# Completar: NEXT_PUBLIC_APP_URL, DB_PASSWORD (hex), SESSION_PASSWORD,
#            SMTP_* (ver §7), EMAIL_FROM / EMAIL_ADMIN
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npx prisma db push --skip-generate
docker compose -f docker-compose.prod.yml exec app npm run db:seed
bash scripts/verify-deploy.sh https://<machine>.<tu-tailnet>.ts.net
```

### Usuario deploy con llave restringida (para CI)

```bash
sudo adduser --disabled-password --gecos '' deploy
sudo usermod -aG docker deploy
sudo -u deploy mkdir -p ~deploy/.ssh && chmod 700 ~deploy/.ssh
sudo -u deploy tee ~deploy/.ssh/authorized_keys   # pegar la CLAVE PÚBLICA
sudo chmod 600 ~deploy/.ssh/authorized_keys
```

Endurecer la línea para que esa llave **solo** pueda correr deploys:

```
command="bash ~/lumen/scripts/deploy.sh ${SSH_ORIGINAL_COMMAND##* }",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA…
```

Generar el par en tu PC (`ssh-keygen -t ed25519 -f $HOME\.ssh\lumen-deploy`);
la **privada** va al secret `HOMELAB_SSH_KEY`.

## 6. CI/CD (GitHub, una vez)

1. Repo en GitHub; pushear `main`.
2. `Settings → Branches → Add rule` para `main`: exigir PR + checks de CI.
3. `Settings → Environments → New environment: production` → **Required
   reviewers** (vos) = el botón de deploy con 1 clic.
4. `Settings → Secrets → Actions` (environment `production`):

| Secret | Valor |
|---|---|
| `TS_AUTHKEY` | Auth key Tailscale efímera con tag `tag:ci` |
| `HOMELAB_SSH_HOST` | IP tailnet (100.x) o hostname |
| `HOMELAB_SSH_USER` | `deploy` |
| `HOMELAB_SSH_KEY` | Clave privada `lumen-deploy` completa |
| `HOMELAB_APP_DIR` | `/home/deploy/lumen` (o tu ruta) |

Flujo diario: branch → PR → merge → CI → aprobás `production` → `deploy.sh`
hace backup + build + migrate + healthcheck (rollback si falla).

Rollback manual: `cd APP_DIR && git checkout <sha> && docker compose -f
docker-compose.prod.yml up -d --build app`.

## 7. Email

La app elige sola: **SMTP si hay `SMTP_HOST`**, si no Resend si hay
`RESEND_API_KEY`, si no solo consola.

### Actual (sin dominio propio): Gmail SMTP

Creá una **App Password** de Google (requiere verificación en 2 pasos) y
ponela en `~/lumen/.env` (nunca la commitees ni la pegues en el chat):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<tu-direccion-de-google>      # tu dirección de correo completa
SMTP_PASSWORD=<app-password-16-digitos-sin-espacios>
EMAIL_FROM="LUMEN Estudio <<tu-direccion-de-google>>"
EMAIL_ADMIN=<tu-direccion-de-google>
RESEND_API_KEY=          # vacío: manda SMTP
```

Aplicar con `docker compose -f docker-compose.prod.yml up -d --force-recreate app`.

Los 6 emails transaccionales: confirmación de contacto, notificación de
contacto (admin), reset de contraseña, notificación de login, bienvenida +
verificación de email (registro).

### Desarrollo

`SMTP_HOST=mailpit` + `SMTP_PORT=1025` → mirá todo en
`http://localhost:8025` (Mailpit solo escucha en loopback).

### Después (con dominio propio)

Opciones, de más self-hosted a menos: API Resend/Brevo → relay smart-host →
**Postfix propio** con SPF/DKIM/DMARC + PTR (la receta completa quedó en el
historial de git de este repo). El dominio de `EMAIL_FROM` debe coincidir con
`MAIL_DOMAIN`, si no falla SPF.

## 8. Backups y restauración

```bash
B=~/backups/lumen/$(date +%F); mkdir -p "$B"

# Base de datos
docker exec lumen-db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "$B/db.sql.gz"

# Uploads (volumen con nombre — NO public/uploads del repo)
docker cp lumen-app:/app/public/uploads - | gzip > "$B/uploads.tar.gz"

# Restaurar BD (⚠ pisa todo)
gunzip < "$B/db.sql.gz" | docker exec -i lumen-db \
  sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

Automatizá con cron + rsync a otro disco/host. Incluí `lumen_postfix_queue`
si activás Postfix.

## 9. Actualizar la app

```bash
cd ~/lumen
git pull                       # o: git fetch && git reset --hard origin/main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
# Si cambió el schema de Prisma:
docker compose -f docker-compose.prod.yml exec app npx prisma db push --skip-generate
bash scripts/verify-deploy.sh https://<machine>.<tu-tailnet>.ts.net
```

## 10. Rotación de secretos

```bash
cd ~/lumen && cp .env .env.bak-$(date +%F) && nano .env
# SESSION_PASSWORD: openssl rand -base64 48   (invalida todas las sesiones)
# DB_PASSWORD:      openssl rand -hex 16       (¡URL-safe!)
docker exec -i lumen-db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  -c "ALTER USER lumen WITH PASSWORD '<nuevo>'"   # ANTES del up -d
docker compose -f docker-compose.prod.yml up -d
```

Rotá cada 6-12 meses o ante sospecha de compromiso. El backup del `.env`
queda fuera del repo (`~/backups/...`, modo 600).

## 11. Operaciones y troubleshooting

| Síntoma | Causa probable |
|---|---|
| `db:5432 connection refused` | BD aún subiendo — esperá el healthcheck (~30s) |
| Prisma "invalid port number in database URL" | La password tiene `/` o `@` — regenerala en **hex** |
| No salen emails | `docker logs lumen-app \| grep email` — revisá SMTP_* dentro del contenedor |
| CI rojo en `build` | Error real de tipos (el dummy de SESSION_PASSWORD ya está) |
| Deploy: SSH timeout | Tailscale caído (`sudo systemctl status tailscaled`) |
| Funnel caído tras reboot | `tailscale funnel status`; re-ejecutar y fijar con `@reboot` |
| Uploads perdidos al recrear | Escribiste en `public/uploads` en vez del volumen |
| Server inaccesible aunque los contenedores están Up | Roaming WiFi a otro AP con el mismo SSID — ver [NETWORK-INCIDENT](./NETWORK-INCIDENT.es.md) |

Cadencia: `npm audit --omit=dev` una vez al mes, rebuild con `--pull` para
parches de la imagen base; rotar las auth keys de Tailscale cada 30-90 días.

---

## 12. Checklist de deploy

- [ ] Docker + Compose instalados; `ufw` activo (SSH = solo LAN)
- [ ] Repo clonado; `.env` con `SESSION_PASSWORD` rotado + `DB_PASSWORD` hex
- [ ] Stack levantado; `prisma db push`; seed ejecutado; **un solo admin**
- [ ] SMTP configurado (App Password de Gmail) y los 6 emails verificados
- [ ] HTTPS vía Tailscale (o Caddy con tu dominio)
- [ ] `verify-deploy.sh` = 10/10
- [ ] Backups automáticos de BD + uploads; restauración probada una vez
- [ ] Secrets de CI/CD puestos; entorno de aprobación con 1 clic
- [ ] Los backups de `.env` viven fuera del repo
