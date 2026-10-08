import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

// Igual que mosaicos: HTML limitado y sanitizado (se renderiza en el detalle).
const sanitizedDescription = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((val) => {
    if (!val) return undefined;
    return sanitizeHtml(val, {
      allowedTags: ['p', 'br', 'strong', 'em', 'a'],
      allowedAttributes: { a: ['href', 'rel', 'target'] },
      allowedSchemes: ['https', 'mailto'],
      transformTags: {
        a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
      },
    });
  });

/** Iconos permitidos (lista cerrada: imposible romper la UI con texto libre). */
export const SERVICE_ICONS = [
  'Heart',
  'Shirt',
  'User',
  'Package',
  'Building2',
  'Camera',
  'Sparkles',
  'Image',
  'Video',
  'Palette',
  'Briefcase',
  'Gift',
] as const;

export const serviceIconSchema = z.enum(SERVICE_ICONS);

// Igual que categorías: coverImage acepta solo orígenes whitelisted (los
// mismos que `images.remotePatterns` en next.config.ts) o /uploads/*. Esto
// cierra el vector de "admin pone URL HTTPS apuntando a server externo
// controlado por atacante que sirve contenido malicioso re-hosteado".
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

/** Features como texto uno-por-línea (el admin lo edita así; se guarda JSON). */
export const featuresTextSchema = z
  .string()
  .trim()
  .max(2000, 'Máximo 2000 caracteres en total')
  .optional()
  .or(z.literal(''));

export function parseFeaturesText(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim().replace(/^[-•*]\s*/, ''))
    .filter(Boolean)
    .slice(0, 20);
}

export const createServiceSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(100),
  slug: z
    .string()
    .trim()
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones')
    .optional(),
  description: sanitizedDescription.or(z.literal('')),
  priceLabel: z.string().trim().max(60).optional().or(z.literal('')),
  priceNote: z.string().trim().max(60).optional().or(z.literal('')),
  durationLabel: z.string().trim().max(120).optional().or(z.literal('')),
  featuresText: featuresTextSchema,
  icon: serviceIconSchema.optional().or(z.literal('')),
  image: safeImageUrl.optional().or(z.literal('')),
  order: z.coerce.number().int().min(0).max(1000).default(0),
  visible: z.boolean().default(true),
});

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
