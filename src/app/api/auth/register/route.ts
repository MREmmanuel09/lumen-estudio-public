// POST /api/auth/register
// Crea un nuevo usuario USER con email sin verificar y dispara email de verificación.

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateVerificationToken, normalizeEmail } from '@/lib/auth-utils';
import { sendVerificationEmail, sendWelcomeEmail } from '@/lib/email';
import { rateLimiter } from '@/lib/rate-limit';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { registerSchema } from '@/lib/schemas/auth';

export const POST = withApiHandler(async (req: NextRequest) => {
  // 1. Rate limit por IP: 10/h
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await rateLimiter.check(`register:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    throw new ApiError('RATE_LIMITED', 'Demasiados intentos, intenta más tarde', {
      retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000),
    });
  }

  // 2. Parse + validar body
  const body = await req.json().catch(() => ({}));
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Datos inválidos', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }
  const { name, email, password } = parsed.data;
  const normalizedEmail = normalizeEmail(email);

  // 3. Verificar email duplicado
  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    // Mensaje genérico para prevenir enumeración
    return ok({
      message: 'Si el email no está registrado, recibirás un correo de verificación.',
    });
  }

  // 4. Crear usuario
  const passwordHash = await hashPassword(password);
  await db.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role: 'USER',
    },
  });

  // 5. Generar token de verificación
  const { token, tokenHash, expires } = generateVerificationToken();
  await db.verificationToken.create({
    data: {
      identifier: normalizedEmail,
      token: tokenHash,
      expires,
    },
  });

  // 6. Enviar emails (best-effort, no fallan el registro si email falla)
  try {
    await sendWelcomeEmail(normalizedEmail, name);
    await sendVerificationEmail(normalizedEmail, name, token);
  } catch (err) {
    console.error('[register] Error enviando email:', err);
  }

  // 7. Incrementar contador de rate limit
  await rateLimiter.increment(`register:ip:${ip}`, 60 * 60 * 1000);

  return ok({
    message: 'Si el email no está registrado, recibirás un correo de verificación.',
  });
});
