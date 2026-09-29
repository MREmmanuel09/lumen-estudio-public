// Auth utilities — bcrypt + tokens + sanitización.
// Ver CONTRATOS_TECNICOS.md §4 (Sesión y JWT) y §8 (Sanitización).

import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import type { User } from '@prisma/client';

// Role es string en SQLite, enum en PostgreSQL. Usamos string para compatibilidad.
// Cuando se migre a Postgres, este import puede volver a ser: import type { Role } from '@prisma/client'
export type Role = 'USER' | 'ADMIN';

const BCRYPT_ROUNDS = 12;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const TOKEN_BYTES = 32;

// --- Password ---

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña no puede tener más de 128 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un símbolo');

export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const result = passwordSchema.safeParse(password);
  if (result.success) return { valid: true, errors: [] };
  return {
    valid: false,
    errors: result.error.issues.map((i) => i.message),
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// --- Tokens de verificación / recuperación ---

export interface GeneratedToken {
  /** Token plano a enviar por email (NUNCA persistir tal cual) */
  token: string;
  /** Hash del token a persistir en DB (sha256 hex) */
  tokenHash: string;
  /** Fecha de expiración */
  expires: Date;
}

export function generateVerificationToken(): GeneratedToken {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  const tokenHash = hashToken(token);
  const expires = new Date(Date.now() + TOKEN_TTL_MS);
  return { token, tokenHash, expires };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// --- Sanitización de usuario (previene enumeración) ---

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  role: string; // string en SQLite, Role enum en Postgres
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
}

export function sanitizeUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as unknown as Role,
    emailVerified: user.emailVerified,
    image: user.image,
    createdAt: user.createdAt,
  };
}

// --- Normalización ---

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remover diacríticos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}
