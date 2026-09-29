import { Hero } from '@/components/home/Hero';
import { Marquee } from '@/components/home/Marquee';
import { AboutSection } from '@/components/home/AboutSection';
import { ServicesSection } from '@/components/home/ServicesSection';
import { StatsSection } from '@/components/home/StatsSection';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { ProcessSection } from '@/components/home/ProcessSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { CTASection } from '@/components/home/CTASection';
import { ContactSection } from '@/components/home/ContactSection';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { getCategories } from '@/services/gallery';

export default async function HomePage() {
  const categories = await getCategories();

  return (
    <>
      {/* 1. Hero — primera impresión */}
      <Hero />

      {/* 2. Marquee de clientes */}
      <Marquee />

      {/* 3. Sobre el estudio — confianza */}
      <AboutSection />

      {/* 4. Servicios — qué ofrecemos */}
      <ServicesSection />

      {/* 5. Estadísticas — credibilidad */}
      <StatsSection />

      {/* 6. Portafolio por categoría */}
      <Section id="galeria" spacing="lg">
        <Container>
          <div className="mb-12 max-w-2xl">
            <p className="font-detail text-xs uppercase tracking-[0.3em] text-accent">
              Portafolio
            </p>
            <h2 className="mt-4 font-display text-display-md text-fg">
              Trabajos seleccionados
            </h2>
            <p className="mt-4 text-fg-muted">
              Una selección curada de proyectos recientes. Cada categoría es un mundo
              visual con dirección de arte propia.
            </p>
          </div>
          <CategoryGrid categories={categories} />
        </Container>
      </Section>

      {/* 7. Proceso de trabajo */}
      <ProcessSection />

      {/* 8. Testimonios — prueba social */}
      <TestimonialsSection />

      {/* 9. Contacto — cierre funcional */}
      <ContactSection />

      {/* 10. CTA final — motivador */}
      <CTASection />
    </>
  );
}
