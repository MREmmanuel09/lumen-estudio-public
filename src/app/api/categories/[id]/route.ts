// PUT /api/categories/[id]    — admin
// DELETE /api/categories/[id] — admin

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { requireAdmin } from '@/lib/session';
import { getStorage } from '@/lib/storage';
import { updateCategorySchema } from '@/lib/schemas/category';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PUT = withApiHandler(async (req: NextRequest, ctx: RouteContext) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Datos inválidos', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const existing = await db.galleryCategory.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError('NOT_FOUND', 'Categoría no encontrada');
  }

  // Si cambia el slug, validar unicidad
  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const slugTaken = await db.galleryCategory.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (slugTaken) {
      throw new ApiError('CONFLICT', `Ya existe una categoría con el slug "${parsed.data.slug}"`);
    }
  }

  const updated = await db.galleryCategory.update({
    where: { id },
    data: parsed.data,
  });

  return ok(updated);
});

export const DELETE = withApiHandler(async (_req: NextRequest, ctx: RouteContext) => {
  await requireAdmin();
  const { id } = await ctx.params;

  // 1. Obtener todos los archivos de los mosaicos de esta categoría
  const mosaics = await db.galleryMosaic.findMany({
    where: { categoryId: id },
    include: { files: true },
  });
  const fileKeys = mosaics.flatMap((m) => m.files.map((f) => f.key));

  // 2. Eliminar registros en transacción (cascade borra mosaicos y files)
  await db.galleryCategory.delete({ where: { id } });

  // 3. Eliminar archivos físicos del storage (best-effort, no bloquea)
  const storage = getStorage();
  await Promise.allSettled(fileKeys.map((k) => storage.delete(k)));

  return ok({ success: true });
});
