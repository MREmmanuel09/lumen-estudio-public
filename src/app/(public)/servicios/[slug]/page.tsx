import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { serviceIcon } from '@/components/home/service-icons';
import { getServiceBySlug, plainText } from '@/services/gallery';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return { title: 'Servicio no encontrado' };
  return {
    title: service.title,
    description: plainText(service.description, 160),
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const Icon = serviceIcon(service.icon);

  return (
    <>
      <section className="relative flex min-h-[60vh] items-end overflow-hidden bg-black pb-16 pt-32">
        {service.image && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${service.image})` }}
            aria-hidden="true"
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30"
          aria-hidden="true"
        />
        <Container className="relative z-10">
          <p className="font-detail text-xs uppercase tracking-[0.3em] text-accent">
            Servicios
          </p>
          <h1 className="mt-3 flex items-center gap-4 font-display text-display-lg text-fg">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-fg/30 bg-black/40 backdrop-blur-sm">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            {service.title}
          </h1>
        </Container>
      </section>

      <Section spacing="lg">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
            <div>
              {service.description && (
                <div
                  className="prose-lumen max-w-2xl text-fg-muted [&_a]:text-accent [&_a]:underline [&_p]:mb-4 [&_strong]:text-fg"
                  dangerouslySetInnerHTML={{ __html: service.description }}
                />
              )}

              {service.features.length > 0 && (
                <div className="mt-10">
                  <h2 className="font-detail text-xs uppercase tracking-[0.3em] text-accent">
                    Incluye
                  </h2>
                  <ul className="mt-4 space-y-3">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-fg">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-accent/50 text-accent">
                          <Check className="h-3 w-3" aria-hidden="true" />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <aside className="h-fit border border-border bg-bg-elevated p-6 lg:sticky lg:top-24">
              <p className="font-detail text-xs uppercase tracking-widest text-fg-muted">
                Inversión
              </p>
              <p className="mt-2 font-display text-3xl text-accent">
                {service.priceLabel ?? 'A convenir'}
              </p>
              {service.priceNote && (
                <p className="mt-1 text-sm text-fg-muted">{service.priceNote}</p>
              )}
              {service.durationLabel && (
                <p className="mt-4 border-t border-border pt-4 text-sm text-fg-muted">
                  {service.durationLabel}
                </p>
              )}
              <Link
                href="/#contacto"
                className="mt-6 flex items-center justify-center border border-accent bg-accent px-8 py-4 font-detail text-xs uppercase tracking-widest text-accent-fg transition-colors hover:bg-fg hover:text-bg"
              >
                Solicitar cotización
              </Link>
              <Link
                href="/#servicios"
                className="mt-3 flex items-center justify-center border border-fg/40 bg-transparent px-8 py-4 font-detail text-xs uppercase tracking-widest text-fg transition-colors hover:border-accent hover:text-accent"
              >
                Ver todos
              </Link>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
