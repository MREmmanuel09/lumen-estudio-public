import { getBrands } from '@/services/gallery';

/**
 * Marquee "Han confiado en nosotros".
 * Server component: lee las marcas visibles desde la BD.
 * Si no hay ninguna visible (o falla la carga), no renderiza nada
 * y la sección queda oculta automáticamente.
 */
export async function Marquee() {
  const brands = await getBrands();
  if (brands.length === 0) return null;

  // Duplicamos los items para que el loop sea continuo sin gap
  const items = [...brands, ...brands];

  return (
    <section
      className="border-y border-border bg-bg-elevated py-10 overflow-hidden"
      aria-label="Clientes destacados"
    >
      <p className="mb-6 text-center font-detail text-xs uppercase tracking-[0.3em] text-fg-muted">
        Han confiado en nosotros
      </p>
      <div
        className="group relative flex overflow-hidden"
        style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}
      >
        <div className="flex shrink-0 animate-marquee items-center gap-16 pr-16 group-hover:[animation-play-state:paused]">
          {items.map((brand, i) => (
            brand.website ? (
              <a
                key={`${brand.id}-${i}`}
                href={brand.website}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap font-display text-2xl text-fg-muted/60 transition-colors hover:text-fg"
              >
                {brand.name}
              </a>
            ) : (
              <span
                key={`${brand.id}-${i}`}
                className="whitespace-nowrap font-display text-2xl text-fg-muted/60 transition-colors hover:text-fg"
              >
                {brand.name}
              </span>
            )
          ))}
        </div>
      </div>
    </section>
  );
}
