// PUT /api/files/reorder — admin
// Body: { files: [{ id, order }, ...] }

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { requireAdmin } from '@/lib/session';
import { reorderFilesSchema } from '@/lib/schemas/file';

export const PUT = withApiHandler(async (req: NextRequest) => {
  await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const parsed = reorderFilesSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Datos inválidos', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const fileIds = parsed.data.files.map((f) => f.id);
  const files = await db.file.findMany({ where: { id: { in: fileIds } } });

  if (files.length !== fileIds.length) {
    throw new ApiError('NOT_FOUND', 'Uno o más archivos no existen');
  }

  // Verificar que todos pertenecen al mismo mosaico
  const mosaicIds = new Set(files.map((f) => f.mosaicId));
  if (mosaicIds.size > 1) {
    throw new ApiError('VALIDATION_ERROR', 'Todos los archivos deben pertenecer al mismo mosaico');
  }

  // Actualizar en transacción
  await db.$transaction(
    parsed.data.files.map((f) =>
      db.file.update({
        where: { id: f.id },
        data: { order: f.order },
      }),
    ),
  );

  return ok({ success: true, updated: parsed.data.files.length });
});
