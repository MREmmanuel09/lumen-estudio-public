import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  title: 'Recuperar contraseña',
  description: 'Restablecé tu contraseña de LUMEN Estudio.',
};

export default function RecoverPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-bg px-6 py-24">
      <Container className="max-w-md text-center">
        <p className="font-detail text-xs uppercase tracking-[0.3em] text-accent">
          Próximamente
        </p>
        <h1 className="mt-4 font-display text-4xl text-fg">Recuperar contraseña</h1>
        <p className="mt-6 text-fg-muted">
          Esta función se implementa en la fase 5. Mientras tanto, escribinos a{' '}
          <a href="mailto:hola@example.com" className="text-accent hover:underline">
            hola@example.com
          </a>{' '}
          o al{' '}
          <a
            href="https://wa.me/0000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            +000 0000 0000
          </a>
          .
        </p>
      </Container>
    </div>
  );
}
