import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { AdminUsersManager } from './AdminUsersManager';

export default async function AdminUsersPage() {
  const [users, session] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    }),
    getSession(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <p className="font-detail text-xs uppercase tracking-widest text-accent">
          Gestión
        </p>
        <h1 className="mt-2 font-display text-display-md text-fg">Usuarios</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Administra los usuarios y roles.
        </p>
      </div>
      <AdminUsersManager
        currentUserId={session?.user.id ?? ''}
        initialUsers={users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
