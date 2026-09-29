import type { ReactNode } from 'react';
import { getSession } from '@/lib/session';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  const user = session
    ? { name: session.user.name, role: session.user.role }
    : null;

  return (
    <>
      <Navbar user={user} />
      <main id="main" className="min-h-screen">
        {children}
      </main>
      <Footer />
    </>
  );
}
