# CONTRATOS TÉCNICOS — LUMEN ESTUDIO

> Documento vinculante para los 4 agentes. Cualquier cambio debe comunicarse al equipo completo.
> Versión 1.0 · 2026-08-20 · Workspace: `D:\Proyectos\StudioAbi`

---

## Índice

1. [StorageProvider — Interfaz de almacenamiento](#1-storageprovider)
2. [RateLimiter — Interfaz de rate limiting](#2-ratelimiter)
3. [Formato estándar de respuestas API](#3-formato-estándar-de-respuestas-api)
4. [Contrato de sesión y JWT](#4-contrato-de-sesión-y-jwt)
5. [Reglas de subida de archivos](#5-reglas-de-subida-de-archivos)
6. [API Routes vs Server Actions](#6-api-routes-vs-server-actions)
7. [Target de deploy y sus implicaciones](#7-target-de-deploy-y-sus-implicaciones)
8. [Librería de sanitización](#8-librería-de-sanitización)
9. [Estrategia de limpieza de archivos huérfanos](#9-estrategia-de-limpieza-de-archivos-huérfanos)
10. [Checklist de seguridad para Fase 6](#10-checklist-de-seguridad-para-fase-6)
11. [Decisiones pendientes](#11-decisiones-pendientes)

---

## 1. StorageProvider

Abstracción para que la lógica de negocio no dependa del provider concreto. La migración a S3/Cloudinary es un cambio de implementación, **no** de interfaz.

### 1.1 Interfaz

```typescript
// src/lib/storage/types.ts

export type StorageCategory = 'image' | 'video';

export interface StorageSaveInput {
  /** Buffer del archivo (ya validado en tamaño/MIME previamente) */
  buffer: Buffer;
  /** Nombre original del archivo (solo se usa para derivar extensión) */
  originalName: string;
  /** MIME type validado */
  mimeType: string;
  /** Categoría lógica (afecta validación de dimensiones y naming) */
  category: StorageCategory;
  /** Slug de la categoría padre (lowercase, sin acentos, ya validado) */
  categorySlug: string;
  /** ID del mosaico (cuid generado por Prisma) */
  mosaicId: string;
  /** Metadata opcional persistida (ej. { userId, mosaicId }) */
  metadata?: Record<string, string>;
}

export interface StorageSaveResult {
  /** Key interno, opaque al consumidor (no asumir estructura) */
  key: string;
  /** URL pública servible directamente */
  url: string;
  /** Tamaño en bytes */
  size: number;
  /** MIME type final (puede diferir del original si se normalizó) */
  mimeType: string;
}

export interface StorageProvider {
  save(input: StorageSaveInput): Promise<StorageSaveResult>;
  delete(key: string): Promise<void>;
  /** Verifica existencia sin descargar el archivo */
  exists(key: string): Promise<boolean>;
  /** Solo para providers que requieren signed URLs (S3 privado). Opcional en local. */
  getSignedUrl?(key: string, expiresIn?: number): Promise<string>;
  /**
   * Construye el key interno. El provider lo usa en `save`; expuesto para
   * que el caller pueda pre-calcularlo (logging, validación previa).
   * Garantiza: lowercase, sin caracteres especiales, sin path traversal.
   */
  buildKey(input: Pick<StorageSaveInput, 'categorySlug' | 'mosaicId' | 'originalName'>): string;
}
```

### 1.2 Reglas de nombrado

| Aspecto | Regla |
|---|---|
| Key final | `{categorySlug}/{mosaicId}/{uuid-v4}.{ext}` |
| Ejemplo | `moda-editorial/clx123abc456/9f8e7d6c-5b4a-3f2e-1d0c-9b8a7f6e5d4c.jpg` |
| Construcción | **SIEMPRE** vía `provider.buildKey(input)`, nunca concatenar strings |
| `categorySlug` | Lowercase, sin acentos, `a-z0-9-` only, max 64 chars |
| `mosaicId` | Cuid generado por Prisma (`^[a-z0-9]{25,30}$`) |
| UUID | `crypto.randomUUID()` v4 |
| Extensión | Derivada del MIME validado, no de `originalName`. Normalizada a minúsculas |
| Validación de key | Regex `^[a-z0-9][a-z0-9/_\-.]*$` + rechazo explícito de `..` antes de cualquier save/delete/exists (el `.` de la extensión es legítimo) |
| Path traversal | Prohibido `..`, `/` inicial, o cualquier segmento que no matche `[a-z0-9-]+` |

### 1.3 Implementación local (referencia)

```typescript
// src/lib/storage/local.ts — NO IMPLEMENTACIÓN COMPLETA, solo contrato esperado

export class LocalStorageProvider implements StorageProvider {
  // buildKey: {categorySlug}/{mosaicId}/{uuid}.{ext}, valida regex
  // save: escribe en public/uploads/{key}, retorna /uploads/{key} como URL
  // delete: fs.unlink con sanitización de key (debe matchear ^[a-z0-9][a-z0-9/_\-.]*$ y no contener ..)
  // exists: fs.access
  // getSignedUrl: lanza error (no aplica en local)
}
```

### 1.4 Mapeo de providers

| Entorno | Implementación | Variable de entorno |
|---|---|---|
| Dev (MVP) | `LocalStorageProvider` | `STORAGE_PROVIDER=local` |
| Prod (futuro) | `S3StorageProvider` o `CloudinaryStorageProvider` | `STORAGE_PROVIDER=s3` + `S3_*` |

> **El switch ocurre en `src/lib/storage/index.ts` mediante factory**, no en cada llamada.

---

## 2. RateLimiter

Abstracción compatible con implementación in-memory (dev) y Redis/Upstash (prod).

### 2.1 Interfaz

```typescript
// src/lib/rate-limit/types.ts

export interface RateLimitResult {
  allowed: boolean;
  /** Requests restantes en la ventana actual */
  remaining: number;
  /** Unix ms cuando se resetea la ventana */
  resetAt: number;
  /** Total de requests en la ventana actual */
  current: number;
}

export interface RateLimiter {
  /**
   * Verifica si una key puede hacer una request. NO incrementa el contador.
   * Usar antes de operaciones costosas para short-circuit.
   */
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;

  /**
   * Incrementa el contador y retorna el nuevo valor.
   * Llamar después de que la operación sea exitosa (no antes, para no castigar
   * requests rechazadas por validación).
   */
  increment(key: string, windowMs: number): Promise<number>;

  /** Resetea manualmente (ej. tras login exitoso, desbloquear usuario) */
  reset(key: string): Promise<void>;

  /**
   * Ejecuta una pasada de limpieza de entradas expiradas.
   * - Impl in-memory: elimina entries cuyo windowStart + windowMs < now
   * - Impl Upstash/Redis: no-op (TTL lo maneja)
   * Retorna el número de entradas eliminadas.
   */
  cleanup(): Promise<{ removed: number }>;

  /**
   * Inicia limpieza automática en background. Solo relevante para impl in-memory.
   * Upstash/Redis: no-op silencioso.
   * Retorna un handle para detener el interval.
   */
  startAutoCleanup(intervalMs: number): { stop: () => void };
}
```

### 2.2 Políticas de límites

| Endpoint | Key | Límite | Ventana | Acción al exceder |
|---|---|---|---|---|
| `POST /api/register` | `register:ip:{ip}` | 10 | 1 hora | 429 con `Retry-After` |
| `POST /api/auth/...` (login) | `login:email:{email}` | 5 (solo intentos fallidos) | 15 min | Cuenta bloqueada + 429 |
| `POST /api/contact` | `contact:ip:{ip}` | 5 | 1 hora | 429 |
| `*` API admin | `api:user:{userId}` | 100 | 1 min | 429 |
| `POST /api/auth/forgot-password` | `forgot:ip:{ip}` | 3 | 1 hora | 429 (prevenir enumeración) |

### 2.3 Política de bloqueo de login

```typescript
// Pseudocódigo de la lógica de bloqueo
async function attemptLogin(email, password) {
  const limit = await rateLimiter.check(`login:email:${email}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    throw new ApiError('RATE_LIMITED', 'Cuenta bloqueada temporalmente', {
      retryAfter: limit.resetAt
    });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    await rateLimiter.increment(`login:email:${email}`, 15 * 60 * 1000);
    throw new ApiError('AUTH_INVALID', 'Credenciales inválidas'); // mensaje genérico
  }

  await rateLimiter.reset(`login:email:${email}`);
  // ... emitir sesión
}
```

### 2.4 Implementación in-memory (referencia)

```typescript
// src/lib/rate-limit/memory.ts — INTERFAZ, no implementación

export class MemoryRateLimiter implements RateLimiter {
  // Map<key, { count, windowStart }>
  // check: si windowStart + windowMs < now, reset count a 0
  // increment: count++
  // reset: delete(key)
  // ⚠️ Solo dev. En prod usar Upstash o Redis con TTL.
}
```

---

## 3. Formato estándar de respuestas API

**TODAS** las respuestas de `/api/*` deben cumplir este contrato. Sin excepciones.

### 3.1 Shape

```typescript
// src/lib/api/response.ts

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export interface ApiError {
  /** Código machine-readable, estable, en MAYÚSCULAS_CON_GUIONES */
  code: ApiErrorCode;
  /** Mensaje human-readable en español, sin datos sensibles */
  message: string;
  /** Detalles opcionales (errores de validación campo por campo, etc.) */
  details?: Record<string, unknown>;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'INTERNAL_ERROR';
```

### 3.2 Códigos de error

| Código | HTTP | Cuándo usarlo |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Falla validación Zod o de input |
| `AUTH_INVALID` | 401 | Credenciales incorrectas (login) |
| `AUTH_REQUIRED` | 401 | No hay sesión para endpoint protegido |
| `FORBIDDEN` | 403 | Sesión existe pero rol/permisos insuficientes |
| `NOT_FOUND` | 404 | Recurso no existe |
| `CONFLICT` | 409 | Email duplicado, slug duplicado, etc. |
| `RATE_LIMITED` | 429 | Rate limit excedido |
| `PAYLOAD_TOO_LARGE` | 413 | Archivo >20MB |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | MIME no permitido |
| `INTERNAL_ERROR` | 500 | Error no controlado (loguear en server) |

### 3.3 Ejemplos

**Éxito:**
```json
{
  "success": true,
  "data": {
    "id": "ckl5g2...",
    "name": "Moda Editorial",
    "slug": "moda-editorial"
  }
}
```

**Validación fallida:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos",
    "details": {
      "fields": {
        "email": "Email inválido",
        "password": "Debe contener al menos un símbolo"
      }
    }
  }
}
```

**Rate limit:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Demasiadas solicitudes, intenta en 12 minutos",
    "details": { "retryAfter": 720 }
  }
}
```

### 3.4 Helpers

```typescript
// src/lib/api/response.ts
export const ok = <T>(data: T): ApiResponse<T> => ({ success: true, data });
export const err = (
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>
): ApiResponse<never> => ({ success: false, error: { code, message, details } });
```

---

## 4. Contrato de sesión y JWT

> **Decisión arquitectónica 2026-08-20**: se descartó NextAuth v5 por incompatibilidades con Next 16 (`middleware.ts` → `proxy.ts`, runtime forzado a Node.js, Auth.js en security-patch mode). Se adopta **`iron-session@8.0.4`** con cookies encriptadas AES-256-GCM. La forma de la sesión es idéntica para que los agentes consumidores no noten diferencia.

### 4.1 Shape de la sesión (consumido por todos los agentes)

```typescript
// Lo que los Server Components, Server Actions, API routes y proxy reciben.
// Independiente de la implementación interna (NextAuth JWT vs iron-session cookie).

interface SessionUser {
  id: string;                // = sub
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
}

interface Session {
  user: SessionUser;
  /** Epoch ms en que expira la sesión */
  expiresAt: number;
  /** Epoch ms en que se emitió (para debugging / invalidación futura) */
  issuedAt: number;
}
```

**Invariantes para todos los agentes:**
- `session.user.role` es la fuente de verdad para checks de autorización en el proxy.
- `session.user.id` es el identificador estable para joins con la DB.
- Si `session` es `null` o `undefined`, el usuario no está autenticado.
- La cookie tiene un TTL máximo de 30 días para USER, 1 hora para ADMIN (ver 4.3).

### 4.2 Implementación interna (referencia, no consumir directamente)

```typescript
// src/lib/session.ts — IMPLEMENTACIÓN con iron-session

import type { SessionOptions } from 'iron-session';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD!, // >= 32 chars, validado en arranque
  cookieName: 'lumen_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  },
  ttl: 60 * 60 * 24 * 30, // 30 días por defecto; sobreescrito en login según rol
};

export async function getSession() {
  return getIronSession<Session>(await cookies(), sessionOptions);
}
```

### 4.3 Decisión: ¿rol en sesión o en cada request?

**Decisión: rol en la sesión (cookie encriptada).**

**Justificación:**
- ✅ Evita 1 query por cada request a endpoint protegido
- ✅ El proxy puede rechazar antes de cargar la página
- ❌ Riesgo: si el rol cambia en DB, la sesión sigue con el rol viejo hasta expirar

**Mitigación del riesgo:**
- TTL agresivo (ver 4.4)
- Para acciones críticas (crear admin, eliminar mosaico), re-verificar rol en DB:
  ```typescript
  // Patrón: re-check en operaciones sensibles
  const session = await getSession();
  if (session?.user.role !== 'ADMIN') throw new ApiError('FORBIDDEN', '...');

  // Solo para operaciones críticas (no en cada lectura):
  const freshUser = await db.user.findUnique({ where: { id: session.user.id } });
  if (freshUser?.role !== 'ADMIN') throw new ApiError('FORBIDDEN', 'Sesión desactualizada');
  ```

### 4.4 Expiración

| Tipo de sesión | Duración (TTL) | Razón |
|---|---|---|
| USER | 30 días (2_592_000 s) | UX: no obligar a relogin frecuente |
| ADMIN | 1 hora (3_600 s) | Superficie de ataque si comprometen la cookie |

> El TTL se setea en `session.ttl` al momento del login, según el rol del usuario. La cookie expira antes que la sesión (iron-session descuenta 60s del TTL para evitar race conditions).

### 4.5 Actualización de rol

Si un USER es promovido a ADMIN, o un ADMIN es degradado:

1. **Opción A (MVP)**: el usuario debe re-loguear para ver el nuevo rol.
2. **Opción B (futuro)**: invalidar todas las sesiones del usuario con `session.version` en el payload, incrementando en DB y checkeando en `getSession()`.

**Implementación A:**
```typescript
// En un endpoint de cambio de rol (solo admin)
await updateUserRole(targetUserId, newRole);
// El target debe re-loguear para ver el cambio.
// Alternativamente: session.destroy() en todas las sesiones del target
//   (imposible con iron-session stateless — Opción B lo resuelve).
```

### 4.6 Cookies

| Atributo | Valor | Razón |
|---|---|---|
| `httpOnly` | `true` | Prevenir XSS stealing |
| `secure` | `true` en prod, `false` en dev | HTTPS obligatorio en producción |
| `sameSite` | `'lax'` | Balance entre CSRF y UX |
| `path` | `/` | Toda la app |
| `domain` | (default) | Single domain en MVP |
| `maxAge` | TTL - 60s | iron-session descuenta margen |

### 4.7 Variables de entorno

```env
# Mínimo 32 caracteres. Generar con:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
SESSION_PASSWORD="<32+ chars base64>"
```

> **Removido de versiones anteriores**: `NEXTAUTH_SECRET`, `NEXTAUTH_URL` ya no aplican.

---

## 5. Reglas de subida de archivos

### 5.1 Tipos MIME permitidos

| Categoría | MIME types aceptados | Extensiones |
|---|---|---|
| Imagen | `image/jpeg`, `image/png`, `image/webp`, `image/avif` | `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif` |
| Video | `video/mp4` (H.264), `video/webm` (VP9) | `.mp4`, `.webm` |

> **Validar MIME con `file-type` (lee magic bytes), NO confiar en la extensión del archivo.**

### 5.2 Tamaño máximo

| Categoría | Límite | Razón |
|---|---|---|
| Imagen | 5 MB | Optimizado para web, suficiente para 4K |
| Video | 20 MB | MVP, suficiente para teasers; videos largos en plan futuro |
| Request total (multipart) | 25 MB | Margen sobre el mayor individual |

### 5.3 Dimensiones mínimas (solo imágenes)

| Regla | Valor | Razón |
|---|---|---|
| Lado más corto | ≥ 800 px | Calidad mínima para portafolio |
| Lado más largo | ≤ 8000 px | Prevenir abuso (imágenes descomunales) |

> Implementar con `sharp.metadata()` server-side antes de aceptar el archivo.

### 5.4 Límites por mosaico

| Métrica | Mínimo | Máximo |
|---|---|---|
| Imágenes | 4 | 8 |
| Videos | 2 | 4 |
| **Total archivos** | **4** | **12** |

> Si el cliente envía 9 imágenes, la API rechaza con `VALIDATION_ERROR` antes de tocar storage.
> Si tras subir el cliente intenta agregar un video que excede el límite, mismo rechazo.

### 5.5 Thumbnails de video

| Aspecto | Decisión MVP |
|---|---|
| Generación automática | **NO** en MVP (requiere ffmpeg o servicio externo) |
| Cover de mosaico | Solo imágenes (no video como cover) |
| Plan futuro | Integrar Cloudinary (transformaciones built-in) o ffmpeg worker |

### 5.6 Naming

```
{categoria-slug}/{mosaico-id}/{uuid-v4}.{ext}

Ejemplo:
moda-editorial/clx123abc456/9f8e7d6c-5b4a-3f2e-1d0c-9b8a7f6e5d4c.jpg
```

- `categoria-slug`: lowercase, sin acentos, separado por `-`
- `mosaico-id`: cuid generado por Prisma
- `uuid-v4`: randomUUID
- `ext`: lowercase, sin query string

---

## 6. API Routes vs Server Actions

### 6.1 Matriz de decisión

| Operación | Mecanismo | Razón |
|---|---|---|
| `POST /api/register` | API Route | Endpoint público, testeable, llamable desde CLI/mobile |
| `POST /api/auth/*` (NextAuth) | API Route | NextAuth lo requiere |
| `POST /api/contact` | API Route | Form público, posible integración con terceros |
| `GET/POST /api/categories` | API Route | Lectura cacheable, panel admin consume la misma |
| `GET/POST /api/mosaics` | API Route | Idem |
| `POST /api/files` | API Route | Multipart, requiere response JSON clara |
| Reordenar archivos (drag & drop) | **Server Action** | Mutación simple desde UI interna, progresiva enhancement |
| Marcar mensaje como leído | **Server Action** | UI-only, no necesita API pública |
| Cambiar tema / preferencias UI | **Server Action** | Sin valor de tener endpoint público |
| Subir archivo desde panel admin | API Route | Multipart, validación, progress, response con metadata |

### 6.2 Reglas claras

```
✅ API Route cuando:
  - El endpoint es público o semi-público
  - Necesita respuesta JSON cacheable
  - Multipart/form-data pesado
  - Múltiples consumidores (panel admin + futuro mobile)

✅ Server Action cuando:
  - Es una mutación simple de UI
  - Solo se invoca desde componentes internos
  - No requiere API pública
  - El usuario está autenticado y la acción es contextual
```

### 6.3 Por qué esta separación

- **API Routes**: mayor observabilidad (logs, métricas, rate limit granular), posibilidad de versionar (`/api/v1/...`), testing con `fetch` directo, debugging con curl.
- **Server Actions**: menos boilerplate, progressive enhancement automático, tipos compartidos sin DTOs, mejor para mutaciones de UI.

> **No usar Server Actions para endpoints que puedan necesitar auth diferente a la sesión web** (ej. tokens de API para integraciones futuras).

---

## 7. Target de deploy y sus implicaciones

### 7.1 Escenarios

| Target | Storage viable | Rate limit viable | Pros | Contras |
|---|---|---|---|---|
| **VPS** (Railway, Fly.io, EC2, Hetzner) | Local + S3 opcional | In-memory o Redis | Sin vendor lock-in, control total, costos predecibles | Responsable de运维, escalado manual |
| **Vercel** | S3/Cloudinary obligatorio | Upstash Redis obligatorio | Deploy trivial, escala automática, edge network | Vendor lock-in, costos variables, **storage local NO funciona** |
| **Vercel + Vercel Blob** | Vercel Blob (nativo) | Upstash | Integración nativa | Más caro que S3, menos control |

### 7.2 Recomendación MVP

**Recomendación: Railway (o Fly.io) para MVP, migrar a Vercel solo si se requiere edge.**

**Justificación:**
- El usuario quiere storage local en dev → tener `LocalStorageProvider` como opción productiva evita migración temprana.
- Rate limit in-memory es aceptable para 1 instancia; al escalar, switch a Redis es 1 archivo.
- Costos predecibles: Railway ~$5-20/mes para proyecto pequeño.
- Si el tráfico lo justifica en el futuro, migrar a Vercel + S3 + Upstash es directo gracias a las abstracciones (StorageProvider + RateLimiter).

### 7.3 Consecuencias por elección

| Si elegís VPS | Si elegís Vercel |
|---|---|
| Storage local productivo OK | Storage local NO funciona en Vercel (read-only fs) |
| Rate limit in-memory OK para 1 instancia | Upstash obligatorio desde día 1 |
| Next.js Image Optimization funciona con files locales | Necesitás configurar `images.remotePatterns` para S3/CDN |
| `npm start` o `pm2` suficiente | Build y deploy via `vercel` CLI |
| SSL via Caddy/Nginx | SSL automático |
| Logs centralizados手动 | Logs vía Vercel Dashboard |

> **Esta decisión se confirma en FASE 0** (ver sección 11 — Decisiones pendientes).

---

## 8. Librería de sanitización

### 8.1 Stack

| Capa | Librería | Uso |
|---|---|---|
| Server-side input | `zod` | Shape y tipo |
| Server-side contenido | `sanitize-html` | Strings que persisten en BD (mensajes, descripciones) |
| Client-side render | `DOMPurify` (vía `isomorphic-dompurify`) | Solo si se renderiza HTML en el cliente |
| URLs de upload | Validación regex | Prevenir `javascript:` URIs |

### 8.2 Reglas por campo

| Campo | Tipo de sanitización |
|---|---|
| `User.name` | Trim + longitud max 100. Sin HTML. |
| `User.email` | Validación Zod (`z.string().email().toLowerCase()`). |
| `Message.message` | Texto plano + escapado al renderizar. **NO** permitir HTML. |
| `Message.subject` | Trim + longitud max 200. Sin HTML. |
| `GalleryMosaic.title` | Trim + longitud max 200. Sin HTML. |
| `GalleryMosaic.description` | HTML limitado: `<p>`, `<strong>`, `<em>`, `<a href>`. Whitelist de atributos. |
| `File.altText` | Trim + longitud max 200. Sin HTML. |
| `GalleryCategory.name` | Trim + longitud max 100 + slugify. Sin HTML. |

### 8.3 Configuración `sanitize-html` para descripciones

```typescript
// src/lib/sanitize.ts — REFERENCIA

const descriptionConfig: sanitize.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'a'],
  allowedAttributes: {
    a: ['href', 'rel', 'target'],
  },
  allowedSchemes: ['https', 'mailto'],
  transformTags: {
    a: sanitize.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
  },
};
```

> **Server Actions y API Routes que acepten descripciones deben pasar el string por `sanitizeHtml(input, descriptionConfig)` antes de persistir.**

---

## 9. Estrategia de limpieza de archivos huérfanos

### 9.1 El problema

Upload a storage + registro en DB son dos operaciones. Si una falla sin compensar la otra, quedan:
- **Archivos sin registro** (storage lleno de basura)
- **Registros sin archivo** (404 al servir)

### 9.2 Regla de orden

```
┌─────────────────────────────────────────────┐
│  1. Validar input (Zod + MIME + tamaño)    │
│  2. BEGIN TRANSACTION en BD                │
│  3. Crear registro File con key provisional │
│  4. Subir a storage                         │
│     └─ Si falla: ROLLBACK + throw           │
│  5. UPDATE File SET url = ...              │
│  6. COMMIT                                  │
│     └─ Si falla: DELETE storage + throw    │
└─────────────────────────────────────────────┘
```

### 9.3 Patrón de implementación

```typescript
// Pseudocódigo

async function uploadFile(input: UploadInput): Promise<File> {
  // 1. Validar antes
  await validateImageOrVideo(input);

  const key = buildKey(input.prefix, input.originalName);
  let dbRecord: File;

  try {
    dbRecord = await db.$transaction(async (tx) => {
      return await tx.file.create({
        data: {
          ...input,
          key,
          url: '', // placeholder
          status: 'PENDING',
        },
      });
    });

    const result = await storage.save({
      buffer: input.buffer,
      originalName: input.originalName,
      mimeType: input.mimeType,
      category: input.category,
      prefix: input.prefix,
    });

    dbRecord = await db.file.update({
      where: { id: dbRecord.id },
      data: { url: result.url, key: result.key, status: 'READY' },
    });

    return dbRecord;
  } catch (err) {
    // Compensar: si el record existe, eliminarlo
    if (dbRecord?.id) {
      await db.file.delete({ where: { id: dbRecord.id } }).catch(() => {});
    }
    // Si llegamos a subir pero el update final falló, eliminar del storage
    if (dbRecord?.key && dbRecord.status === 'READY') {
      await storage.delete(dbRecord.key).catch(() => {});
    }
    throw err;
  }
}
```

### 9.4 Tarea programada de huérfanos (opcional MVP)

Si el proyecto vive en VPS con cron, añadir:

```typescript
// src/jobs/sweep-orphan-files.ts
// Ejecutar diariamente a las 03:00

export async function sweepOrphanFiles() {
  // 1. Listar todos los File.status = 'PENDING' con createdAt < now - 1h
  // 2. Para cada uno: storage.delete(key) + db.file.delete(id)
  // 3. Listar archivos en storage que no tienen File en DB
  //    (solo posible con provider que soporte listing: S3, NO local)
  // 4. Generar reporte con conteos
}
```

> En storage local, el listado es trivial (`fs.readdir`). En S3, usar `ListObjectsV2`.

### 9.5 Estado `PENDING` en el modelo File

Añadir al schema:
```prisma
enum FileStatus {
  PENDING
  READY
  FAILED
}

model File {
  // ... campos existentes
  status FileStatus @default(PENDING)
}
```

> Migración Prisma: añadir en FASE 3.

---

## 10. Checklist de seguridad para Fase 6

Antes del deploy, el Agente 4 debe verificar:

### 10.1 Dependencias

- [ ] `pnpm audit` (o `npm audit`) sin vulnerabilidades **CRITICAL** o **HIGH**
- [ ] Lockfile versionado en git
- [ ] `engines` en `package.json` fija Node ≥20

### 10.2 Headers de seguridad

Verificar con `curl -I https://dominio.com`:

- [ ] `Content-Security-Policy: ...` presente
- [ ] `X-Frame-Options: DENY` o via CSP `frame-ancestors 'none'`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains` (solo prod)

### 10.3 Upload de archivos

- [ ] Subir archivo `.jpg` que en realidad es un script (magic bytes `<?php` o `<script>`) → rechazado con 415
- [ ] Subir archivo de 21MB → rechazado con 413
- [ ] Subir archivo con MIME `image/jpeg` pero extensión `.exe` → rechazado por magic bytes
- [ ] Path traversal en filename: `../../etc/passwd` → key sanitizada a `uploads/uuid.bin`

### 10.4 Rate limiting

- [ ] 11 requests de registro desde misma IP en 1h → la 11ª recibe 429
- [ ] 6 logins fallidos con mismo email en 15 min → el 6º recibe 429
- [ ] Después del bloqueo, intentar login con credenciales correctas → sigue 429
- [ ] Reset manual del rate limit (login exitoso) → siguiente request pasa

### 10.5 CSRF

- [ ] POST a `/api/categories` sin token CSRF desde origen externo → 403
- [ ] POST a `/api/contact` sin token CSRF desde origen externo → 403
- [ ] Mismo origen con token válido → 200

### 10.6 Inyección

- [ ] `<script>alert(1)</script>` en campo `Message.message` → se guarda escapado, se renderiza como texto
- [ ] `<img src=x onerror=alert(1)>` en `GalleryMosaic.description` → tags no whitelisted se eliminan
- [ ] `' OR '1'='1` en campo de texto → Prisma parametriza, no hay SQL injection

### 10.7 Cookies y sesión

- [ ] Cookie de sesión tiene flag `HttpOnly`
- [ ] Cookie tiene flag `Secure` en producción
- [ ] Cookie tiene `SameSite=Lax`
- [ ] Modificar el JWT en el cliente y enviarlo → rechazado (firma inválida)
- [ ] Token expirado → 401 + redirect a login

### 10.8 Autenticación

- [ ] Usuario baneado intentando login → mensaje genérico (no "usuario no existe")
- [ ] Cambio de contraseña invalida otras sesiones (NextAuth v5: `update()` o nueva estrategia)
- [ ] Verificación de email requerida para acciones sensibles (configurable)

### 10.9 Logs y monitoreo

- [ ] Errores 5xx logueados con stack trace
- [ ] No se loguean: passwords, tokens, contenido completo de emails
- [ ] IP y user agent en logs de auth
- [ ] Alertas configuradas para picos de 5xx

### 10.10 HTTPS y transporte

- [ ] Certificados válidos (Let's Encrypt o provider)
- [ ] HSTS habilitado
- [ ] Redirect HTTP → HTTPS
- [ ] Cookies marcadas `Secure` en prod

---

## 11. Decisiones pendientes

> Estos puntos requieren confirmación del equipo antes de FASE 0.

| # | Decisión | Opciones | Recomendación | Bloquea |
|---|---|---|---|---|
| 1 | Target de deploy final | Railway / Fly.io / Vercel / EC2 | **Railway** (balance costo/control) | FASE 6 |
| 2 | Storage de producción cuando se migre | S3 / Cloudinary / Vercel Blob | **Cloudinary** (transformaciones built-in, plan gratis generoso) | FASE 6 |
| 3 | Rate limit de producción | Upstash Redis / Redis propio / Vercel KV | **Upstash** (serverless, free tier, compatible con interfaz) | FASE 6 |
| 4 | Email provider regional | Resend / SendGrid / Postmark | **Resend** (ya en stack, mejor DX) | FASE 5 |
| 5 | Dominio personalizado | Por confirmar | TBD | FASE 6 |
| 6 | Idioma del sitio | Solo ES / ES + EN | **Solo ES en MVP**, multi-idioma en backlog | FASE 2 |
| 7 | Hosting de archivos en dev | Local filesystem / MinIO (S3-compatible) | **Local** (más simple para iterar) | FASE 0 |
| 8 | ORM migrations strategy | `prisma migrate dev` / `prisma db push` | **`migrate dev`** (versionado, rollback posible) | FASE 1 |
| 9 | Tests E2E en MVP | Playwright / Cypress / omitir | **Omitir en MVP**, tests unitarios de lógica crítica | FASE 6 |
| 10 | Pagos / cotizaciones | Stripe / MercadoPago / manual | **Manual en MVP** (vía WhatsApp), pasarela en backlog | Backlog |

---

## Anexo A — Versionado del documento

| Versión | Fecha | Autor | Cambios |
|---|---|---|---|
| 1.0 | 2026-08-20 | Agente coordinador (Mavis) | Creación inicial |
| 1.1 | 2026-08-20 | Agente coordinador (Mavis) | StorageProvider: `prefix: string` → `categorySlug` + `mosaicId` estructurados + método `buildKey()`. RateLimiter: añadidos `cleanup()` y `startAutoCleanup()`. |
| 1.2 | 2026-08-20 | Agente coordinador (Mavis) | **Sección 4 reemplazada**: NextAuth v5 descartado por incompatibilidad con Next 16 (rename `middleware.ts`→`proxy.ts`, runtime Node-only, Auth.js en security-patch mode). Adoptado `iron-session@8.0.4`. Shape de sesión y semántica de expiración se mantienen. Eliminado `NEXTAUTH_SECRET`/`NEXTAUTH_URL`, añadido `SESSION_PASSWORD`. |

> Cambios a este documento requieren:
> 1. Discusión en sesión con los 4 agentes
> 2. Actualización de versión y changelog
> 3. Comunicación explícita en el canal compartido
