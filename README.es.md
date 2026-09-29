> English: [README.md](./README.md)

# LUMEN Estudio

Plataforma web para un estudio fotográfico premium: portafolio tipo mosaico, autenticación de usuarios, panel de administración completo y notificaciones por email.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** estricto
- **Tailwind CSS 3** + variables CSS semánticas + **Framer Motion 11**
- **PostgreSQL 16** + **Prisma 5** ORM
- **iron-session 8** con cookies encriptadas AES-256-GCM
- **Nodemailer (SMTP) + Resend + React Email** para emails transaccionales
- **Zod** para validación en cliente y servidor
- **lucide-react** para iconografía
- **sharp** + **file-type** para validación de archivos (magic bytes)
- **sanitize-html** para sanitizar HTML
- Storage: **local por defecto** (`public/uploads/`), migrable a **Cloudinary** sin refactor
- Rate limit: **in-memory por defecto**, migrable a **Upstash Redis**
- Headers de seguridad (CSP, HSTS, X-Frame-Options…), protección CSRF, bcrypt (12 rounds)

## Estado

| Fase | Estado | Descripción |
|---|---|---|
| 0 — Setup base | ✅ | Scaffold Next.js 16 + Tailwind + ESLint 9 + design system |
| 1 — Schema + Auth | ✅ | Prisma, iron-session, rate limit, proxy admin |
| 2 — UI pública | ✅ | Home, galería, login, registro, contacto, legales |
| 3 — Backend & API | ✅ | CRUD categorías/mosaicos/archivos, contacto, mensajes |
| 4 — Panel admin | ✅ | Dashboard, gestión completa con uploader drag&drop |
| 5 — Emails + seguridad | ✅ | React Email + headers CSP, sanitización |
| 6 — Tests + polish | ✅ | Documentación, verificaciones, deploy-ready |

## Documentación

- [Guía de homelab (seguridad ante todo)](./docs/HOMELAB.es.md) — setup, red, CI/CD, backups ([english](./docs/HOMELAB.md))
- [Contratos técnicos](./CONTRATOS_TECNICOS.md) — interfaces y reglas vinculantes
- [API Reference](./API.md) — todos los endpoints con shape de respuesta
- [Plan de ejecución (histórico)](./docs/PLAN_HISTORICO.md) — roadmap por fases
- [Pipeline de repo público](./docs/PUBLIC-REPO.md) — cómo se publica este snapshot saneado

## Demo en vivo

Self-hosted en un homelab detrás de Tailscale; **demo disponible bajo pedido** (sin URL pública — sin puertos expuestos).

## Requisitos

- **Node.js ≥ 20** (probado con 22.17)
- **npm ≥ 10**
- **Docker** para PostgreSQL local

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar PostgreSQL
docker compose up -d

# 3. Configurar variables de entorno
cp .env.example .env

# Generar SESSION_PASSWORD y editarlo en .env (mínimo 32 chars):
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# (Opcional) Para emails reales, configurar SMTP_* o RESEND_API_KEY en .env

# 4. Aplicar schema y seed
npm run db:migrate -- --name init
npm run db:seed

# 5. Iniciar dev server
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

**Credenciales admin del seed** (cambiar tras primer login):
- Email: `admin@example.com`
- Password: `ChangeMe!Now2026`

## Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Inicia Next.js en modo desarrollo |
| `npm run build` | Compila para producción |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | Ejecuta ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run format` | Formatea con Prettier |
| `npm run db:generate` | Genera el cliente Prisma |
| `npm run db:migrate` | Aplica migraciones (dev) |
| `npm run db:seed` | Puebla la BD con admin inicial |
| `npm run db:studio` | Abre Prisma Studio |

## Estructura del proyecto

```
lumen-estudio/
├── prisma/
│   ├── schema.prisma             # Modelos: User, GalleryCategory, GalleryMosaic, File, Message
│   └── seed.ts                   # Admin inicial
├── public/
│   └── uploads/                  # Storage local (gitignored)
├── src/
│   ├── app/
│   │   ├── (public)/             # Layout con Navbar + Footer
│   │   │   ├── page.tsx          # Home
│   │   │   ├── galeria/[categoria]/page.tsx
│   │   │   ├── login/
│   │   │   ├── registro/
│   │   │   ├── recuperar/
│   │   │   ├── servicios/[slug]/ # Detalle de servicio
│   │   │   ├── terminos/
│   │   │   └── privacidad/
│   │   ├── (auth)/
│   │   │   └── perfil/           # Perfil de usuario
│   │   ├── admin/                # Panel admin (protegido por proxy)
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── categorias/
│   │   │   ├── mosaicos/
│   │   │   ├── servicios/        # Servicios (precio, features, icono, visible)
│   │   │   ├── marcas/           # Marcas del Marquee (visible/oculto)
│   │   │   ├── mensajes/
│   │   │   └── usuarios/
│   │   ├── api/                  # 22 endpoints REST
│   │   │   ├── auth/             # login, register, logout, verify, forgot, reset
│   │   │   ├── categories/       # CRUD
│   │   │   ├── mosaics/          # CRUD
│   │   │   ├── brands/           # CRUD (GET público solo visibles)
│   │   │   ├── services/         # CRUD (GET público solo visibles)
│   │   │   ├── files/            # upload, delete, reorder
│   │   │   ├── contact/          # público
│   │   │   ├── messages/         # admin
│   │   │   └── users/            # admin
│   │   ├── layout.tsx            # Root layout con MotionConfig
│   │   └── globals.css           # Variables CSS del sistema de diseño
│   ├── components/
│   │   ├── ui/                   # Button, Input, Modal, Toast, ConfirmDialog
│   │   ├── layout/               # Navbar, Footer, Container, Section
│   │   ├── home/                 # Hero, CategoryCard, CategoryGrid, ContactSection
│   │   ├── contact/              # ContactForm
│   │   ├── gallery/              # MosaicGrid, MediaItem, Lightbox
│   │   └── admin/                # AdminShell, FileUploader
│   ├── emails/                   # Plantillas React Email
│   ├── lib/
│   │   ├── auth-utils.ts         # bcrypt, tokens, validaciones
│   │   ├── db.ts                 # Singleton Prisma
│   │   ├── email.ts              # Transporte SMTP / Resend / consola
│   │   ├── file-limits.ts        # Constantes (seguro en client)
│   │   ├── file-utils.ts         # Validación con sharp + file-type (server)
│   │   ├── rate-limit.ts         # In-memory con auto-cleanup
│   │   ├── schemas/              # Zod schemas por dominio
│   │   ├── session.ts            # iron-session helpers
│   │   ├── storage.ts            # LocalStorageProvider
│   │   └── utils.ts              # cn() helper
│   ├── services/
│   │   └── gallery.ts            # Cliente de la API para el frontend
│   └── proxy.ts                  # Next 16 proxy (antes middleware.ts)
├── docker-compose.yml            # PostgreSQL 16
├── next.config.ts                # Headers de seguridad (CSP, etc.) + remotePatterns
├── tailwind.config.ts            # Design tokens
├── tsconfig.json                 # strict + noUncheckedIndexedAccess
└── package.json
```

## Variables de entorno

| Var | Descripción | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://lumen:CHANGE_ME@localhost:5432/lumen_estudio` |
| `SESSION_PASSWORD` | ≥32 chars, encripta cookies iron-session | (requerido) |
| `NEXT_PUBLIC_APP_URL` | URL absoluta para server components y emails | `http://localhost:3000` |
| `UPLOADS_DIR` | Carpeta de storage local | `public/uploads` |
| `STORAGE_PROVIDER` | Provider de storage | `local` |
| `RATE_LIMIT_PROVIDER` | Provider de rate limit | `memory` |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD` | Transporte SMTP (nodemailer) | (vacío = deshabilitado) |
| `RESEND_API_KEY` | API key de Resend (fallback si no hay SMTP) | (vacío = simulado) |
| `EMAIL_FROM` | Remitente de emails | `LUMEN Estudio <noreply@example.com>` |
| `EMAIL_ADMIN` | Email destino de notificaciones de contacto | `admin@example.com` |

## Despliegue a producción

### Homelab Ubuntu + CI/CD (recomendado)

Ver [HOMELAB](./docs/HOMELAB.es.md): Tailscale (sin puertos públicos),
GitHub Actions con aprobación de 1 clic, `scripts/deploy.sh` con backup +
healthcheck + rollback automático.

### Railway (alternativa MVP)

1. Crear proyecto en [Railway](https://railway.app)
2. Agregar servicio PostgreSQL desde el marketplace
3. Conectar el repo de GitHub
4. Configurar variables de entorno (no commitear `.env`)
5. Comando de build: `npm run build`
6. Comando de start: `npm run start`
7. Configurar volumen persistente en `public/uploads/` (o migrar a Cloudinary)

## Seguridad

- **Headers**: CSP, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy, HSTS (en `next.config.ts`).
- **Cookies**: `httpOnly: true`, `secure: true` en producción, `sameSite: 'lax'`.
- **Rate limit**: login 5/15min, registro 10/h, contacto 5/h, recuperación 3/h.
- **Validación de archivos**: magic bytes con `file-type`, nunca confiar en Content-Type. Límite 5MB imagen / 20MB video. Imágenes ≥800px lado corto.
- **Límites por mosaico**: 4-8 imágenes, 2-4 videos, total ≤12.
- **Sanitización HTML**: solo en descripciones de mosaico (whitelist `p`, `br`, `strong`, `em`, `a`).
- **CSRF**: cookies SameSite=Lax. APIs validan sesión.
- **Hashing**: bcrypt 12 rounds para passwords.

## Licencia

[MIT](./LICENSE) © 2026 MREmmanuel09.
