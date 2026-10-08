// POST /api/auth/forgot-password
// Genera token de recuperación. Siempre retorna éxito (previene enumeración).

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { generateVerificationToken, normalizeEmail } from '@/lib/auth-utils';
import { sendPasswordResetEmail } from '@/lib/email';
import { rateLimiter } from '@/lib/rate-limit';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { forgotPasswordSchema } from '@/lib/schemas/auth';

export const POST = withApiHandler(async (req: NextRequest) => {
  // 1. Rate limit por IP: 3/h
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await rateLimiter.check(`forgot:ip:${ip}`, 3, 60 * 60 * 1000);
  if (!rl.allowed) {
    throw new ApiError('RATE_LIMITED', 'Demasiados intentos, intenta más tarde', {
      retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000),
    });
  }

  // 2. Parse + validar
  const body = await req.json().catch(() => ({}));
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Email inválido', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }
  const normalizedEmail = normalizeEmail(parsed.data.email);

  // 3. Incrementar rate limit (solo después de validar formato)
  await rateLimiter.increment(`forgot:ip:${ip}`, 60 * 60 * 1000);

  // 4. Buscar usuario (silencioso si no existe)
  const user = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    return ok({
      message: 'Si el email está registrado, recibirás un enlace de recuperación.',
    });
  }

  // 5. Invalidar tokens previos del mismo identifier
  await db.verificationToken.deleteMany({
    where: { identifier: normalizedEmail },
  });

  // 6. Generar nuevo token
  const { token, tokenHash, expires } = generateVerificationToken();
  await db.verificationToken.create({
    data: {
      identifier: normalizedEmail,
      token: tokenHash,
      expires,
    },
  });

  // 7. Enviar email (best-effort)
  try {
    await sendPasswordResetEmail(normalizedEmail, user.name ?? 'Hola', token);
  } catch (err) {
    console.error('[forgot-password] Error enviando email:', err);
  }

  return ok({
    message: 'Si el email está registrado, recibirás un enlace de recuperación.',
  });
});
