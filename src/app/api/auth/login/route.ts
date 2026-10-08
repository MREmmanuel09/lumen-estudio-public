// POST /api/auth/login
// Autentica con email + password, setea sesión, rate limit tras 5 fallos.

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, normalizeEmail } from '@/lib/auth-utils';
import { setSession } from '@/lib/session';
import { rateLimiter } from '@/lib/rate-limit';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { loginSchema } from '@/lib/schemas/auth';
import { sendLoginNotification } from '@/lib/email';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 min

export const POST = withApiHandler(async (req: NextRequest) => {
  // 1. Parse + validar body
  const body = await req.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Datos inválidos', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }
  const { email, password } = parsed.data;
  const normalizedEmail = normalizeEmail(email);

  // 2. Rate limit por email: 5 fallos en 15 min
  const rl = await rateLimiter.check(
    `login:email:${normalizedEmail}`,
    MAX_FAILED_ATTEMPTS,
    LOCKOUT_WINDOW_MS,
  );
  if (!rl.allowed) {
    throw new ApiError(
      'RATE_LIMITED',
      'Cuenta bloqueada por demasiados intentos fallidos. Intenta en 15 minutos.',
      { retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
    );
  }

  // 3. Buscar usuario
  const user = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !user.passwordHash) {
    await rateLimiter.increment(`login:email:${normalizedEmail}`, LOCKOUT_WINDOW_MS);
    throw new ApiError('AUTH_INVALID', 'Credenciales inválidas');
  }

  // 4. Verificar password
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await rateLimiter.increment(`login:email:${normalizedEmail}`, LOCKOUT_WINDOW_MS);
    throw new ApiError('AUTH_INVALID', 'Credenciales inválidas');
  }

  // 5. Login exitoso: resetear rate limit y crear sesión
  await rateLimiter.reset(`login:email:${normalizedEmail}`);
  await setSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'USER' | 'ADMIN',
  });

  // 6. Notificación de login (solo si el email está verificado)
  if (user.emailVerified) {
    try {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
      const userAgent = req.headers.get('user-agent') ?? undefined;
      await sendLoginNotification(user.email, user.name ?? 'Hola', { ip, userAgent });
    } catch (err) {
      console.error('[login] Error enviando notificación:', err);
    }
  }

  return ok({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});
