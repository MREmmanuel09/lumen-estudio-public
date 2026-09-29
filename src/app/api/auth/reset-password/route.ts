// POST /api/auth/reset-password
// Valida token y actualiza password. Rate limit por IP para mitigar fuerza
// bruta sobre el espacio de tokens (32 bytes base64url ≈ 2^256 bits, pero el
// rate limit cierra el vector de "muchos tokens distintos" o tokens reusados).

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, hashToken, validatePasswordStrength } from '@/lib/auth-utils';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { resetPasswordSchema } from '@/lib/schemas/auth';
import { rateLimiter } from '@/lib/rate-limit';

export const POST = withApiHandler(async (req: NextRequest) => {
  // 1. Rate limit por IP: 10/h (bloquea fuerza bruta + abuso)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await rateLimiter.check(`reset:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    throw new ApiError('RATE_LIMITED', 'Demasiados intentos, intenta más tarde', {
      retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000),
    });
  }

  // 2. Parse + validar
  const body = await req.json().catch(() => ({}));
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Datos inválidos', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }
  const { token, password } = parsed.data;

  // 2. Validar fortaleza de password
  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    throw new ApiError('VALIDATION_ERROR', 'Contraseña débil', {
      fields: { password: strength.errors },
    });
  }

  // 3. Buscar token
  const tokenHash = hashToken(token);
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

  // 4. Actualizar password
  const passwordHash = await hashPassword(password);
  await db.user.updateMany({
    where: { email: record.identifier },
    data: { passwordHash },
  });

  // 5. Eliminar el token (single-use)
  await db.verificationToken.delete({ where: { token: tokenHash } });

  // 6. Resetear rate limit (operación exitosa)
  await rateLimiter.reset(`reset:ip:${ip}`);

  return ok({ message: 'Contraseña actualizada. Ya podés iniciar sesión.' });
});
