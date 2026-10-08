# API Reference — LUMEN Estudio

> Contrato de endpoints. Para detalles del shape de respuesta, ver `CONTRATOS_TECNICOS.md` §3.

Todas las respuestas siguen el shape:

```json
{ "success": true, "data": ... }
{ "success": false, "error": { "code": "...", "message": "...", "details": {} } }
```

Los endpoints marcados con 🔒 requieren sesión con rol `ADMIN`.

---

## Tabla de contenidos

1. [Autenticación](#autenticación)
2. [Categorías](#categorías)
3. [Mosaicos](#mosaicos)
4. [Archivos](#archivos)
5. [Contacto](#contacto)
6. [Marcas](#marcas)
7. [Servicios](#servicios)
8. [Mensajes (admin)](#mensajes-admin)
9. [Usuarios (admin)](#usuarios-admin)
10. [Códigos de error](#códigos-de-error)

---

## Autenticación

| Método | Path | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Registro con email + password |
| `POST` | `/api/auth/login` | — | Login (rate limit 5/15min por email) |
| `POST` | `/api/auth/logout` | sesión | Destruye la sesión |
| `GET` | `/api/auth/session` | — | Devuelve sesión actual o `{ user: null }` |
| `GET` | `/api/auth/verify-email?token=...` | — | Verifica email con token |
| `POST` | `/api/auth/forgot-password` | — | Solicita recuperación (rate limit 3/h por IP) |
| `POST` | `/api/auth/reset-password` | — | Resetea con token + nueva password |

---

## Categorías

| Método | Path | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/categories` | — | Lista categorías con `mosaicsCount` |
| `POST` | `/api/categories` | 🔒 ADMIN | Crea categoría (slug auto si no se provee) |
| `PUT` | `/api/categories/[id]` | 🔒 ADMIN | Edita nombre/slug/coverImage |
| `DELETE` | `/api/categories/[id]` | 🔒 ADMIN | Cascade: borra mosaicos, files en BD y storage físico |

**Body para crear/editar:**
```json
{
  "name": "Moda Editorial",
  "slug": "moda-editorial",  // opcional, se autogenera
  "coverImage": "https://..."  // opcional
}
```

---

## Mosaicos

| Método | Path | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/mosaics?categorySlug=xxx` | — | Lista mosaicos. Filtra por `categoryId` o `categorySlug` |
| `POST` | `/api/mosaics` | 🔒 ADMIN | Crea mosaico |
| `PUT` | `/api/mosaics/[id]` | 🔒 ADMIN | Edita título/descripción/categoría/cover |
| `DELETE` | `/api/mosaics/[id]` | 🔒 ADMIN | Cascade: borra files en BD y storage físico |

**Body para crear:**
```json
{
  "title": "Sesión Primavera",
  "description": "<p>HTML sanitizado...</p>",
  "categoryId": "clx..."
}
```

**Límites por mosaico** (validados en `POST /api/files`):
- Mínimo 4 imágenes, máximo 8
- Mínimo 2 videos, máximo 4
- Total: 4-12 archivos

---

## Archivos

| Método | Path | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/files` | 🔒 ADMIN | Sube archivo (multipart/form-data) |
| `DELETE` | `/api/files/[id]` | 🔒 ADMIN | Borra archivo (BD + storage) |
| `PUT` | `/api/files/reorder` | 🔒 ADMIN | Reordena archivos de un mosaico |

**Subida de archivo (multipart/form-data):**
- `file`: el archivo (File)
- `mosaicId`: ID del mosaico destino
- `type`: `IMAGE` o `VIDEO`

**Validaciones automáticas:**
- MIME real detectado por magic bytes (`file-type`)
- Tamaño: imagen ≤5MB, video ≤20MB
- Imágenes: lado más corto ≥800px, lado más largo ≤8000px
- Límites por mosaico (ver arriba)

**EXIF fotográfico (solo imágenes):**
- Al subir se extrae con `exifr`: cámara, lente, focal, apertura, velocidad,
  ISO, fecha de captura + dimensiones. Se muestra como ficha artística
  (`85 mm · ƒ/1.8 · 1/250 · ISO 100`) en galería, lightbox y panel.
- **GPS nunca se lee ni se guarda** (privacidad).

**Reordenar:**
```json
{
  "files": [
    { "id": "clx...", "order": 0 },
    { "id": "clx...", "order": 1 }
  ]
}
```

---

## Contacto

| Método | Path | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/contact` | — | Envía mensaje (rate limit 5/h por IP) |

**Body:**
```json
{
  "name": "string (2-100)",
  "email": "email válido",
  "subject": "string opcional (max 200)",
  "message": "string (10-1000)",
  "website": ""  // honeypot, siempre vacío
}
```

Si `website` tiene contenido → respuesta 200 simulada, mensaje descartado.

---

## Marcas

Marquee "Han confiado en nosotros" de la home. El `GET` público devuelve solo
las visibles (ordenadas por `order`); si no hay ninguna, la sección se oculta.

| Método | Path | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/brands` | — | Lista marcas visibles |
| `POST` | `/api/brands` | 🔒 ADMIN | Crea marca |
| `PUT` | `/api/brands/[id]` | 🔒 ADMIN | Edita u oculta/muestra (`visible`) |
| `DELETE` | `/api/brands/[id]` | 🔒 ADMIN | Elimina marca |

**Body para crear/editar:**
```json
{
  "name": "NIKE",
  "website": "https://www.nike.com",
  "order": 0,
  "visible": true
}
```

**Restricciones:**
- `name` único (409 si se repite).
- `website` opcional, solo `https://` (con enlace en el Marquee si existe).

---

## Servicios

Sección Servicios de la home + páginas `/servicios/[slug]`. El `GET` público
devuelve solo los visibles (ordenados por `order`); sin visibles, la sección
se oculta.

| Método | Path | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/services` | — | Lista servicios visibles |
| `POST` | `/api/services` | 🔒 ADMIN | Crea servicio (slug auto) |
| `PUT` | `/api/services/[id]` | 🔒 ADMIN | Edita u oculta/muestra (`visible`) |
| `DELETE` | `/api/services/[id]` | 🔒 ADMIN | Elimina servicio (+ su detalle) |

**Body para crear/editar:**
```json
{
  "title": "Bodas & Eventos",
  "slug": "bodas-eventos",
  "description": "<p>Cobertura completa...</p>",
  "priceLabel": "Desde Q 8,500",
  "priceNote": "por jornada",
  "durationLabel": "Entrega en 48h",
  "featuresText": "Álbum de autor\nEntrega digital",
  "icon": "Heart",
  "image": "https://...",
  "order": 0,
  "visible": true
}
```

**Restricciones:**
- `slug` único (409 si se repite); se conserva al renombrar salvo edición explícita.
- `icon` de lista cerrada (`Heart`, `Shirt`, `User`, `Package`, `Building2`,
  `Camera`, `Sparkles`, `Image`, `Video`, `Palette`, `Briefcase`, `Gift`).
- `image` solo `https://` o `/uploads/...`; `description` con HTML sanitizado.

---

## Mensajes (admin)

| Método | Path | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/messages?unreadOnly=true` | 🔒 ADMIN | Lista mensajes, con conteo de no leídos |
| `PUT` | `/api/messages/[id]` | 🔒 ADMIN | Marca leído/no leído |
| `DELETE` | `/api/messages/[id]` | 🔒 ADMIN | Elimina mensaje |

**Body para marcar:**
```json
{ "read": true }
```

---

## Usuarios (admin)

| Método | Path | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/users` | 🔒 ADMIN | Lista usuarios |
| `POST` | `/api/users` | 🔒 ADMIN | Crea un usuario (típicamente admin) |
| `PUT` | `/api/users/[id]` | 🔒 ADMIN | Cambia rol o nombre |
| `DELETE` | `/api/users/[id]` | 🔒 ADMIN | Elimina usuario |

**Body para crear:**
```json
{
  "name": "Nuevo Admin",
  "email": "admin2@example.com",
  "password": "TempPass123!",
  "role": "ADMIN"
}
```

**Restricciones:**
- El email `admin@example.com` (admin principal del seed) está protegido contra eliminación y degradación.
- No podés eliminar tu propia cuenta.

---

## Códigos de error

| Código | HTTP | Cuándo |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod falló o input inválido |
| `AUTH_INVALID` | 401 | Credenciales incorrectas |
| `AUTH_REQUIRED` | 401 | Sin sesión para endpoint protegido |
| `FORBIDDEN` | 403 | Sesión existe pero sin permisos |
| `NOT_FOUND` | 404 | Recurso no existe |
| `CONFLICT` | 409 | Slug/email duplicado |
| `RATE_LIMITED` | 429 | Rate limit excedido (con `Retry-After`) |
| `PAYLOAD_TOO_LARGE` | 413 | Archivo >límite |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | MIME no permitido |
| `INTERNAL_ERROR` | 500 | Error no controlado |

---

## Variables de entorno relevantes

| Var | Descripción |
|---|---|
| `NEXT_PUBLIC_APP_URL` | URL pública canónica (links de emails, metadata). NO usar para fetch interno |
| `INTERNAL_APP_URL` | URL absoluta usada por server components para fetch interno (default `http://localhost:3000`) |
| `SESSION_PASSWORD` | ≥32 chars, encripta cookies iron-session |
| `UPLOADS_DIR` | Default `public/uploads` |
| `STORAGE_PROVIDER` | Default `local` (futuro: `s3`, `cloudinary`) |
| `DATABASE_URL` | PostgreSQL connection string |
