#!/usr/bin/env bash
# Deploy de LUMEN Estudio en el homelab.
# Uso: bash scripts/deploy.sh <sha>   (lo invoca GitHub Actions por SSH)
# Hace: pin del commit → backup → build → migrate (si cambió el schema)
#       → up → healthcheck → rollback automático si algo falla.
set -euo pipefail

SHA="${1:?Uso: deploy.sh <commit-sha>}"
APP_DIR="${APP_DIR:-$HOME/lumen}"
COMPOSE="docker compose -f $APP_DIR/docker-compose.prod.yml"
BACKUP_BASE="${BACKUP_DIR:-$HOME/backups/lumen}"

log() { echo "[deploy $(date '+%F %T')] $*"; }
fail() { echo "[deploy ERROR] $*" >&2; exit 1; }

cd "$APP_DIR" || fail "No existe $APP_DIR (cloná el repo ahí primero)"
git fetch origin --quiet || fail "git fetch falló"

PREV_SHA="$(git rev-parse HEAD)"
SHORT="${SHA:0:7}"
BACKUP="$BACKUP_BASE/pre-$(date '+%F-%H%M')-$SHORT"
MIGRATED=0

rollback() {
  log "ROLLBACK a $PREV_SHA"
  git checkout --quiet "$PREV_SHA" || true
  $COMPOSE build app >/dev/null 2>&1 || true
  $COMPOSE up -d >/dev/null 2>&1 || true
  if [ "$MIGRATED" -eq 1 ] && [ -f "$BACKUP/db.sql.gz" ]; then
    log "Restaurando backup de BD"
    gunzip -c "$BACKUP/db.sql.gz" | $COMPOSE exec -T db \
      sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U lumen -d lumen_estudio' || true
  fi
  log "Rollback terminado. Revisá logs: $COMPOSE logs --tail=100 app"
}

trap 'rollback' ERR

log "Deploy $SHORT (anterior: ${PREV_SHA:0:7})"
git checkout --quiet "$SHA"

# --- Backup pre-deploy ---
mkdir -p "$BACKUP"
log "Backup de BD en $BACKUP/db.sql.gz"
$COMPOSE exec -T db \
  sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U lumen -d lumen_estudio' \
  | gzip > "$BACKUP/db.sql.gz"

UPLOADS_VOL="$($COMPOSE config --volumes 2>/dev/null | grep -m1 'uploads' || true)"
VOL=""
if [ -n "$UPLOADS_VOL" ]; then
  PROJECT="$(basename "$APP_DIR" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9')"
  if docker volume inspect "${PROJECT}_${UPLOADS_VOL}" >/dev/null 2>&1; then
    VOL="${PROJECT}_${UPLOADS_VOL}"
  elif docker volume inspect "$UPLOADS_VOL" >/dev/null 2>&1; then
    VOL="$UPLOADS_VOL"
  fi
fi
if [ -n "$VOL" ]; then
  docker run --rm \
    -v "$VOL:/data:ro" \
    -v "$BACKUP:/out" \
    alpine tar czf /out/uploads.tar.gz -C /data . \
  && log "Backup de uploads OK" || log "WARN: backup de uploads falló (sigo igual)"
else
  log "WARN: no encontré volumen de uploads (sigo igual)"
fi

# --- Build + up ---
log "Build de imagen app"
$COMPOSE build app
log "Levantando servicios"
$COMPOSE up -d

# --- Migrate solo si cambió el schema ---
if git diff --name-only "$PREV_SHA" "$SHA" -- prisma/schema.prisma | grep -q .; then
  log "Schema cambió → prisma db push (--skip-generate: el cliente ya se generó en el build; el contenedor es read-only)"
  $COMPOSE exec -T app npx prisma db push --skip-generate
  MIGRATED=1
else
  log "Schema sin cambios, sin migrate"
fi

# --- Healthcheck (dentro del contenedor: la app no publica puertos, solo Caddy) ---
log "Healthcheck (12 intentos)"
for i in $(seq 1 12); do
  if $COMPOSE exec -T app curl -fsS --max-time 10 http://localhost:3000/api/auth/session >/dev/null 2>&1; then
    log "OK: app sana en intento $i"
    docker image prune -f >/dev/null 2>&1 || true
    trap - ERR
    log "Deploy $SHORT completo. Backup en $BACKUP"
    exit 0
  fi
  sleep 10
done

log "Healthcheck falló 12 veces → rollback"
trap - ERR
rollback
exit 1
