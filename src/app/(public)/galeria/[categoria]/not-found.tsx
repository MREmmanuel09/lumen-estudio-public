import Link from 'next/link';
import { Container } from '@/components/layout/Container';

/** 404 de categoría inexistente (la page llama `notFound()` si el slug no existe). */
export default function CategoryNotFound() {
  return (
    <main className="bg-bg py-section">
      <Container className="text-center">
        <p className="font-detail text-xs uppercase tracking-[0.3em] text-accent">
          Portafolio
        </p>
        <h1 className="mt-4 font-display text-display-md text-fg">
          Categoría no encontrada
        </h1>
        <p className="mx-auto mt-4 max-w-md text-fg-muted">
          Esta categoría no existe o aún no tiene proyectos publicados.
        </p>
        <Link
          href="/#galeria"
          className="mt-10 inline-flex items-center justify-center border border-accent bg-accent px-8 py-4 font-detail text-xs uppercase tracking-widest text-accent-fg transition-colors hover:bg-fg hover:text-bg"
        >
          Ver todas las categorías
        </Link>
      </Container>
    </main>
  );
}
