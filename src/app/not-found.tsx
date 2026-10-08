import Link from 'next/link';
import { Container } from '@/components/layout/Container';

/** 404 global con marca (misma paleta, sin hex inline). */
export default function GlobalNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <Container className="text-center">
        <p className="font-detail text-xs uppercase tracking-[0.4em] text-accent">
          Error 404
        </p>
        <h1 className="mt-6 font-display text-display-lg text-fg">
          Página no encontrada
        </h1>
        <p className="mx-auto mt-4 max-w-md text-fg-muted">
          La dirección que buscás no existe o fue movida.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center border border-accent bg-accent px-8 py-4 font-detail text-xs uppercase tracking-widest text-accent-fg transition-colors hover:bg-fg hover:text-bg"
          >
            Volver al inicio
          </Link>
          <Link
            href="/#galeria"
            className="inline-flex items-center justify-center border border-fg/40 bg-transparent px-8 py-4 font-detail text-xs uppercase tracking-widest text-fg transition-colors hover:border-accent hover:text-accent"
          >
            Ver portafolio
          </Link>
        </div>
      </Container>
    </main>
  );
}
