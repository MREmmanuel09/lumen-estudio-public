import { z } from 'zod';

// Igual que categorías: solo https (o vacío) para evitar javascript:/data:.
const httpsUrl = z
  .string()
  .trim()
  .url('URL inválida')
  .refine((url) => url.startsWith('https://'), 'La web debe empezar con https://');

export const createBrandSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(60),
  website: httpsUrl.optional().or(z.literal('')),
  order: z.coerce.number().int().min(0).max(1000).default(0),
  visible: z.boolean().default(true),
});

export const updateBrandSchema = createBrandSchema.partial();

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
