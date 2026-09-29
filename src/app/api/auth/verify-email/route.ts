// GET /api/auth/verify-email?token=...
// Valida el token y marca emailVerified. Rate limit por IP para mitigar
// fuerza bruta sobre el espacio de tokens.

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { hashToken } from '@/lib/auth-utils';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { verifyEmailSchema } from '@/lib/schemas/auth';
import { rateLimiter } from '@/lib/rate-limit';

export const GET = withApiHandler(async (req: NextRequest) => {
  // 1. Rate limit por IP: 10/h (los usuarios solo lo llaman 1 vez por click)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await rateLimiter.check(`verify:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    throw new ApiError('RATE_LIMITED', 'Demasiados intentos, intenta más tarde', {
      retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000),
    });
  }

  const token = req.nextUrl.searchParams.get('token');
  const parsed = verifyEmailSchema.safeParse({ token });
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Token inválido');
  }

  const tokenHash = hashToken(parsed.data.token);

  // 1. Buscar token en BD
  const record = await db.verificationToken.findUnique({
    where: { token: tokenHash },
  });

  if (!record) {
    throw new ApiError('NOT_FOUND', 'Token inválido o ya utilizado');
  }

  if (record.expires < new Date()) {
    await db.verificationToken.delete({ where: { token: tokenHash } });
    throw new ApiError('NOT_FOUND', 'El token ha expirado');
  }

  // 2. Marcar email como verificado
  await db.user.updateMany({
    where: { email: record.identifier },
    data: { emailVerified: new Date() },
  });

  // 3. Eliminar el token (single-use)
  await db.verificationToken.delete({ where: { token: tokenHash } });

  return ok({ message: 'Email verificado correctamente' });
});
