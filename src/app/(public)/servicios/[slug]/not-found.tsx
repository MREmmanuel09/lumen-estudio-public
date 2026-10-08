import Link from 'next/link';
import { Container } from '@/components/layout/Container';

/** 404 de servicio inexistente. */
export default function ServiceNotFound() {
  return (
    <main className="bg-bg py-section">
      <Container className="text-center">
        <p className="font-detail text-xs uppercase tracking-[0.3em] text-accent">
          Servicios
        </p>
        <h1 className="mt-4 font-display text-display-md text-fg">
          Servicio no encontrado
        </h1>
        <p className="mx-auto mt-4 max-w-md text-fg-muted">
          Este servicio no existe o ya no está disponible.
        </p>
        <Link
          href="/#servicios"
          className="mt-10 inline-flex items-center justify-center border border-accent bg-accent px-8 py-4 font-detail text-xs uppercase tracking-widest text-accent-fg transition-colors hover:bg-fg hover:text-bg"
        >
          Ver todos los servicios
        </Link>
      </Container>
    </main>
  );
}
