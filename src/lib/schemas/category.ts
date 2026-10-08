import { z } from 'zod';

/**
 * P0: coverImage acepta solo orígenes confiables para evitar que un admin
 * (o un XSS en su sesión) inyecte una URL HTTPS apuntando a un server
 * externo controlado por un atacante que sirva contenido malicioso.
 * - /uploads/* : uploads propios servidos por Next/standalone
 * - Dominios whitelisted: mismos que `images.remotePatterns` en next.config.ts
 *   (next/image los re-optimiza; sin whitelist, Next las rechaza igual).
 */
const ALLOWED_IMAGE_HOSTS = [
  'images.unsplash.com',
  'commondatastorage.googleapis.com',
  'picsum.photos',
  'res.cloudinary.com',
] as const;

const safeImageUrl = z
  .string()
  .trim()
  .max(2048, 'URL demasiado larga')
  .refine(
    (raw) => {
      if (raw.startsWith('/uploads/')) return true;
      try {
        const url = new URL(raw);
        if (url.protocol !== 'https:') return false;
        return ALLOWED_IMAGE_HOSTS.includes(url.hostname as (typeof ALLOWED_IMAGE_HOSTS)[number]);
      } catch {
        return false;
      }
    },
    'Solo imágenes propias (/uploads/...) o de orígenes whitelisted (Unsplash, Google Cloud Storage, Picsum, Cloudinary).',
  );

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  slug: z
    .string()
    .trim()
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones')
    .optional(),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  coverImage: safeImageUrl.optional().or(z.literal('')),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
