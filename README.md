> Español: [README.es.md](./README.es.md)

# LUMEN Estudio

Web platform for a premium photography studio: mosaic portfolio, user authentication, a full admin panel and transactional email notifications.

## Stack

- **Next.js 16** (App Router) + **React 19** + strict **TypeScript**
- **Tailwind CSS 3** + semantic CSS variables + **Framer Motion 11**
- **PostgreSQL 16** + **Prisma 5** ORM
- **iron-session 8** with AES-256-GCM encrypted cookies
- **Nodemailer (SMTP) + Resend + React Email** for transactional emails
- **Zod** for client and server validation
- **lucide-react** for icons
- **sharp** + **file-type** for file validation (magic bytes)
- **sanitize-html** for HTML sanitization
- **Vitest 5** for unit tests (auth, EXIF formatting, contact schema)
- Storage: **local by default** (`public/uploads/`), swappable to **Cloudinary** without refactoring
- Rate limiting: **in-memory by default**, swappable to **Upstash Redis**
- Security headers (CSP, HSTS, X-Frame-Options…), CSRF protection, bcrypt (12 rounds)

## Status

| Phase | Status | Description |
|---|---|---|
| 0 — Base setup | ✅ | Next.js 16 scaffold + Tailwind + ESLint 9 + design system |
| 1 — Schema + Auth | ✅ | Prisma, iron-session, rate limit, admin proxy |
| 2 — Public UI | ✅ | Home, gallery, login, register, contact, legal pages |
| 3 — Backend & API | ✅ | Categories/mosaics/files CRUD, contact, messages |
| 4 — Admin panel | ✅ | Dashboard, full management with drag&drop uploader |
| 5 — Emails + security | ✅ | React Email templates + CSP headers, sanitization |
| 6 — Tests + polish | ✅ | Documentation, checks, deploy-ready |

## Documentation

- [API Reference](./API.md) — every endpoint with response shapes
- [Homelab guide (security first)](./docs/HOMELAB.md) — setup, networking, CI/CD, backups ([español](./docs/HOMELAB.es.md))
- [Network incident: duplicate SSID](./docs/NETWORK-INCIDENT.md) — diagnosis and fix of a WiFi roaming outage ([español](./docs/NETWORK-INCIDENT.es.md))
- [Technical contracts](./CONTRATOS_TECNICOS.md) — interfaces and binding rules (Spanish)

## Live demo

**https://darkhomelab.tail01138b.ts.net** — live demo, self-hosted on a home lab (Docker + Caddy + Tailscale Funnel, no ports exposed; see the [homelab guide](./docs/HOMELAB.md)). Only the public portfolio is exposed; the admin panel is not publicly accessible.

The admin panel is not publicly accessible from the demo.

## Screenshots

| Home | Service detail | Login |
|---|---|---|
| ![Home](./docs/screenshots/home.png) | ![Service detail](./docs/screenshots/servicio-moda-editorial.png) | ![Login](./docs/screenshots/login.png) |

## Requirements

- **Node.js ≥ 20** (tested with 22.17)
- **npm ≥ 10**
- **Docker** for local PostgreSQL

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Configure environment variables
cp .env.example .env

# Generate SESSION_PASSWORD and paste it into .env (min 32 chars):
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# (Optional) For real emails, add SMTP_* or RESEND_API_KEY to .env

# 4. Apply schema and seed
npm run db:migrate -- --name init
npm run db:seed

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Seed admin credentials** (change after first login):
- Email: `admin@example.com`
- Password: `ChangeMe!Now2026`

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js in development mode |
| `npm run build` | Build for production |
| `npm run start` | Serve the production build |
| `npm test` | Run unit tests (Vitest) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript without emit |
| `npm run format` | Format with Prettier |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Apply migrations (dev) |
| `npm run db:seed` | Seed initial admin |
| `npm run db:studio` | Open Prisma Studio |

## Project structure

```
lumen-estudio/
├── prisma/
│   ├── schema.prisma             # Models: User, GalleryCategory, GalleryMosaic, File, Message
│   └── seed.ts                   # Initial admin
├── public/
│   └── uploads/                  # Local storage (gitignored)
├── src/
│   ├── app/
│   │   ├── (public)/             # Layout with Navbar + Footer
│   │   │   ├── page.tsx          # Home
│   │   │   ├── galeria/[categoria]/page.tsx
│   │   │   ├── login/
│   │   │   ├── registro/
│   │   │   ├── recuperar/
│   │   │   ├── servicios/[slug]/ # Service detail
│   │   │   ├── terminos/
│   │   │   └── privacidad/
│   │   ├── (auth)/
│   │   │   └── perfil/           # User profile
│   │   ├── admin/                # Admin panel (proxy-protected)
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── categorias/
│   │   │   ├── mosaicos/
│   │   │   ├── servicios/        # Services (price, features, icon, visible)
│   │   │   ├── marcas/           # Marquee brands (visible/hidden)
│   │   │   ├── mensajes/
│   │   │   └── usuarios/
│   │   ├── api/                  # 22 REST endpoints
│   │   │   ├── auth/             # login, register, logout, verify, forgot, reset
│   │   │   ├── categories/      # CRUD
│   │   │   ├── mosaics/          # CRUD
│   │   │   ├── brands/           # CRUD (public GET: visible only)
│   │   │   ├── services/         # CRUD (public GET: visible only)
│   │   │   ├── files/            # upload, delete, reorder
│   │   │   ├── contact/          # public
│   │   │   ├── messages/         # admin
│   │   │   └── users/            # admin
│   │   ├── layout.tsx            # Root layout with MotionConfig
│   │   └── globals.css           # Design-system CSS variables
│   ├── components/
│   │   ├── ui/                   # Button, Input, Modal, Toast, ConfirmDialog
│   │   ├── layout/               # Navbar, Footer, Container, Section
│   │   ├── home/                 # Hero, CategoryCard, CategoryGrid, ContactSection
│   │   ├── contact/              # ContactForm
│   │   ├── gallery/              # MosaicGrid, MediaItem, Lightbox
│   │   └── admin/                # AdminShell, FileUploader
│   ├── emails/                   # React Email templates
│   ├── lib/
│   │   ├── auth-utils.ts         # bcrypt, tokens, validations
│   │   ├── db.ts                 # Prisma singleton
│   │   ├── email.ts              # SMTP / Resend / console transport
│   │   ├── file-limits.ts        # Constants (client-safe)
│   │   ├── file-utils.ts         # sharp + file-type validation (server)
│   │   ├── rate-limit.ts         # In-memory limiter with auto-cleanup
│   │   ├── schemas/              # Zod schemas per domain
│   │   ├── session.ts            # iron-session helpers
│   │   ├── storage.ts            # LocalStorageProvider
│   │   └── utils.ts              # cn() helper
│   ├── services/
│   │   └── gallery.ts            # API client for the frontend
│   └── proxy.ts                  # Next 16 proxy (formerly middleware.ts)
├── docker-compose.yml            # PostgreSQL 16
├── next.config.ts                # Security headers (CSP, etc.) + remotePatterns
├── tailwind.config.ts            # Design tokens
├── tsconfig.json                 # strict + noUncheckedIndexedAccess
└── package.json
```

## Environment variables

| Var | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://lumen:CHANGE_ME@localhost:5432/lumen_estudio` |
| `SESSION_PASSWORD` | ≥32 chars, encrypts iron-session cookies | (required) |
| `NEXT_PUBLIC_APP_URL` | Absolute URL for server components and emails | `http://localhost:3000` |
| `UPLOADS_DIR` | Local storage folder | `public/uploads` |
| `STORAGE_PROVIDER` | Storage provider | `local` |
| `RATE_LIMIT_PROVIDER` | Rate limit provider | `memory` |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD` | SMTP transport (nodemailer) | (empty = disabled) |
| `RESEND_API_KEY` | Resend API key (fallback if SMTP unset) | (empty = simulated) |
| `EMAIL_FROM` | Email sender | `LUMEN Estudio <noreply@example.com>` |
| `EMAIL_ADMIN` | Contact notification destination | `admin@example.com` |

## Production deployment

### Ubuntu homelab + CI/CD (recommended)

See [HOMELAB](./docs/HOMELAB.md): Tailscale (no exposed ports), GitHub
Actions with 1-click approval, `scripts/deploy.sh` with backup + healthcheck +
automatic rollback.

### Railway (MVP alternative)

1. Create a project on [Railway](https://railway.app)
2. Add a PostgreSQL service from the marketplace
3. Connect the GitHub repo
4. Configure environment variables (never commit `.env`)
5. Build command: `npm run build`
6. Start command: `npm run start`
7. Attach a persistent volume at `public/uploads/` (or migrate to Cloudinary)

## Security

- **Headers**: CSP, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS (`next.config.ts`).
- **Cookies**: `httpOnly: true`, `secure: true` in production, `sameSite: 'lax'`.
- **Rate limit**: login 5/15min, register 10/h, contact 5/h, recovery 3/h.
- **File validation**: magic bytes with `file-type`, never trust Content-Type. 5MB image / 20MB video. Images ≥800px short side.
- **Per-mosaic limits**: 4–8 images, 2–4 videos, ≤12 total.
- **HTML sanitization**: mosaic descriptions only (allowlist `p`, `br`, `strong`, `em`, `a`).
- **CSRF**: SameSite=Lax cookies. APIs validate session.
- **Hashing**: bcrypt 12 rounds.

## License

[MIT](./LICENSE) © 2026 MREmmanuel09.
