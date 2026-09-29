import { z } from 'zod';

/**
 * Defense-in-depth: aunque el admin renderiza el mensaje como texto plano,
 * pasamos el contenido por un escape de HTML antes de persistirlo. Si en el
 * futuro el render cambia a `dangerouslySetInnerHTML`, los mensajes viejos
 * siguen siendo seguros.
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede tener más de 100 caracteres')
    .transform(escapeHtml),
  email: z.string().trim().toLowerCase().email('Email inválido').max(254),
  subject: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? escapeHtml(v) : v)),
  message: z
    .string()
    .trim()
    .min(10, 'El mensaje debe tener al menos 10 caracteres')
    .max(1000, 'El mensaje no puede tener más de 1000 caracteres')
    .transform(escapeHtml),
  // Consentimiento RGPD: el frontend lo exige; el backend lo valida si viene.
  consent: z.literal(true).optional(),
  // Honeypot: campo oculto que humanos no llenan. Se acepta cualquier
  // valor para poder descartar en silencio en la ruta (sin delatar al bot
  // con un VALIDATION_ERROR).
  website: z.string().max(500).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
