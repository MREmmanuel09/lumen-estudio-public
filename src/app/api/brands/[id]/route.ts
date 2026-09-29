// PUT /api/brands/[id]    — admin
// DELETE /api/brands/[id] — admin

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { requireAdmin } from '@/lib/session';
import { updateBrandSchema } from '@/lib/schemas/brand';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PUT = withApiHandler(async (req: NextRequest, ctx: RouteContext) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const parsed = updateBrandSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Datos inválidos', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const existing = await db.brand.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError('NOT_FOUND', 'Marca no encontrada');
  }

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const nameTaken = await db.brand.findUnique({ where: { name: parsed.data.name } });
    if (nameTaken) {
      throw new ApiError('CONFLICT', `Ya existe la marca "${parsed.data.name}"`);
    }
  }

  const { website, ...rest } = parsed.data;
  const updated = await db.brand.update({
    where: { id },
    data: {
      ...rest,
      ...(website !== undefined ? { website: website || null } : {}),
    },
  });

  return ok(updated);
});

export const DELETE = withApiHandler(async (_req: NextRequest, ctx: RouteContext) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const existing = await db.brand.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError('NOT_FOUND', 'Marca no encontrada');
  }

  await db.brand.delete({ where: { id } });

  return ok({ success: true });
});
