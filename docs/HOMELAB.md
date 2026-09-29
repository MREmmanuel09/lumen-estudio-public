> Español: [HOMELAB.es.md](./HOMELAB.es.md)

# LUMEN Estudio — Homelab guide (security first)

Single consolidated guide to run the full platform on your own server: base
setup, networking, CI/CD, email, backups and the security checklist.
Consolidates the former `DEPLOY.md` + `HOMELAB-CICD.md`.

> Convention: `homelab` = your server. `APP_DIR=~/lumen` (change everywhere if
> you use another path; CI reads it from the `HOMELAB_APP_DIR` secret).

---

## 1. Architecture (what talks to what)

```
Internet ──(optional Tailscale Funnel :443)──► Caddy :80 ──► app :3000 (Next.js)
                                                    │
PC / LAN ──SSH (22, LAN only)──► homelab            ├──► db :5432 (Postgres, internal)
                                                    ├──► uploads (named volume)
CI (GitHub Actions) ──SSH via Tailscale──► deploy.sh └──► SMTP out (Gmail 587 / Postfix)
```

- **No published ports** beyond 80 (Caddy) and 22 (SSH from LAN). Postgres,
  Next (:3000) and Mailpit (:8025, loopback only) are never exposed.
- State lives in two named volumes: `lumen_lumen_pg_data` (DB) and
  `lumen_lumen_uploads` (photos). Everything else is disposable.

## 2. Security checklist (P0 — run before opening to users)

If any item fails, do NOT go live until it is fixed.

### 2.1 Secrets and environment

- [ ] `SESSION_PASSWORD` ≥32 chars, generated with `openssl rand -base64 48`
      (never the CI dummy value).
- [ ] `DB_PASSWORD` is a random **hex** string (`openssl rand -hex 16`).
      **Use hex, not base64**: the password is embedded in `DATABASE_URL`, and
      base64 can contain `/` or `@`, which break Prisma's connection string.
- [ ] `.env` permissions: `chmod 600`, owner = app user. Backups of `.env`
      live **outside** the repo (e.g. `~/backups/…`), never inside `APP_DIR`.
- [ ] Only one admin account exists; seed/test users are deleted.
- [ ] `.env`, `*.pem`, `*.db` are gitignored — `git status` shows none of them.

### 2.2 Network

- [ ] `ufw` active, default deny incoming; SSH (22) only from your LAN.
- [ ] Tailscale ACL: CI tag reaches `homelab` on `tcp:22` **only**.
- [ ] Funnel (if enabled) exposes **only** Caddy (:80). Ports 3000/5432/8025
      are never forwarded in the router.
- [ ] Admin UIs (e.g. Portainer :9000) reachable only from LAN/Tailnet.

### 2.3 App (one command)

```bash
bash scripts/verify-deploy.sh https://<machine>.<tu-tailnet>.ts.net
```

10 checks: home 200, session shape, security headers (HSTS, nosniff, CSP,
frame options), CSRF cross-origin 403, `/admin` → login redirect, bad login
→ 401, HTTPS base.

### 2.4 Session and files

- [ ] 6 wrong logins in a row → 429 with `Retry-After` (rate limit).
- [ ] Tampered session cookie → next `/admin` request redirects to `/login`.
- [ ] Cookie has the `Secure` flag in production.
- [ ] Uploading a `.exe` renamed to `.jpg` → 415/400 (magic-bytes check).
- [ ] 25 MB upload → 413/400.

### 2.5 Backups

- [ ] Daily `pg_dump` cron active.
- [ ] Uploads volume backup scheduled.
- [ ] You restored a backup at least once, somewhere else.
- [ ] Backups encrypted at rest if they leave the machine.

### 2.6 Logs

- [ ] No passwords/tokens in `docker compose logs app` (grep them).
- [ ] Log rotation configured (logrotate / Docker `max-size`).
- [ ] External heartbeat (UptimeRobot / Healthchecks.io) alerts when down.

---

## 3. Base setup (once, Ubuntu)

```bash
sudo apt update && sudo apt upgrade -y
# Docker official repo
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update && sudo apt install -y docker-ce docker-ce-cli \
  containerd.io docker-buildx-plugin docker-compose-plugin git curl
sudo usermod -aG docker $USER   # re-login afterwards
```

Firewall — deny everything incoming, SSH only from LAN:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.1.0/24 to any port 22  # ← your LAN
sudo ufw enable && sudo ufw status
```

## 4. Tailscale (once)

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh=false
tailscale status   # note your tailnet machine name
```

Optional public exposure (TLS terminated by Tailscale, only Caddy):

```bash
sudo tailscale funnel --bg http://localhost:80
# Public URL: https://<machine>.<tu-tailnet>.ts.net
```

Recommended ACL: the CI node only reaches the homelab over SSH (`tcp:22`),
tagged `tag:ci` → `tag:homelab`. CI auth keys are short-lived (30–90 days).

## 5. First deployment of the app

```bash
mkdir -p ~/lumen ~/backups/lumen && cd ~/lumen
git clone <tu-repo-privado> .
cp .env.example .env && chmod 600 .env && nano .env
# Fill: NEXT_PUBLIC_APP_URL, DB_PASSWORD (hex), SESSION_PASSWORD,
#       SMTP_* (see §7), EMAIL_FROM / EMAIL_ADMIN
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npx prisma db push --skip-generate
docker compose -f docker-compose.prod.yml exec app npm run db:seed
bash scripts/verify-deploy.sh https://<machine>.<tu-tailnet>.ts.net
```

### Deploy user with a restricted key (CI only)

```bash
sudo adduser --disabled-password --gecos '' deploy
sudo usermod -aG docker deploy
sudo -u deploy mkdir -p ~deploy/.ssh && chmod 700 ~deploy/.ssh
sudo -u deploy tee ~deploy/.ssh/authorized_keys   # paste the PUBLIC key
sudo chmod 600 ~deploy/.ssh/authorized_keys
```

Harden the line so that key can *only* run deploys:

```
command="bash ~/lumen/scripts/deploy.sh ${SSH_ORIGINAL_COMMAND##* }",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA…
```

Generate the pair on your PC (`ssh-keygen -t ed25519 -f $HOME\.ssh\lumen-deploy`);
the **private** key goes to the `HOMELAB_SSH_KEY` secret.

## 6. CI/CD (GitHub, once)

1. Private repo on GitHub; push `main`.
2. `Settings → Branches → Add rule` for `main`: require PR + CI checks.
3. `Settings → Environments → New environment: production` → **Required
   reviewers** (you) = the 1-click deploy button.
4. `Settings → Secrets → Actions` (environment `production`):

| Secret | Value |
|---|---|
| `TS_AUTHKEY` | Short-lived Tailscale auth key tagged `tag:ci` |
| `HOMELAB_SSH_HOST` | Tailnet IP (100.x) or hostname |
| `HOMELAB_SSH_USER` | `deploy` |
| `HOMELAB_SSH_KEY` | Full private `lumen-deploy` key |
| `HOMELAB_APP_DIR` | `/home/deploy/lumen` (or your path) |
| `PRIVATE_VALUES_JSON` | Sanitization map for the public-repo sync (see `docs/PUBLIC-REPO.md`) |

Daily flow: branch → PR → merge → CI → approve `production` → `deploy.sh`
does backup + build + migrate + healthcheck (rolls back on failure).

Manual rollback: `cd APP_DIR && git checkout <sha> && docker compose -f
docker-compose.prod.yml up -d --build app`.

## 7. Email

The app picks the transport automatically: **SMTP if `SMTP_HOST` is set**,
else Resend if `RESEND_API_KEY` is set, else console-only.

### Current (no own domain): Gmail SMTP

Create a Google **App Password** (requires 2-step verification) and set in
`~/lumen/.env` (never commit or paste it into chat):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<tu-direccion-de-google>      # tu dirección de correo completa
SMTP_PASSWORD=<app-password-16-digitos-sin-espacios>
EMAIL_FROM="LUMEN Estudio <<tu-direccion-de-google>>"
EMAIL_ADMIN=<tu-direccion-de-google>
RESEND_API_KEY=          # vacío: SMTP manda
```

Apply with `docker compose -f docker-compose.prod.yml up -d --force-recreate app`.

The 6 transactional emails: contact confirmation, contact notification (admin),
password reset, login notification, welcome + email verification (register).

### Dev

`SMTP_HOST=mailpit` + `SMTP_PORT=1025` → inspect everything at
`http://localhost:8025` (Mailpit binds to loopback only).

### Later (with own domain)

Options, in order of self-hosting: Resend/Brevo API → smart-host relay →
**own Postfix** with SPF/DKIM/DMARC + PTR (see the historical notes in this
repo's git history for the full Postfix recipe). `EMAIL_FROM` domain must
match `MAIL_DOMAIN` or SPF fails.

## 8. Backups and restore

```bash
B=~/backups/lumen/$(date +%F); mkdir -p "$B"

# Database
docker exec lumen-db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "$B/db.sql.gz"

# Uploads (named volume — NOT public/uploads in the repo)
docker cp lumen-app:/app/public/uploads - | gzip > "$B/uploads.tar.gz"

# Restore DB (⚠ overwrites)
gunzip < "$B/db.sql.gz" | docker exec -i lumen-db \
  sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

Automate with cron + rsync to another disk/host. Include `lumen_postfix_queue`
if you enable Postfix.

## 9. Updating the app

```bash
cd ~/lumen
git pull                       # or: git fetch && git reset --hard origin/main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
# If the Prisma schema changed:
docker compose -f docker-compose.prod.yml exec app npx prisma db push --skip-generate
bash scripts/verify-deploy.sh https://<machine>.<tu-tailnet>.ts.net
```

## 10. Rotating secrets

```bash
cd ~/lumen && cp .env .env.bak-$(date +%F) && nano .env
# SESSION_PASSWORD: openssl rand -base64 48   (invalidates all sessions)
# DB_PASSWORD:      openssl rand -hex 16       (URL-safe!)
docker exec -i lumen-db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  -c "ALTER USER lumen WITH PASSWORD '<nuevo>'"   # antes del up -d
docker compose -f docker-compose.prod.yml up -d
```

Rotate every 6–12 months or on suspected compromise. Keep the `.env` backup
outside the repo (`~/backups/...`, mode 600).

## 11. Operations and troubleshooting

| Symptom | Likely cause |
|---|---|
| `db:5432 connection refused` | DB still starting — wait for healthcheck (~30s) |
| Prisma "invalid port number in database URL" | Password has `/` or `@` — regenerate as **hex** |
| Emails not sent | `docker logs lumen-app \| grep email` — check SMTP vars exist in the container |
| CI red at `build` | Real type error (SESSION_PASSWORD dummy already provided) |
| Deploy: SSH timeout | Tailscale down (`sudo systemctl status tailscaled`) |
| Funnel gone after reboot | `tailscale funnel status`; re-run and pin with `@reboot` |
| Uploads lost after recreate | You wrote to `public/uploads` instead of the volume |

Cadence: `npm audit --omit=dev` monthly, rebuild with `--pull` to pick up
base-image patches; rotate Tailscale CI keys every 30–90 days.

---

## 12. Deploy checklist

- [ ] Docker + Compose installed; `ufw` active (SSH = LAN only)
- [ ] Repo cloned; `.env` with rotated `SESSION_PASSWORD` + hex `DB_PASSWORD`
- [ ] Stack up; `prisma db push`; seed executed; **single admin** left
- [ ] SMTP configured (Gmail App Password) and the 6 emails verified
- [ ] HTTPS via Tailscale (or Caddy with your domain)
- [ ] `verify-deploy.sh` = 10/10
- [ ] Automated backups of DB + uploads; restore tested once
- [ ] CI/CD secrets set; 1-click approval environment in place
- [ ] `.env` backups live outside the repo
