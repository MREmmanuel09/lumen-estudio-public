// PUT /api/users/[id]    — admin: cambia rol
// DELETE /api/users/[id] — admin: elimina usuario

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { requireAdmin } from '@/lib/session';

const updateUserSchema = z.object({
  role: z.enum(['USER', 'ADMIN']).optional(),
  name: z.string().trim().min(2).max(100).optional(),
});

// Email del admin principal — protegido contra eliminación/degradación
const PROTECTED_ADMIN_EMAIL = 'admin@example.com';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PUT = withApiHandler(async (req: NextRequest, ctx: RouteContext) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Datos inválidos');
  }

  const target = await db.user.findUnique({ where: { id } });
  if (!target) {
    throw new ApiError('NOT_FOUND', 'Usuario no encontrado');
  }

  // No permitir degradar al admin principal
  if (
    target.email === PROTECTED_ADMIN_EMAIL &&
    parsed.data.role &&
    parsed.data.role !== 'ADMIN'
  ) {
    throw new ApiError(
      'FORBIDDEN',
      'No se puede cambiar el rol del administrador principal',
    );
  }

  const updated = await db.user.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  console.info(`[admin] Usuario actualizado por ${admin.email}:`, {
    id: updated.id,
    changes: parsed.data,
  });

  return ok(updated);
});

export const DELETE = withApiHandler(async (_req: NextRequest, ctx: RouteContext) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;

  // No permitir eliminarse a sí mismo
  if (id === admin.id) {
    throw new ApiError('FORBIDDEN', 'No podés eliminar tu propia cuenta');
  }

  const target = await db.user.findUnique({ where: { id } });
  if (!target) {
    throw new ApiError('NOT_FOUND', 'Usuario no encontrado');
  }

  // No permitir eliminar al admin principal
  if (target.email === PROTECTED_ADMIN_EMAIL) {
    throw new ApiError(
      'FORBIDDEN',
      'No se puede eliminar al administrador principal',
    );
  }

  await db.user.delete({ where: { id } });

  console.info(`[admin] Usuario eliminado por ${admin.email}:`, {
    id: target.id,
    email: target.email,
  });

  return ok({ success: true });
});
