// POST /api/auth/logout — destruye la sesión.

import { destroySession } from '@/lib/session';
import { ok, withApiHandler } from '@/lib/api/response';

export const POST = withApiHandler(async () => {
  await destroySession();
  return ok({ message: 'Sesión cerrada' });
});
