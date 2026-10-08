// GET /api/services  — público (solo visibles, ordenados)
// POST /api/services — admin

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { requireAdmin } from '@/lib/session';
import { slugify } from '@/lib/auth-utils';
import { createServiceSchema, parseFeaturesText } from '@/lib/schemas/service';

export const GET = withApiHandler(async () => {
  const services = await db.service.findMany({
    where: { visible: true },
    orderBy: [{ order: 'asc' }, { title: 'asc' }],
  });
  return ok(services);
});

export const POST = withApiHandler(async (req: NextRequest) => {
  await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Datos inválidos', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;
  const slug = data.slug || slugify(data.title);
  if (!slug) {
    throw new ApiError('VALIDATION_ERROR', 'No se pudo generar un slug del título');
  }

  const existing = await db.service.findUnique({ where: { slug } });
  if (existing) {
    throw new ApiError('CONFLICT', `Ya existe un servicio con el slug "${slug}"`);
  }

  const service = await db.service.create({
    data: {
      title: data.title,
      slug,
      description: data.description ?? '',
      priceLabel: data.priceLabel || null,
      priceNote: data.priceNote || null,
      durationLabel: data.durationLabel || null,
      features: JSON.stringify(parseFeaturesText(data.featuresText ?? '')),
      icon: data.icon || null,
      image: data.image || null,
      order: data.order,
      visible: data.visible,
    },
  });

  return ok(service, { status: 201 });
});
