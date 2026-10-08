import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

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

export const createMosaicSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(200),
  description: sanitizedDescription,
  categoryId: z.string().min(1, 'La categoría es obligatoria'),
});

export const updateMosaicSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: sanitizedDescription,
  categoryId: z.string().min(1).optional(),
  coverFileId: z.string().min(1).nullable().optional(),
});

export type CreateMosaicInput = z.infer<typeof createMosaicSchema>;
export type UpdateMosaicInput = z.infer<typeof updateMosaicSchema>;
