import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { MosaicGrid } from '@/components/gallery/MosaicGrid';
import { getCategoryWithMosaics } from '@/services/gallery';

interface PageProps {
  params: Promise<{ categoria: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categoria } = await params;
  const data = await getCategoryWithMosaics(categoria);
  if (!data) return { title: 'Categoría no encontrada' };
  return {
    title: data.category.name,
    description: data.category.description,
    openGraph: {
      title: data.category.name,
      description: data.category.description,
      images: data.category.coverImage ? [{ url: data.category.coverImage }] : undefined,
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { categoria } = await params;
  const data = await getCategoryWithMosaics(categoria);
  if (!data) notFound();

  const { category, mosaics } = data;
  const cover = category.coverImage ?? mosaics[0]?.files[0]?.url ?? null;

  return (
    <>
      <section className="relative flex min-h-[60vh] items-end overflow-hidden bg-black pt-32 pb-16">
        {cover && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${cover})` }}
            aria-hidden="true"
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30"
          aria-hidden="true"
        />
        <Container className="relative z-10">
          <p className="font-detail text-xs uppercase tracking-[0.3em] text-accent">
            Portafolio
          </p>
          <h1 className="mt-3 font-display text-display-lg text-fg">{category.name}</h1>
          <p className="mt-4 max-w-2xl text-fg-muted">{category.description}</p>
        </Container>
      </section>

      {mosaics.length === 0 ? (
        <section className="bg-bg py-section">
          <Container>
            <p className="text-center text-fg-muted">
              Esta categoría aún no tiene mosaicos publicados.
            </p>
          </Container>
        </section>
      ) : (
        mosaics.map((mosaic, idx) => {
          const imageCount = mosaic.files.filter((f) => f.type === 'image').length;
          const videoCount = mosaic.files.filter((f) => f.type === 'video').length;
          const number = String(idx + 1).padStart(2, '0');
          return (
            <section
              key={mosaic.id}
              className={`relative overflow-hidden py-section ${idx % 2 === 1 ? 'bg-bg-elevated/40' : 'bg-bg'}`}
            >
              {/* Textura radial tenue (acompaña, no compite) */}
              <div
                className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full"
                style={{
                  background:
                    'radial-gradient(closest-side, rgb(var(--color-accent) / 0.05), transparent)',
                }}
                aria-hidden="true"
              />
              <Container className="relative">
                <p className="font-detail text-xs uppercase tracking-[0.3em] text-accent">
                  Proyecto {number} · {imageCount}{' '}
                  {imageCount === 1 ? 'foto' : 'fotos'}
                  {videoCount > 0 &&
                    ` · ${videoCount} ${videoCount === 1 ? 'video' : 'videos'}`}
                </p>
                <h2 className="mt-4 font-display text-display-md text-fg">
                  {mosaic.title}
                </h2>
                {mosaic.description && (
                  <p className="mt-3 max-w-2xl text-fg-muted">{mosaic.description}</p>
                )}
                <div className="mb-10 mt-8 border-t border-border" aria-hidden="true" />
                {mosaic.files.length === 0 ? (
                  <p className="text-fg-muted">Este mosaico aún no tiene archivos.</p>
                ) : (
                  <MosaicGrid files={mosaic.files} />
                )}
              </Container>
            </section>
          );
        })
      )}
    </>
  );
}
