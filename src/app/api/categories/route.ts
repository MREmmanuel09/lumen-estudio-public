// GET /api/categories  — público
// POST /api/categories — admin

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { requireAdmin } from '@/lib/session';
import { slugify } from '@/lib/auth-utils';
import { createCategorySchema } from '@/lib/schemas/category';

export const GET = withApiHandler(async () => {
  const categories = await db.galleryCategory.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { mosaics: true } } },
  });
  return ok(categories);
});

export const POST = withApiHandler(async (req: NextRequest) => {
  await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Datos inválidos', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const { name, slug: providedSlug, description, coverImage } = parsed.data;
  const slug = providedSlug ?? slugify(name);

  // Validar unicidad del slug
  const existing = await db.galleryCategory.findUnique({ where: { slug } });
  if (existing) {
    throw new ApiError('CONFLICT', `Ya existe una categoría con el slug "${slug}"`);
  }

  const category = await db.galleryCategory.create({
    data: {
      name,
      slug,
      description: description ?? '',
      coverImage: coverImage || null,
    },
  });

  return ok(category, { status: 201 });
});
