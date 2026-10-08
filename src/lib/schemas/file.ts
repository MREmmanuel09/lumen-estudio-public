import { z } from 'zod';

export const fileTypeSchema = z.enum(['IMAGE', 'VIDEO']);

export const reorderFilesSchema = z.object({
  files: z
    .array(
      z.object({
        id: z.string().min(1),
        order: z.number().int().min(0),
      }),
    )
    .min(1, 'Se requiere al menos un archivo')
    .max(50, 'Máximo 50 archivos por operación'),
});

// Ficha técnica manual por foto (todo opcional; null borra el campo en PUT).
// Sin GPS por diseño: no existe columna para ubicación.
const exifBase = z.object({
  cameraMake: z.string().trim().max(40).nullable().optional(),
  cameraModel: z.string().trim().max(60).nullable().optional(),
  lensModel: z.string().trim().max(80).nullable().optional(),
  focalLength: z.number().min(1).max(2000).nullable().optional(),
  aperture: z.number().min(0.5).max(64).nullable().optional(),
  shutterSpeed: z.number().min(1 / 8000).max(3600).nullable().optional(),
  iso: z.number().int().min(1).max(102400).nullable().optional(),
  takenAt: z
    .string()
    .trim()
    .max(40)
    .refine(
      (s) => {
        const d = new Date(s);
        return !isNaN(d.getTime()) && d.getTime() <= Date.now() + 24 * 60 * 60 * 1000;
      },
      'Fecha inválida o futura',
    )
    .nullable()
    .optional(),
});

/** Ficha parcial para POST (campo `exif` JSON) y PUT /api/files/[id]. */
export const manualExifSchema = exifBase.strict();

export type FileTypeInput = z.infer<typeof fileTypeSchema>;
export type ReorderFilesInput = z.infer<typeof reorderFilesSchema>;
export type ManualExifInput = z.infer<typeof manualExifSchema>;
