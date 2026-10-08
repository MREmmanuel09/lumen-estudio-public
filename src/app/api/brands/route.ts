// GET /api/brands  — público (solo visibles, ordenadas)
// POST /api/brands — admin

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { requireAdmin } from '@/lib/session';
import { createBrandSchema } from '@/lib/schemas/brand';

export const GET = withApiHandler(async () => {
  const brands = await db.brand.findMany({
    where: { visible: true },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  });
  return ok(brands);
});

export const POST = withApiHandler(async (req: NextRequest) => {
  await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const parsed = createBrandSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Datos inválidos', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const { name, website, order, visible } = parsed.data;

  const existing = await db.brand.findUnique({ where: { name } });
  if (existing) {
    throw new ApiError('CONFLICT', `Ya existe la marca "${name}"`);
  }

  const brand = await db.brand.create({
    data: {
      name,
      website: website || null,
      order,
      visible,
    },
  });

  return ok(brand, { status: 201 });
});
