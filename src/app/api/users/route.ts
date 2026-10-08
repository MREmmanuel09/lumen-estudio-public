// GET /api/users  — admin: lista usuarios
// POST /api/users — admin: crea un usuario (típicamente admin)

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { requireAdmin } from '@/lib/session';
import { hashPassword, normalizeEmail, validatePasswordStrength } from '@/lib/auth-utils';

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Nombre requerido').max(100),
  email: z.string().trim().toLowerCase().email('Email inválido').max(254),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(128),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
});

export const GET = withApiHandler(async () => {
  await requireAdmin();
  const users = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });
  return ok(users);
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const admin = await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Datos inválidos', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const { name, email, password, role } = parsed.data;

  // Defense-in-depth: exigimos la misma fortaleza de password que el
  // registro público. Sin esto, un admin podría crear usuarios con password
  // débil (que ya están hasheados con bcrypt, pero igualmente quedan como
  // vector de ataque si la BD se filtra).
  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    throw new ApiError('VALIDATION_ERROR', 'Contraseña débil', {
      fields: { password: strength.errors },
    });
  }

  const normalizedEmail = normalizeEmail(email);

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new ApiError('CONFLICT', 'Ya existe un usuario con ese email');
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role,
      emailVerified: new Date(), // pre-verificamos usuarios creados por admin
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  // Log de auditoría
  console.info(`[admin] Usuario creado por ${admin.email}:`, {
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return ok(user, { status: 201 });
});
