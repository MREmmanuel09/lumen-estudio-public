// PUT /api/files/[id]    — admin (editar ficha técnica EXIF por foto)
// DELETE /api/files/[id] — admin

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { requireAdmin } from '@/lib/session';
import { getStorage } from '@/lib/storage';
import { manualExifSchema } from '@/lib/schemas/file';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PUT = withApiHandler(async (req: NextRequest, ctx: RouteContext) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const parsed = manualExifSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Ficha técnica inválida', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const file = await db.file.findUnique({ where: { id } });
  if (!file) {
    throw new ApiError('NOT_FOUND', 'Archivo no encontrado');
  }
  if (file.type !== 'IMAGE') {
    throw new ApiError('VALIDATION_ERROR', 'La ficha técnica es solo para imágenes');
  }

  const data = parsed.data;
  const updated = await db.file.update({
    where: { id },
    data: {
      ...(data.cameraMake !== undefined
        ? { cameraMake: data.cameraMake && data.cameraMake.trim() ? data.cameraMake : null }
        : {}),
      ...(data.cameraModel !== undefined
        ? { cameraModel: data.cameraModel && data.cameraModel.trim() ? data.cameraModel : null }
        : {}),
      ...(data.lensModel !== undefined
        ? { lensModel: data.lensModel && data.lensModel.trim() ? data.lensModel : null }
        : {}),
      ...(data.focalLength !== undefined ? { focalLength: data.focalLength } : {}),
      ...(data.aperture !== undefined ? { aperture: data.aperture } : {}),
      ...(data.shutterSpeed !== undefined ? { shutterSpeed: data.shutterSpeed } : {}),
      ...(data.iso !== undefined
        ? { iso: data.iso !== null ? Math.round(data.iso) : null }
        : {}),
      ...(data.takenAt !== undefined
        ? { takenAt: data.takenAt && data.takenAt !== '' ? new Date(data.takenAt) : null }
        : {}),
    },
  });

  return ok(updated);
});

export const DELETE = withApiHandler(async (_req: NextRequest, ctx: RouteContext) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const file = await db.file.findUnique({ where: { id } });
  if (!file) {
    throw new ApiError('NOT_FOUND', 'Archivo no encontrado');
  }

  // 1. Eliminar registro (BD)
  await db.file.delete({ where: { id } });

  // 2. Eliminar del storage (best-effort)
  const storage = getStorage();
  await storage.delete(file.key).catch(() => {});

  // 3. Si era el cover, limpiar referencia del mosaico
  if (file.mosaicId) {
    await db.galleryMosaic.updateMany({
      where: { id: file.mosaicId, coverFileId: id },
      data: { coverFileId: null },
    });
  }

  return ok({ success: true });
});
