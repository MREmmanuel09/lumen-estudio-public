// PUT /api/services/[id]    — admin
// DELETE /api/services/[id] — admin

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { requireAdmin } from '@/lib/session';
import { updateServiceSchema, parseFeaturesText } from '@/lib/schemas/service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PUT = withApiHandler(async (req: NextRequest, ctx: RouteContext) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const parsed = updateServiceSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Datos inválidos', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const existing = await db.service.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError('NOT_FOUND', 'Servicio no encontrado');
  }

  const data = parsed.data;

  // El slug se conserva salvo edición explícita (URLs estables)
  if (data.slug && data.slug !== existing.slug) {
    const slugTaken = await db.service.findUnique({ where: { slug: data.slug } });
    if (slugTaken) {
      throw new ApiError('CONFLICT', `Ya existe un servicio con el slug "${data.slug}"`);
    }
  }

  const updated = await db.service.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.description !== undefined ? { description: data.description ?? '' } : {}),
      ...(data.priceLabel !== undefined ? { priceLabel: data.priceLabel || null } : {}),
      ...(data.priceNote !== undefined ? { priceNote: data.priceNote || null } : {}),
      ...(data.durationLabel !== undefined
        ? { durationLabel: data.durationLabel || null }
        : {}),
      ...(data.featuresText !== undefined
        ? { features: JSON.stringify(parseFeaturesText(data.featuresText ?? '')) }
        : {}),
      ...(data.icon !== undefined ? { icon: data.icon || null } : {}),
      ...(data.image !== undefined ? { image: data.image || null } : {}),
      ...(data.order !== undefined ? { order: data.order } : {}),
      ...(data.visible !== undefined ? { visible: data.visible } : {}),
    },
  });

  return ok(updated);
});

export const DELETE = withApiHandler(async (_req: NextRequest, ctx: RouteContext) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const existing = await db.service.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError('NOT_FOUND', 'Servicio no encontrado');
  }

  await db.service.delete({ where: { id } });

  return ok({ success: true });
});
