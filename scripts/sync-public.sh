#!/usr/bin/env bash
# sync-public.sh — publica un SNAPSHOT saneado al repo público.
#
# Diseño (seguridad ante todo):
#   1. Exige árbol de trabajo limpio.
#   2. Fail-closed: sin valores privados (.private-values.json o
#      PRIVATE_VALUES_JSON) NO publica nada.
#   3. Worktree temporal detached desde main.
#   4. Sanea TODOS los archivos tracked (reemplazos valor-real -> placeholder).
#   5. Gate: escanea el snapshot completo por PII, secretos y archivos
#      prohibidos. Si algo queda, aborta (no hay prompt de "publicar igual").
#   6. Crea un commit SIN padre (huérfano) y lo pushea como refs/heads/<branch>.
#      El repo público NUNCA ve el historial privado: cada sync es un snapshot
#      de un solo commit, con autor noreply.
#
# Uso:
#   bash scripts/sync-public.sh [remote]     # default: remote 'public'
#   bash scripts/sync-public.sh /ruta/repo.git   # también acepta una ruta local
#
# Requiere: bash + git + node. En Windows, usar Git Bash o WSL.

set -euo pipefail

BRANCH="${PUBLIC_BRANCH:-public}"
REMOTE="${1:-${PUBLIC_REMOTE:-public}}"
SOURCE_BRANCH="${SOURCE_BRANCH:-main}"
APP_DIR="${APP_DIR:-$PWD}"
PUB_NAME="${PUBLIC_AUTHOR_NAME:-Lumen Dev}"
PUB_EMAIL="${PUBLIC_AUTHOR_EMAIL:-128647995+MREmmanuel09@users.noreply.github.com}"

cd "$APP_DIR"

# --- 1. Sanity check: árbol limpio ---
if [ -n "$(git status --porcelain)" ]; then
  echo "[x] El árbol de trabajo tiene cambios sin commitear. Commit o stash antes de sincronizar."
  git status --short
  exit 1
fi

SOURCE_SHA="$(git rev-parse --short "$SOURCE_BRANCH")"

# --- 2. Valores privados (fail-closed) ---
PRIV_FILE="${PRIVATE_VALUES_FILE:-$APP_DIR/.private-values.json}"
REPLACEMENTS_JSON=""
if [ -n "${PRIVATE_VALUES_JSON:-}" ]; then
  REPLACEMENTS_JSON="$PRIVATE_VALUES_JSON"
elif [ -f "$PRIV_FILE" ]; then
  REPLACEMENTS_JSON="$(node -e 'const fs=require("fs");const raw=fs.readFileSync(process.argv[1],"utf8");JSON.parse(raw);process.stdout.write(raw)' "$PRIV_FILE")"
else
  echo "[x] Sin valores privados: se aborta (fail-closed)."
  echo "    Creá $PRIV_FILE (valor-real -> placeholder) o exportá PRIVATE_VALUES_JSON='{"..."}'."
  exit 1
fi

# --- 3. Resolver el destino ---
if DEST="$(git remote get-url "$REMOTE" 2>/dev/null)"; then
  echo "[i] Remoto '$REMOTE': $DEST"
elif [ -e "$REMOTE" ]; then
  DEST="$REMOTE"
  echo "[i] Destino local: $DEST"
else
  echo "[x] Remoto '$REMOTE' no existe. Agregalo con: git remote add $REMOTE <url>"
  exit 1
fi

# --- 4. Worktree temporal (detached desde la rama fuente) ---
WORKTREE="$(mktemp -d -t lumen-public-XXXXXX)"
cleanup() {
  cd "$APP_DIR"
  git worktree remove --force "$WORKTREE" 2>/dev/null || true
  rmdir "$WORKTREE" 2>/dev/null || true
}
trap cleanup EXIT
git worktree add --force --detach "$WORKTREE" "$SOURCE_BRANCH" >/dev/null
cd "$WORKTREE"

# --- 5. Saneo de archivos ---
echo "[~] Aplicando reemplazos valor-real -> placeholder..."
PRIV_JSON="$REPLACEMENTS_JSON" node <<'NODE_EOF'
const fs = require('fs');
const { execSync } = require('child_process');
const replacements = JSON.parse(process.env.PRIV_JSON);
const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);
let changed = 0;
for (const file of files) {
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue; // binarios, permisos, etc.
  }
  const original = content;
  for (const [from, to] of Object.entries(replacements)) {
    content = content.split(from).join(to);
  }
  if (content !== original) {
    fs.writeFileSync(file, content);
    changed += 1;
  }
}
console.error(`  [~] ${changed} archivo(s) saneado(s)`);
NODE_EOF

# --- 6. Gate: escaneo del snapshot completo ---
echo "[*] Escaneando el snapshot por PII / secretos / archivos prohibidos..."
PRIV_JSON="$REPLACEMENTS_JSON" node <<'GATE_EOF'
const fs = require('fs');
const { execSync } = require('child_process');

const priv = Object.keys(JSON.parse(process.env.PRIV_JSON));

const regexLeaks = [
  [new RegExp(['\\+', '506[\\s-]?\\d{4}[\\s-]?\\d{4}'].join(''), ''), 'teléfono Costa Rica'],
  [/wa\.me\/[1-9]\d{6,}/, 'whatsapp'],
  [new RegExp(['a', 'bimora'].join(''), 'i'), 'handle Instagram'],
  [new RegExp(['Abi', ' ', 'Mora'].join(''), 'i'), 'nombre personal'],
  [new RegExp(['lumen', 'estudio'].join(''), 'i'), 'dominio/dato real'],
  [/@gmail\.com/i, 'email personal'],
  [/AKIA[0-9A-Z]{16}/, 'AWS key'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY/, 'clave privada'],
  [/\bre_(?!x{8,})[A-Za-z0-9]{20,}/, 'Resend key'],
  [/\bghp_[A-Za-z0-9]{20,}/, 'GitHub token'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}/, 'GitHub PAT'],
  [/\bsk-[A-Za-z0-9]{20,}/, 'API key'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, 'JWT'],
];

const forbiddenFile = /(^|\/)\.env$|(^|\/)\.env\.(local|production|prod)$|\.(pem|key|p12|pfx|db|sqlite3?)$|(^|\/)\.private-values\.json$/;

const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);
const problems = [];

for (const file of files) {
  if (forbiddenFile.test(file) && file !== '.env.example') {
    problems.push(`${file}: archivo prohibido en el snapshot`);
    continue;
  }
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const lit of priv) {
    if (content.includes(lit)) {
      problems.push(`${file}: valor privado literal "${lit.slice(0, 24)}"`);
      break;
    }
  }
  const lines = content.split('\n');
  for (const [re, label] of regexLeaks) {
    const idx = lines.findIndex((l) => re.test(l));
    if (idx !== -1) {
      problems.push(`${file}:${idx + 1}: ${label} (${lines[idx].trim().slice(0, 80)})`);
    }
  }
}

if (problems.length > 0) {
  console.error('\n[x] LEAKS DETECTADOS — NO SE PUBLICA:\n');
  for (const p of problems.slice(0, 40)) console.error('   ' + p);
  if (problems.length > 40) console.error(`   ... y ${problems.length - 40} más`);
  console.error('\nAgregá el valor a .private-values.json (real -> placeholder) o corregí el archivo.');
  process.exit(1);
}
console.error('  [ok] snapshot limpio');
GATE_EOF

# --- 7. Commit huérfano (sin historial privado) + push ---
git add -A
TREE="$(git write-tree)"
MSG="chore(public): snapshot $(date '+%F %T') desde ${SOURCE_BRANCH}@${SOURCE_SHA}"
COMMIT="$(GIT_AUTHOR_NAME="$PUB_NAME" GIT_AUTHOR_EMAIL="$PUB_EMAIL" \
         GIT_COMMITTER_NAME="$PUB_NAME" GIT_COMMITTER_EMAIL="$PUB_EMAIL" \
         git commit-tree "$TREE" -m "$MSG")"

echo "[*] Pusheando snapshot $COMMIT -> refs/heads/$BRANCH en $DEST"
git push --force "$DEST" "$COMMIT:refs/heads/$BRANCH"

echo ""
echo "[ok] Publicado. Verificá: $DEST/tree/$BRANCH"
echo "     (historial = 1 commit por sync; el historial privado nunca se pushea)"
