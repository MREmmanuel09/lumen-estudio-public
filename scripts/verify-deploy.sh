#!/usr/bin/env bash
# Verificación post-deploy (no destructiva, no requiere auth).
# Uso: bash scripts/verify-deploy.sh https://thinkcenter.tailXXXX.ts.net
# Sale 0 si todo pasa, 1 si algo falla.
set -uo pipefail

BASE="${1:?Uso: verify-deploy.sh <base-url>}"
BASE="${BASE%/}"
PASS=0
FAIL=0

ok()   { PASS=$((PASS+1)); echo "✅ $*"; }
nook() { FAIL=$((FAIL+1)); echo "❌ $*" >&2; }

check() { # check <nombre> <condición-comando...>
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then ok "$name"; else nook "$name"; fi
}

echo "— Verificando $BASE —"

# 1. Home responde 200
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$BASE/")
[ "$CODE" = "200" ] && ok "Home 200" || nook "Home 200 (fue $CODE)"

# 2. Sesión responde con shape correcto
BODY=$(curl -s --max-time 15 "$BASE/api/auth/session")
echo "$BODY" | grep -q '"success":true' && ok "Session shape ok" || nook "Session shape ok ($BODY)"

# 3. Headers de seguridad presentes
HDRS=$(curl -sSI --max-time 15 "$BASE/")
for h in "strict-transport-security" "x-content-type-options" "content-security-policy" "x-frame-options"; do
  echo "$HDRS" | grep -qi "$h" && ok "Header $h" || nook "Header $h"
done

# 4. CSRF: POST desde origen externo debe ser 403
CSRF=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -X POST "$BASE/api/contact" \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://evil.example.com' \
  -d '{"name":"x","email":"x@x.com","message":"hola mundo test"}')
[ "$CSRF" = "403" ] && ok "CSRF cross-origin 403" || nook "CSRF cross-origin (fue $CSRF)"

# 5. /admin sin sesión redirige a /login
ADM=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 15 "$BASE/admin")
echo "$ADM" | grep -Eq '30[1278].*login' && ok "/admin redirige a login ($ADM)" || nook "/admin redirige ($ADM)"

# 6. Login con credenciales malas → 401 (no 500, no bypass)
BAD=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"nadie@example.com","password":"Incorrecta123!"}')
[ "$BAD" = "401" ] && ok "Login inválido 401" || nook "Login inválido (fue $BAD)"

# 7. Funnel/TLS: la URL debe ser https (HSTS solo tiene sentido así)
case "$BASE" in
  https://*) ok "Base HTTPS" ;;
  *) nook "Base HTTPS (usá https://…)" ;;
esac

echo "— $PASS ok / $FAIL fallos —"
[ "$FAIL" -eq 0 ]
