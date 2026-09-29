# PLAN DE EJECUCIÓN — LUMEN ESTUDIO (HISTÓRICO)

> ⚠️ Documento archivado en Fase 0 (2026-09-08). Ya ejecutado (Fases 0-6 según README).
> Contiene decisiones obsoletas: Next.js 14, pnpm, Vercel, NextAuth, `middleware.ts`.
> Estado vigente: Next.js 16.3.1, npm, Homelab/VPS Docker, iron-session, `src/proxy.ts`.
> Contratos vigentes: `CONTRATOS_TECNICOS.md`, `API.md`, `docs/HOMELAB.md`. No usar este plan para implementar.
>
> Original: referencia para coordinar 4 agentes sobre el spec "Prompt Maestro LUMEN ESTUDIO".
> Generado el 2026-08-20. Workspace: `D:\Proyectos\StudioAbi`.

---

## 1. Decisiones técnicas confirmadas

| Aspecto | Decisión | Notas |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript estricto | Sin `any` salvo en bordes externos |
| Estilos | Tailwind CSS + Framer Motion | Variables CSS semánticas, no hex hardcodeados |
| Base de datos | PostgreSQL 16 vía Docker local | `docker-compose.yml` con volumen persistente |
| ORM | Prisma | Migraciones versionadas en `prisma/migrations/` |
| Auth | **iron-session 8.0.4** + cookies encriptadas AES-256-GCM + bcrypt (salt 12) | Decisión 2026-08-20: NextAuth v5 descartado por incompatibilidad con Next 16. Shape de sesión idéntico al contrato. |
| Almacenamiento | **Local en dev** (`/public/uploads/`) | Capa `lib/storage.ts` abstrayendo provider para migrar a S3/Cloudinary sin refactor |
| Emails | Resend + React Email | Plantillas en `src/emails/` |
| Validación | Zod en cliente y servidor | Schemas compartidos en `src/lib/schemas/` |
| Seguridad | Helmet, rate limiting (Upstash/in-memory), CSRF token, DOMPurify | Headers en `next.config.ts` y middleware |
| Deploy objetivo | Vercel (Fase 6) | Variables de entorno gestionadas en dashboard |

---

## 2. Mapa de fases y dependencias

```
FASE 0 — Setup base (todos)
   │
   ▼
FASE 1 — Schema + Auth base           ◄── Agente 3
   │
   ├──────────────────┬──────────────────┐
   ▼                  ▼                  ▼
FASE 2              FASE 3              FASE 5
Diseño + UI         API + Lógica        Seguridad + Emails
Agente 1            Agente 2            Agente 4
   │                  │                  │
   └──────────────────┴──────────────────┘
                       │
                       ▼
              FASE 4 — Panel Admin
              Agente 1 + Agente 2
                       │
                       ▼
              FASE 6 — Integración + Tests + Deploy
              Todos
```

> **Trabajo en paralelo real**: tras FASE 1, los agentes 1, 2 y 4 pueden ejecutar en paralelo si el repositorio se trabaja en ramas separadas (`feat/agente-1-ui`, `feat/agente-2-api`, `feat/agente-4-security`).

---

## 3. FASE 0 — Setup base

**Owner**: todos (convenciones compartidas) — **Esfuerzo**: S (1 sesión)
**Pre-requisitos**: ninguno

### Entregables
- `package.json` con dependencias fijadas
- `tsconfig.json` estricto (`strict: true`, `noUncheckedIndexedAccess: true`)
- `next.config.ts` con `images.remotePatterns` placeholder
- `tailwind.config.ts` con paleta de marca y tipografías
- `postcss.config.mjs`
- `docker-compose.yml` con servicio `postgres:16-alpine`, volumen `lumen_pg_data`, puerto 5432
- `.env.example` completo (DB, NEXTAUTH_SECRET, NEXTAUTH_URL, RESEND_API_KEY, etc.)
- `.gitignore` (node_modules, .env, .next, uploads, prisma migrations locales)
- `README.md` con setup rápido
- `src/app/layout.tsx` raíz con `<html lang="es">` y tipografía por defecto
- `src/app/globals.css` con directivas Tailwind y variables CSS semánticas

### Convenciones a fijar (todos los agentes las respetan)
- **Naming**: `kebab-case` para archivos, `PascalCase` para componentes, `camelCase` para funciones/variables
- **Imports**: alias `@/` para `src/`
- **Estilos**: solo Tailwind + variables CSS; **prohibido** hex/rgba inline
- **Commits**: Conventional Commits en español (`feat: añadir login`, `fix: corregir validación email`)
- **Schemas Zod**: siempre en `src/lib/schemas/<dominio>.ts` y exportados como tipo
- **Errores API**: shape uniforme `{ ok: false, error: { code, message } }` o `{ ok: true, data }`

### Criterios de aceptación
- `pnpm install && docker compose up -d && pnpm dev` levanta el proyecto sin errores
- `http://localhost:3000` muestra una página placeholder "LUMEN ESTUDIO"
- TypeScript compila sin warnings
- `pnpm lint` y `pnpm typecheck` pasan

---

## 4. FASE 1 — Schema + Auth base (Agente 3)

**Esfuerzo**: M (2-3 sesiones) · **Bloquea**: Fases 2, 3, 4, 5

> **Stack auth**: `iron-session@8.0.4` (en lugar de NextAuth v5, descartado por incompatibilidad con Next 16). Ver `CONTRATOS_TECNICOS.md` §4 para la justificación.

### Entregables
- `prisma/schema.prisma` con los modelos:
  - `User` (id, name, email, passwordHash, role, emailVerified, image, createdAt, updatedAt, relations)
  - `VerificationToken` (identifier, token, expires)
  - `GalleryCategory`, `GalleryMosaic`, `File` (con `status` enum PENDING/READY/FAILED), `Message`
  - Enums: `Role`, `FileType`, `FileStatus`
  - **NO** se incluyen `Session` ni `Account` (iron-session es stateless, no usamos OAuth)
- `prisma/seed.ts` con admin inicial (`admin@example.com` / `ChangeMe!Now2026`)
- `src/lib/db.ts` (singleton PrismaClient con hot-reload safety en dev)
- `src/lib/session.ts`:
  - `sessionOptions` con `SESSION_PASSWORD` >= 32 chars
  - `getSession()` wrapper sobre `getIronSession(cookies(), sessionOptions)`
  - Helpers: `getCurrentUser()`, `requireUser()`, `requireAdmin()`
- `src/proxy.ts` (renombrado de `middleware.ts` para Next 16):
  - Protege `/admin/*` (rol ADMIN)
  - Protege `/perfil/*` (usuario autenticado)
  - Redirige a `/login?callbackUrl=...` si no autenticado
- API routes (`src/app/api/auth/`):
  - `register/route.ts` — Zod, hash bcrypt, crea usuario, stub `sendVerificationEmail`
  - `login/route.ts` — credentials, setea sesión con TTL según rol, bloqueo tras 5 fallos
  - `logout/route.ts` — destruye sesión
  - `session/route.ts` — devuelve sesión actual (para cliente)
  - `verify-email/route.ts` — valida token, marca `emailVerified`
  - `forgot-password/route.ts` — genera token, stub `sendPasswordResetEmail`
  - `reset-password/route.ts` — valida token, actualiza hash
- `src/lib/auth-utils.ts`:
  - `hashPassword`, `verifyPassword` (bcrypt, 12 rounds)
  - `generateVerificationToken` (32 bytes random, expira en 24h)
  - `validatePasswordStrength` (>=8, mayúscula, número, símbolo)
  - `sanitizeUser(user)` (previene enumeración, no expone `passwordHash` ni datos sensibles)
- `src/lib/rate-limit.ts` — `MemoryRateLimiter` con interfaz del contrato técnico
- `src/lib/api/response.ts` — helpers `ok<T>()`, `err()`, tipos `ApiResponse<T>`, `ApiError`
- `src/lib/email.ts` — stub `sendEmail()` (FASE 5 implementa con Resend)

### Contratos que el resto de agentes debe respetar
- **`User.role`**: `USER | ADMIN` (enum Prisma)
- **`session.user`**: `{ id, email, name: string | null, role }` (ver `CONTRATOS_TECNICOS.md` §4)
- **API import**: `import { getSession, requireUser, requireAdmin } from '@/lib/session'`
- **Formato de respuestas API**: `{ success, data | error }` con códigos del contrato
- **Rate limit**: usar `rateLimit.check()` / `rateLimit.increment()` con keys documentadas

### Criterios de aceptación
- `npx prisma migrate dev` crea todas las tablas
- `npx prisma db seed` crea admin
- Login con credenciales válidas setea cookie `lumen_session` con shape correcto
- Login con 5 contraseñas incorrectas bloquea la cuenta por 15 min
- Visitar `/admin` sin sesión redirige a `/login?callbackUrl=/admin`
- Visitar `/admin` como USER redirige a `/`
- Visitar `/admin` como ADMIN deja pasar
- `GET /api/auth/session` devuelve sesión actual o `{ user: null }`
- `/api/auth/register` rechaza contraseñas débiles y emails duplicados

---

## 5. FASE 2 — Sistema de diseño + páginas públicas (Agente 1)

**Esfuerzo**: M (2-3 sesiones) · **Depende de**: FASE 1 (para auth UI)

### 5.1 Sistema de diseño
- `src/styles/globals.css`: variables CSS semánticas (`--color-bg`, `--color-fg`, `--color-accent`, etc.)
- `tailwind.config.ts`: extensión con paleta de marca
  - Azul Marino `#0A192F`, Negro `#000000`, Blanco `#F8F9FA`, Hueso `#E8E0D5`
- Fuentes cargadas en `layout.tsx`:
  - Títulos: `Cormorant_Garamond` (next/font/google)
  - Cuerpo: `Inter`
  - Detalles: `Space_Grotesk`
- `src/lib/motion.ts`: variantes Framer Motion compartidas (fadeUp, stagger, scaleIn) con respeto a `prefers-reduced-motion`

### 5.2 Componentes base (`src/components/ui/`)
- `Button.tsx` (variants: primary, ghost, outline; sizes: sm, md, lg)
- `Input.tsx` (con label, error, helperText)
- `Textarea.tsx`
- `Modal.tsx` (con focus trap, cierre ESC, click-outside)
- `Skeleton.tsx` (para estados de carga)
- `Toast.tsx` (notificaciones efímeras, contexto provider)

### 5.3 Componentes de layout (`src/components/layout/`)
- `Navbar.tsx`: transparente en top, sólida al hacer scroll (evento scroll con throttle)
- `Footer.tsx`
- `Container.tsx` (max-width responsivo)
- `Section.tsx` (spacing vertical consistente)

### 5.4 Páginas públicas (`src/app/(public)/`)
- `layout.tsx` con Navbar + Footer
- `page.tsx` (home):
  - Hero a pantalla completa con imagen destacada
  - Sección "Categorías" con grid de `CategoryCard`
  - Sección "Sobre el estudio"
  - Formulario de contacto
- `galeria/[categoria]/page.tsx`:
  - `generateMetadata` para SEO dinámico
  - `MosaicGrid` masonry
  - `Lightbox` para imagen/video
- `login/page.tsx`, `registro/page.tsx`, `contacto/page.tsx`, `recuperar-password/page.tsx`

### 5.5 Páginas autenticadas (`src/app/(auth)/`)
- `layout.tsx` con Navbar + auth check
- `perfil/page.tsx`: editar nombre, avatar, cambiar contraseña, eliminar cuenta

### 5.6 SEO + accesibilidad
- `src/app/sitemap.ts` dinámico
- `src/app/robots.ts`
- Metadatos Open Graph en cada página
- Contraste WCAG AA mínimo
- Navegación por teclado funcional
- `aria-label` en iconos sin texto

### Criterios de aceptación
- Home carga en <2s local con LCP visible
- Navbar cambia de transparente a sólido al scrollear >50px
- Mosaico respeta `prefers-reduced-motion`
- Lighthouse Accessibility ≥90
- Todas las páginas tienen `<title>` y `meta description` únicos

---

## 6. FASE 3 — API + lógica de negocio (Agente 2)

**Esfuerzo**: M (2-3 sesiones) · **Depende de**: FASE 1

### Entregables
- `src/lib/schemas/`:
  - `category.ts` (`createCategorySchema`, `updateCategorySchema`)
  - `mosaic.ts` (`createMosaicSchema` con validación de `files: z.array().min(4).max(8)` y videos `.min(2).max(4)`)
  - `file.ts`
  - `contact.ts`
- `src/lib/storage.ts`:
  - Interfaz `StorageProvider` con `save(file): Promise<{url, key}>`, `delete(key): Promise<void>`
  - Implementación `LocalStorageProvider` que escribe en `public/uploads/<yyyy>/<mm>/<uuid>.<ext>`
  - Documentado para swap por `S3StorageProvider` / `CloudinaryStorageProvider`
- `src/lib/api-helpers.ts`:
  - `ok(data)`, `err(code, message, status)` para respuestas uniformes
  - `withAuth(handler, { role? })` para wrappear API routes
  - `parseFormData(req)` con manejo de multipart
- API routes:
  - `POST /api/contact` (validación, honeypot, rate limit 3/h por IP, persiste en Message, llama stub de email)
  - `GET/POST /api/categories` (listar públicas / crear admin)
  - `PUT/DELETE /api/categories/[id]` (cascade: borra mosaicos y archivos)
  - `GET/POST /api/mosaics` (listar con filtros / crear validando límites)
  - `PUT/DELETE /api/mosaics/[id]`
  - `POST /api/files` (multipart, valida MIME y tamaño ≤20MB)
  - `DELETE /api/files/[id]`
  - `PUT /api/files/reorder`
  - `PUT /api/mosaics/[id]/cover`

### Lógica crítica
- **Transacciones**: al crear mosaico con N archivos, usar `prisma.$transaction` para que o se creen todos o ninguno
- **Cascada manual**: al eliminar categoría o mosaico, borrar archivos físicos antes del delete en DB
- **Slugs únicos**: al crear categoría, slug derivado de `name` con `slugify`, verifica unicidad
- **Límites**: server-side, no confiar en cliente; rechaza con 400 si >8 fotos o >4 videos

### Criterios de aceptación
- Contacto persiste y dispara emails (stubs en esta fase, reales en FASE 5)
- CRUD de categorías funciona end-to-end
- Subir 9 fotos a un mosaico devuelve error 400 claro
- Eliminar categoría borra archivos físicos y registros en cascada
- Respuestas API siempre con shape `{ ok, data | error }`

---

## 7. FASE 4 — Panel admin (Agente 1 + Agente 2)

**Esfuerzo**: L (3-4 sesiones) · **Depende de**: Fases 2 y 3

### Layout admin
- `src/app/admin/layout.tsx` con `AdminSidebar` (Dashboard, Categorías, Mosaicos, Usuarios) + auth check de rol
- `AdminHeader` con menú de usuario

### Dashboard (`/admin`)
- `DashboardStats.tsx`: tarjetas con totales (categorías, mosaicos, archivos, mensajes sin leer, usuarios)
- Gráfica simple de actividad reciente (opcional)

### CRUD Categorías (`/admin/categorias`)
- Lista con búsqueda y paginación
- Modal de crear/editar con preview de cover
- Confirmación de eliminación con texto a tipear ("ELIMINAR")

### CRUD Mosaicos (`/admin/mosaicos`)
- Lista filtrable por categoría
- Editor con:
  - `FileUploader` drag & drop, multi-file, progress por archivo
  - Previsualización con reordenable (dnd-kit)
  - Selector de cover (radio sobre las imágenes)
  - Validación visual de límites (4-8 fotos, 2-4 videos)
  - Editor inline de `altText` por imagen

### Gestión de Usuarios (`/admin/usuarios`)
- Tabla con búsqueda, filtros por rol
- Crear admin (modal con email + password temporal)
- Resetear contraseña de un usuario
- Cambiar rol
- Banear/desbanear (opcional)

### Mensajes (`/admin/mensajes`)
- Bandeja de entrada con no leídos resaltados
- Vista detalle con respuesta (opcional, usar mailto: en MVP)

### Criterios de aceptación
- Solo usuarios con rol `ADMIN` acceden a `/admin/*` (middleware)
- Crear mosaico con 0 archivos muestra error
- Reordenar archivos persiste el nuevo `order`
- Cambiar cover actualiza `coverFileId` y se refleja en página pública
- Acciones destructivas requieren doble confirmación

---

## 8. FASE 5 — Seguridad + Emails (Agente 4)

**Esfuerzo**: M (2-3 sesiones) · **Depende de**: FASE 1; puede tocar transversalmente Fases 2-4

### Seguridad transversal
- `next.config.ts` con headers:
  - `Content-Security-Policy` (ajustar a `script-src 'self' 'unsafe-inline'` para Next)
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `src/middleware.ts`: añadir CSRF check (double-submit cookie) en mutaciones no-GET
- `src/lib/sanitize.ts`:
  - `sanitizeString(input)` con DOMPurify (server-side usando `isomorphic-dompurify`)
  - `sanitizeFilename(name)` para uploads
- Rate limiting (en `src/lib/rate-limit.ts`):
  - Login: 5/15min por email
  - Registro: 5/hora por IP
  - Contacto: 3/hora por IP
  - API admin: 100/min por user
- Validación de uploads:
  - MIME real verificado con `file-type` (no confiar en extensión)
  - Tamaño ≤20MB
  - Dimensiones mínimas: imágenes ≥800×600, videos ignorados en validación de dimensión
  - Renombrado a UUID para evitar colisiones y path traversal

### Emails con Resend + React Email
- `src/lib/email.ts`: cliente Resend configurado
- Plantillas en `src/emails/` (React Email):
  - `Welcome.tsx` — bienvenida al registrarse
  - `VerifyEmail.tsx` — link de verificación
  - `PasswordReset.tsx` — link de recuperación
  - `LoginAlert.tsx` — alerta de nuevo inicio de sesión
  - `ContactConfirmation.tsx` — al remitente del formulario
  - `ContactNotification.tsx` — al admin cuando llega mensaje
- Templates oscuros/elegantes con marca, footer con links legales
- `src/lib/send-email.ts` con cola simple y retry (3 intentos, backoff exponencial)

### Criterios de aceptación
- Intentar 6 logins en 5 min bloquea al usuario 15 min
- HTML de emails pasa validación de spam básico (sin URLs acortadas, texto alternativo, etc.)
- Subir un `.exe` renombrado a `.jpg` es rechazado
- Sanitizar `<script>alert(1)</script>` en un campo de texto lo neutraliza

---

## 9. FASE 6 — Integración + tests + deploy

**Esfuerzo**: M (2 sesiones) · **Depende de**: todas las anteriores

### Tests
- Unitarios: Vitest para `lib/` (schemas, storage, auth-utils, rate-limit)
- Integración: tests de API routes con `next-test-api-route-handler`
- E2E opcionales: Playwright para flujos críticos (registro → login → crear mosaico)

### Calidad
- ESLint + Prettier con config compartida
- Type-check en CI
- Lint de accesibilidad con `eslint-plugin-jsx-a11y`

### Deploy
- `vercel.json` con rewrites si aplica
- Variables de entorno documentadas
- `Dockerfile` opcional para deploy alternativo
- `README.md` final con:
  - Requisitos
  - Setup local (un solo bloque de comandos)
  - Variables de entorno
  - Scripts útiles
  - Troubleshooting
- Páginas legales: `/terminos`, `/privacidad` (templates con cláusulas estándar, revisar con abogado)

### Criterios de aceptación
- `pnpm test && pnpm build` pasa limpio
- Deploy a Vercel funciona con DB externa (Neon/Supabase) y Resend
- URL pública accesible, `/admin` protegido
- Seed crea admin accesible

---

## 10. Asignación de trabajo y ramas

| Fase | Agente | Rama sugerida | Paralelizable con |
|---|---|---|---|
| 0 | Todos | `chore/setup` | — |
| 1 | Agente 3 | `feat/agente-3-auth` | — (bloquea todo) |
| 2 | Agente 1 | `feat/agente-1-ui` | Fases 3 y 5 |
| 3 | Agente 2 | `feat/agente-2-api` | Fases 2 y 5 |
| 4 | Agente 1 + 2 | `feat/admin` | FASE 5 (parcial) |
| 5 | Agente 4 | `feat/agente-4-security` | Fases 2 y 3 |
| 6 | Todos | `chore/release` | — |

> Si los 4 agentes son personas reales, cada uno mergea a `main` solo tras revisión de los contratos de la FASE 1. Si son sesiones de IA, ejecutar Fase → commit → siguiente fase en orden.

---

## 11. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Scope creep en una fase | Retrasa todo | Criterios de aceptación por fase son binarios; lo que no esté, va a backlog |
| Inconsistencias entre agentes | Bugs en integración | Contratos de FASE 1 (tipos, enums) son ley; cambios requieren actualizar a los 4 |
| Auth de NextAuth v5 inestable | Bugs críticos | Pin versión exacta, leer release notes, tener plan B con iron-session |
| Subida de archivos local saturada | Disco lleno en dev | Limpieza periódica + plan de migración a S3 desde día 1 |
| Emails en spam | Mala UX | Configurar SPF/DKIM cuando se compre dominio, usar Resend (mejor deliverability) |
| Sin tests en Fases 2-3 | Deuda técnica | Al menos tests de schemas Zod y auth-utils desde FASE 1 |

---

## 12. Backlog explícito (fuera de MVP)

- Búsqueda full-text en galería
- Watermark automático en imágenes
- Integración con Instagram/Flickr
- Multi-idioma (ES/EN)
- Comentarios en mosaicos
- Sistema de likes/favoritos
- Pasarela de pago para sesiones fotográficas
- Generación de PDFs de cotización
- Modo oscuro público

---

## 13. Próximo paso concreto

**Sesión actual cerrada con este plan. Para arrancar ejecución:**

1. Confirmar que el plan sirve como contrato
2. Empezar **FASE 0** en la siguiente sesión (scaffold + docker + env)
3. Continuar secuencialmente hasta FASE 1 (que desbloquea el resto)

Si querés que arranque ya con FASE 0, decímelo y la siguiente sesión la ejecuto completa.
