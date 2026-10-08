import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession } from '@/lib/session';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { ChangePasswordForm } from './ChangePasswordForm';

export const metadata: Metadata = {
  title: 'Mi perfil',
};

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect('/login?callbackUrl=/perfil');
  }

  return (
    <Section spacing="lg" className="pt-32">
      <Container className="max-w-2xl">
        <p className="font-detail text-xs uppercase tracking-[0.3em] text-accent">
          Mi cuenta
        </p>
        <h1 className="mt-2 font-display text-display-md text-fg">
          Hola, {session.user.name ?? 'usuario'}
        </h1>
        <div className="mt-10 border border-border bg-bg-elevated p-6">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-muted">Email:</dt>
              <dd className="text-fg">{session.user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fg-muted">Rol:</dt>
              <dd className="text-fg">{session.user.role}</dd>
            </div>
          </dl>
          <p className="mt-6 text-sm text-fg-muted">
            El cambio de nombre, el avatar y la eliminación de cuenta se
            implementarán en una próxima iteración.
          </p>
        </div>

        <div className="mt-10 border border-border bg-bg-elevated p-6">
          <h2 className="font-display text-lg text-fg">Cambiar contraseña</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Necesitás tu contraseña actual. Al cambiarla, seguis logueado en
            este dispositivo.
          </p>
          <div className="mt-6">
            <ChangePasswordForm />
          </div>
        </div>

        <form action="/api/auth/logout" method="post" className="mt-6">
          <button
            type="submit"
            className="border border-border px-5 py-2.5 font-detail text-xs uppercase tracking-widest text-fg-muted transition-colors hover:border-danger hover:text-danger"
          >
            Cerrar sesión
          </button>
        </form>
      </Container>
    </Section>
  );
}
