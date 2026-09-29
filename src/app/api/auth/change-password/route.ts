// POST /api/auth/change-password
// Cambia la contraseña de la sesión actual. Requiere la contraseña actual
// (defensa si el usuario dejó la sesión abierta en un equipo ajeno).

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth-utils';
import { requireUser } from '@/lib/session';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { changePasswordSchema } from '@/lib/schemas/auth';
import { rateLimiter } from '@/lib/rate-limit';

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora

export const POST = withApiHandler(async (req: NextRequest) => {
  // 1. Sesión requerida
  const user = await requireUser();

  // 2. Rate limit por usuario: 10/h (bloquea prueba de contraseña actual)
  const key = `changepw:user:${user.id}`;
  const rl = await rateLimiter.check(key, MAX_ATTEMPTS, WINDOW_MS);
  if (!rl.allowed) {
    throw new ApiError('RATE_LIMITED', 'Demasiados intentos, intenta más tarde', {
      retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000),
    });
  }

  // 3. Parse + validar (incluye fortaleza de la nueva contraseña)
  const body = await req.json().catch(() => ({}));
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Datos inválidos', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }
  const { currentPassword, newPassword } = parsed.data;

  // 4. Buscar usuario (la sesión puede haberse emitido antes de un cambio)
  const record = await db.user.findUnique({ where: { id: user.id } });
  if (!record || !record.passwordHash) {
    throw new ApiError('AUTH_INVALID', 'Esta cuenta no tiene contraseña asociada');
  }

  // 5. Verificar contraseña actual
  const valid = await verifyPassword(currentPassword, record.passwordHash);
  if (!valid) {
    await rateLimiter.increment(key, WINDOW_MS);
    throw new ApiError('AUTH_INVALID', 'La contraseña actual es incorrecta');
  }

  // 6. Actualizar hash
  const passwordHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id: record.id },
    data: { passwordHash },
  });

  // 7. Resetear rate limit (operación exitosa)
  await rateLimiter.reset(key);

  return ok({ message: 'Contraseña actualizada.' });
});
