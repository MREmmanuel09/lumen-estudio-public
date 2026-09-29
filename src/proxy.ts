// Proxy (renombrado de middleware.ts en Next 16) — protege /admin/* y /perfil/*.
// Ver CONTRATOS_TECNICOS.md §4.7 y §10 (defense in depth).

import { NextResponse, type NextRequest } from 'next/server';
import { unsealData } from 'iron-session';

const SESSION_COOKIE = 'lumen_session';

interface SessionData {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: 'USER' | 'ADMIN';
  };
  issuedAt: number;
  expiresAt: number;
}

async function readSession(req: NextRequest): Promise<SessionData | null> {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  const password = process.env.SESSION_PASSWORD;
  if (!password || password.length < 32) {
    console.error('[proxy] SESSION_PASSWORD no configurado o demasiado corto');
    return null;
  }
  try {
    const session = await unsealData<SessionData>(cookie, { password });
    if (session.expiresAt < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = await readSession(req);

  // /admin/* — solo ADMIN
  if (pathname.startsWith('/admin')) {
    if (!session) {
      const url = new URL('/login', req.url);
      url.searchParams.set('callbackUrl', pathname + search);
      return NextResponse.redirect(url);
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // /perfil/* — requiere sesión
  if (pathname.startsWith('/perfil')) {
    if (!session) {
      const url = new URL('/login', req.url);
      url.searchParams.set('callbackUrl', pathname + search);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/perfil/:path*'],
};
