import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/session';
import { AdminShell } from '@/components/admin/AdminShell';

// El admin usa sesiones y BD — no se puede pre-renderizar.
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // requireAdmin lanza si no hay sesión admin. Capturamos y redirigimos.
  try {
    await requireAdmin();
  } catch {
    redirect('/login?callbackUrl=/admin');
  }

  return <AdminShell>{children}</AdminShell>;
}
