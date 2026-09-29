// PUT /api/messages/[id]    — admin (marcar leído / no leído)
// DELETE /api/messages/[id] — admin

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { requireAdmin } from '@/lib/session';
import { z } from 'zod';

const updateMessageSchema = z.object({
  read: z.boolean(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PUT = withApiHandler(async (req: NextRequest, ctx: RouteContext) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const parsed = updateMessageSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Datos inválidos');
  }

  const existing = await db.message.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError('NOT_FOUND', 'Mensaje no encontrado');
  }

  const updated = await db.message.update({
    where: { id },
    data: { read: parsed.data.read },
  });

  return ok(updated);
});

export const DELETE = withApiHandler(async (_req: NextRequest, ctx: RouteContext) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;

  const existing = await db.message.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError('NOT_FOUND', 'Mensaje no encontrado');
  }

  await db.message.delete({ where: { id } });

  console.info(`[admin] Mensaje eliminado por ${admin.email}:`, { id });

  return ok({ success: true });
});
