// POST /api/contact — público
// Guarda mensaje con rate limit + honeypot.

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { rateLimiter } from '@/lib/rate-limit';
import { contactSchema } from '@/lib/schemas/contact';
import { sendContactConfirmation, sendContactNotification } from '@/lib/email';

export const POST = withApiHandler(async (req: NextRequest) => {
  // 1. Rate limit por IP: 5/h
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await rateLimiter.check(`contact:ip:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    throw new ApiError('RATE_LIMITED', 'Demasiados mensajes, intenta más tarde', {
      retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000),
    });
  }

  // 2. Parse + validar
  const body = await req.json().catch(() => ({}));
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Datos inválidos', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }
  const { name, email, subject, message, website } = parsed.data;

  // 3. Honeypot: si website tiene contenido, descartar silenciosamente
  if (website && website.length > 0) {
    await rateLimiter.increment(`contact:ip:${ip}`, 60 * 60 * 1000);
    return ok({ message: 'Mensaje enviado correctamente' });
  }

  // 4. Incrementar rate limit (operación válida)
  await rateLimiter.increment(`contact:ip:${ip}`, 60 * 60 * 1000);

  // 5. Guardar en BD
  await db.message.create({
    data: {
      name,
      email,
      subject: subject ?? null,
      message,
    },
  });

  // 6. Enviar emails (best-effort)
  try {
    await sendContactConfirmation(email, name, message);
    await sendContactNotification(name, email, subject ?? null, message);
  } catch (err) {
    console.error('[contact] Error enviando emails:', err);
  }

  return ok({ message: 'Mensaje enviado correctamente' });
});
