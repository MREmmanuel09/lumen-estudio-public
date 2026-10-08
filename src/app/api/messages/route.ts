// GET /api/messages — admin
// Lista mensajes, opcionalmente filtrados por no leídos.

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, withApiHandler } from '@/lib/api/response';
import { requireAdmin } from '@/lib/session';

export const GET = withApiHandler(async (req: NextRequest) => {
  await requireAdmin();

  const unreadOnly = req.nextUrl.searchParams.get('unreadOnly') === 'true';

  const messages = await db.message.findMany({
    where: unreadOnly ? { read: false } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const unreadCount = await db.message.count({ where: { read: false } });

  return ok({ messages, unreadCount });
});
