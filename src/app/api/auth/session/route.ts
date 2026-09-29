// GET /api/auth/session — devuelve la sesión actual o { user: null }.

import { getSession } from '@/lib/session';
import { ok } from '@/lib/api/response';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return ok({ user: null });
  }
  return ok({
    user: session.user,
    expiresAt: session.expiresAt,
  });
}
