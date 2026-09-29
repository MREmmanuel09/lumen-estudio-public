import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { ServicesGrid } from './ServicesGrid';
import { getServices } from '@/services/gallery';

export async function ServicesSection() {
  const services = await getServices();
  if (services.length === 0) return null;

  return (
    <Section id="servicios" spacing="lg">
      <Container>
        <div className="mb-12 max-w-2xl">
          <p className="font-detail text-xs uppercase tracking-[0.3em] text-accent">
            Servicios
          </p>
          <h2 className="mt-4 font-display text-display-md text-fg">
            Cada proyecto,
            <br />
            <span className="italic text-accent">una historia</span>
          </h2>
          <p className="mt-4 text-fg-muted">
            Trabajamos en {services.length === 1 ? 'un área' : `${services.length} áreas`}{' '}
            principales. Cada una con dirección de arte propia y un equipo dedicado.
          </p>
        </div>

        <ServicesGrid services={services} />
      </Container>
    </Section>
  );
}

export function ServiceCardLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/servicios/${slug}`}
      className="font-detail text-xs uppercase tracking-widest text-fg-muted transition-colors group-hover:text-fg"
    >
      Ver más →
    </Link>
  );
}
