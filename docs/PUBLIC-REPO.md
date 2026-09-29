# Repo público + repo privado (workflow de sincronización)

> **Por qué existe este doc**: el código vive en un repo privado (con datos
> reales del estudio) y se espeja a un repo público (para portafolio /
> starter / comunidad). El puente entre ambos es un script de sanitización
> que se asegura de que NUNCA se publiquen datos personales ni secretos.

## Arquitectura

```
┌──────────────────────────┐                ┌──────────────────────────┐
│  Repo PRIVADO            │                │  Repo PÚBLICO            │
│  (StudioAbi / home)      │  snapshot      │  (lumen-estudio-public)  │
│                          │  huérfano +    │                          │
│  Datos reales del        │  gate de PII   │  Placeholders genéricos  │
│  estudio, secrets,       │ ─────────────► │  + código                │
│  foto del fundador       │  (1 commit     │  (SIN historial privado)  │
│  Historial completo      │   por sync)    │                          │
└──────────────────────────┘                └──────────────────────────┘
        ▲                                            ▲
        │ push                                       │ star / clone
        │                                            │ (visible a todos)
   Trabajás vos                                  Comunidad
```

> **Garantía de seguridad (2026-09)**: cada sync genera un commit **sin padre**
> (huérfano). El repo público nunca recibe el historial privado — ni ahora ni
> "por si alguien pushea algo viejo". Además el script es **fail-closed**: sin
> `.private-values.json` (o el secret `PRIVATE_VALUES_JSON` en CI) no publica,
> y si el gate detecta PII/secretos aborta sin push. El historial del repo
> privado también fue reescrito con `git-filter-repo` (2026-09): cero PII en
> ningún commit, autores con email noreply.

## Setup (una vez)

### 1. Crear el repo público

> ✅ **Hecho (2026-09)**: https://github.com/MREmmanuel09/lumen-estudio-public
> (público, branch por defecto `public`, sin README propio).

En GitHub: **New repository** → nombre: `lumen-estudio-public` (o el que quieras) → **Public** → sin README ni .gitignore ni license (los vas a traer del repo privado).

### 2. Deploy Key SSH (recomendado) o Personal Access Token

**Opción A — SSH Deploy Key** (más seguro, scoped solo a ese repo):

1. En tu PC: `ssh-keygen -t ed25519 -f ~/.ssh/lumen-public-deploy`
2. En GitHub → repo público → Settings → **Deploy keys** → Add deploy key
   - Title: `lumen-studio-private-mirror`
   - Key: pegar el contenido de `lumen-public-deploy.pub`
   - ☑️ Allow write access
3. En GitHub → repo privado → Settings → Secrets → Actions → New secret
   - Name: `PUBLIC_REPO_DEPLOY_KEY`
   - Value: contenido de `lumen-public-deploy` (la **privada**)

**Opción B — Personal Access Token** (más simple, menos scoped):

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
   - Repository access: Only `lumen-estudio-public`
   - Permissions: Contents → Read and write
2. En repo privado → Settings → Secrets → Actions → New secret
   - Name: `PUBLIC_REPO_TOKEN`
   - Value: el token
3. En `.github/workflows/sync-public.yml`, reemplazar el step de SSH por uno que use el token.

### 3. Configurar la URL del repo público en el workflow

Editar [`.github/workflows/sync-public.yml`](file:///.github/workflows/sync-public.yml) línea del step "Configurar remote público":

```yaml
git remote add public git@github.com:MREmmanuel09/lumen-estudio-public.git
```

### 4. `.private-values.json` (obligatorio — fail-closed)

Este archivo **NO se commitea** (está en `.gitignore`). Vive solo en tu PC/homelab (y en el secret `PRIVATE_VALUES_JSON` de CI). Mapea **valor real → placeholder** y es lo que el script usa para sanear antes de publicar. **Sin él, el script aborta y no publica nada.**

```json
{
  "valor real 1": "placeholder 1",
  "valor real 2": "placeholder 2"
}
```

Ejemplo real (los valores van entre comillas tal cual aparecen en el código):

```json
{
  "hola@tudominio.com": "hola@example.com",
  "tu-telefono-real": "+000 0000 0000",
  "tu_handle": "your_handle"
}
```

Si aparece un valor nuevo que debe ocultarse (un email, un teléfono, un
nombre): **agregalo acá** (y si vive en el historial, reescribí con
`git-filter-repo --replace-text`, ver §3 abajo).

## Uso diario

### Sincronizar manualmente desde tu PC

```bash
# Agregar el remote público (solo una vez)
git remote add public git@github.com:MREmmanuel09/lumen-estudio-public.git

# Sincronizar (con .private-values.json si querés inyectar los datos reales)
bash scripts/sync-public.sh public
```

El script:
1. Verifica que tu árbol está limpio (commit o stash primero)
2. **Fail-closed**: sin `.private-values.json` / `PRIVATE_VALUES_JSON` aborta
3. Sanea todos los archivos tracked (valor real → placeholder)
4. Ejecuta el **gate**: PII, secretos (AWS/GitHub/Resend/Slack/PEM/JWT) y
   archivos prohibidos (`.env`, `*.pem`, `*.db`, …). Si algo queda, aborta
   sin publicar (no hay "publicar igual")
5. Crea un commit **huérfano** (snapshot de un solo commit, autor noreply) y
   lo pushea como `refs/heads/public` con `--force`
6. Cleanup del worktree temporal

El repo público siempre tiene **exactamente 1 commit por sync** — sin
historial heredado del privado.

### Sincronizar vía GitHub Actions

1. Repo privado → Actions → "Sync public" → Run workflow
2. Escribir `SYNC` cuando pida confirmación
3. Aprobar el environment `production` (si configuraste required reviewers)
4. En ~1 minuto está en el repo público

### Sincronizar automáticamente en cada push a main

En [`.github/workflows/sync-public.yml`](file:///.github/workflows/sync-public.yml), descomentar:

```yaml
on:
  push:
    branches: [main]
```

Útil para portafolios que se mantienen al día. **No** activar si el repo privado tiene secretos aún sin sanitizar — el script los detecta, pero el push público queda en el historial de Actions (es público solo si tu Actions es público; el repo privado lo mantiene privado).

## Qué se sanitiza

El código del repo privado ya vive con placeholders; `.private-values.json`
guarda los valores reales y el script los reemplaza **si aparecieran** en
cualquier archivo antes de publicar (defensa en profundidad).

| Categoría | Placeholder en código | Valor real (vive en `.private-values.json`) |
|---|---|---|
| Email admin | `admin@example.com` | `admin@tu-dominio.com` |
| Email contacto | `hola@example.com` | `contacto@tu-dominio.com` |
| Email legal | `legal@example.com` | `legal@tu-dominio.com` |
| Email privacidad | `privacidad@example.com` | `privacidad@tu-dominio.com` |
| Email remitente | `noreply@example.com` | `noreply@tu-dominio.com` |
| Password seed | `ChangeMe!Now2026` | tu password real |
| DB password | `change_me` / `CHANGE_ME` | tu password real |
| Teléfono | `+000 0000 0000` | tu número |
| WhatsApp | `https://wa.me/0000000000` | tu link |
| Instagram | `@your_handle` / `your_handle` | tu handle |
| Foto | `public/images/author.jpg` (gitignored) | tu foto |

## Qué NO se sanitiza (es público a propósito)

- Código fuente completo
- Nombres de archivo
- Estructura del proyecto
- Comentarios en código
- Mensajes de commits (salvo que uses emails privados — ver abajo)

## Recomendaciones adicionales

### 1. Privacidad de commits en el repo público

GitHub expone el email del autor de cada commit. Para evitar exponer tu email:

```bash
# Configurar un email noreply solo para este repo
git config user.email "tu-usuario@users.noreply.github.com"
```

O más fuerte, en `.git/config`:

```
[user]
  email = 1234567+tu-usuario@users.noreply.github.com
  name = Tu Nombre
```

### 2. Historial del repo público

No hace falta hacer squash: el flujo ya publica **un commit huérfano por
sync**. Si querés que ni siquiera exista el snapshot anterior en el repo
público (ej. hubo un leak puntual), borrá la rama y volvé a sincronizar:

```bash
git push public --delete public   # elimina la rama en el repo público
bash scripts/sync-public.sh public  # publica un snapshot nuevo y limpio
```

En GitHub → repo público → Settings → "Danger Zone" → **Delete a branch**
también sirve. GitHub purga los objetos huérfanos de a poco; si el leak era
grave, usá §3.

### 3. Si algo se filtró accidentalmente

> ✅ **Hecho (2026-09)**: el historial del repo **privado** fue reescrito con
> `git-filter-repo` (PII → placeholders + autores noreply) y se pusheó con
> `--force`. Backup del historial anterior: bundle local fuera del repo.

Si volviera a filtrarse algo:

```bash
# 1. Instalar git-filter-repo
pip install git-filter-repo

# 2. Reescribir historial en el repo PÚBLICO
git clone git@github.com:MREmmanuel09/lumen-estudio-public.git
cd lumen-estudio-public
git filter-repo --replace-text expressions.txt
# (expressions.txt: pares SED s/antes/después/g)

# 3. Force-push
git remote add origin git@github.com:MREmmanuel09/lumen-estudio-public.git
git push --force --all

# 4. Pedir a GitHub que purge caches
# https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#about-personal-access-tokens
# (Support → "Remove sensitive data from a repository" si hay passwords/tokens)
```

## Resumen

```
1. Vos trabajás en repo privado (los valores reales viven en .private-values.json)
2. Cuando querés publicar: bash scripts/sync-public.sh public
   (o: Actions → Sync public → SYNC, con el secret PRIVATE_VALUES_JSON)
3. El script sanea → gate de PII/secretos → commit huérfano → push
4. El repo público SIEMPRE tiene 1 commit por sync, sin historial privado
```
