// Sesión con iron-session 8.0.4 — ver CONTRATOS_TECNICOS.md §4.

import { cookies } from 'next/headers';
import { getIronSession, type SessionOptions } from 'iron-session';

// Role es string en SQLite, enum en PostgreSQL. Ver auth-utils.ts.
export type Role = 'USER' | 'ADMIN';

export interface SessionData {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
  };
  /** Epoch ms */
  issuedAt: number;
  /** Epoch ms */
  expiresAt: number;
}

// TTL por rol
export const SESSION_TTL: Record<Role, number> = {
  USER: 60 * 60 * 24 * 30, // 30 días
  ADMIN: 60 * 60, // 1 hora
};

/**
 * Validación lazy del password para evitar errores en build estático
 * (cuando SESSION_PASSWORD no existe en process.env). La primera vez
 * que se invoca getSession/setSession/etc., se valida.
 */
function requireSessionPassword(): string {
  const password = process.env.SESSION_PASSWORD;
  if (!password || password.length < 32) {
    throw new Error(
      'SESSION_PASSWORD debe estar definido y tener al menos 32 caracteres. ' +
        "Generar con: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }
  return password;
}

function getSessionOptions(ttl?: number): SessionOptions {
  return {
    password: requireSessionPassword(),
    cookieName: 'lumen_session',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
    ttl: ttl ?? 60 * 60 * 24 * 30,
  };
}

/**
 * Helper server-side. Obtiene la sesión actual desde las cookies.
 * Retorna null si no hay sesión válida.
 */
export async function getSession(): Promise<SessionData | null> {
  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(),
  );
  if (!session.user || !session.expiresAt) return null;
  if (session.expiresAt < Date.now()) return null;
  return {
    user: session.user,
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt,
  };
}

/**
 * Crea o reemplaza la sesión del usuario actual. Llamar después de
 * autenticar (login).
 */
export async function setSession(user: {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}): Promise<void> {
  const ttl = SESSION_TTL[user.role];
  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(ttl),
  );
  const now = Date.now();
  session.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  session.issuedAt = now;
  session.expiresAt = now + ttl * 1000;
  await session.save();
}

/**
 * Destruye la sesión actual (logout).
 */
export async function destroySession(): Promise<void> {
  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(),
  );
  session.destroy();
}

/**
 * Para uso en Server Components y Server Actions que requieren
 * usuario autenticado. Lanza ApiError si no hay sesión.
 */
export async function requireUser(): Promise<SessionData['user']> {
  const session = await getSession();
  if (!session) {
    const { ApiError } = await import('@/lib/api/response');
    throw new ApiError('AUTH_REQUIRED', 'Debes iniciar sesión');
  }
  return session.user;
}

/**
 * Para uso en Server Components, Server Actions y API routes admin.
 * Lanza ApiError si no hay sesión o el rol no es ADMIN.
 */
export async function requireAdmin(): Promise<SessionData['user']> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') {
    const { ApiError } = await import('@/lib/api/response');
    throw new ApiError('FORBIDDEN', 'Acceso restringido a administradores');
  }
  return user;
}
