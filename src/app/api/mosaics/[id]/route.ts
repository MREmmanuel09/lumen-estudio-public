// PUT /api/mosaics/[id]    — admin
// DELETE /api/mosaics/[id] — admin

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { requireAdmin } from '@/lib/session';
import { getStorage } from '@/lib/storage';
import { updateMosaicSchema } from '@/lib/schemas/mosaic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PUT = withApiHandler(async (req: NextRequest, ctx: RouteContext) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const parsed = updateMosaicSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Datos inválidos', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const existing = await db.galleryMosaic.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError('NOT_FOUND', 'Mosaico no encontrado');
  }

  // Si se cambia categoryId, verificar que existe
  if (parsed.data.categoryId && parsed.data.categoryId !== existing.categoryId) {
    const category = await db.galleryCategory.findUnique({
      where: { id: parsed.data.categoryId },
    });
    if (!category) {
      throw new ApiError('NOT_FOUND', 'La categoría destino no existe');
    }
  }

  // Si se cambia coverFileId, verificar que pertenece al mosaico
  if (parsed.data.coverFileId && parsed.data.coverFileId !== existing.coverFileId) {
    const file = await db.file.findUnique({ where: { id: parsed.data.coverFileId } });
    if (!file || file.mosaicId !== id) {
      throw new ApiError('VALIDATION_ERROR', 'El archivo de portada no pertenece a este mosaico');
    }
  }

  const updated = await db.galleryMosaic.update({
    where: { id },
    data: parsed.data,
    include: { files: { orderBy: { order: 'asc' } }, category: true },
  });

  return ok(updated);
});

export const DELETE = withApiHandler(async (_req: NextRequest, ctx: RouteContext) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const mosaic = await db.galleryMosaic.findUnique({
    where: { id },
    include: { files: true },
  });
  if (!mosaic) {
    throw new ApiError('NOT_FOUND', 'Mosaico no encontrado');
  }

  const fileKeys = mosaic.files.map((f) => f.key);

  // Eliminar registros en transacción (cascade borra files)
  await db.galleryMosaic.delete({ where: { id } });

  // Eliminar archivos físicos (best-effort)
  const storage = getStorage();
  await Promise.allSettled(fileKeys.map((k) => storage.delete(k)));

  return ok({ success: true });
});
