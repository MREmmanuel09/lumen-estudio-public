// GET /api/mosaics  — público (filtra por ?categoryId o ?categorySlug)
// POST /api/mosaics — admin

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { requireAdmin } from '@/lib/session';
import { createMosaicSchema } from '@/lib/schemas/mosaic';

export const GET = withApiHandler(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const categoryId = searchParams.get('categoryId');
  const categorySlug = searchParams.get('categorySlug');

  let where: { categoryId?: string; category?: { slug: string } } = {};
  if (categoryId) where = { categoryId };
  else if (categorySlug) where = { category: { slug: categorySlug } };

  const mosaics = await db.galleryMosaic.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      files: { orderBy: { order: 'asc' } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  return ok(mosaics);
});

export const POST = withApiHandler(async (req: NextRequest) => {
  await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const parsed = createMosaicSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Datos inválidos', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  // Verificar que la categoría existe
  const category = await db.galleryCategory.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category) {
    throw new ApiError('NOT_FOUND', 'La categoría no existe');
  }

  const mosaic = await db.galleryMosaic.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      categoryId: parsed.data.categoryId,
    },
    include: { files: true, category: true },
  });

  return ok(mosaic, { status: 201 });
});
