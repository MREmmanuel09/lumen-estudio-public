import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Términos y condiciones de uso del sitio LUMEN Estudio.',
};

export default function TermsPage() {
  return (
    <Section spacing="lg" className="pt-32">
      <Container className="max-w-3xl">
        <p className="font-detail text-xs uppercase tracking-[0.3em] text-accent">
          Legal
        </p>
        <h1 className="mt-4 font-display text-display-md text-fg">
          Términos y condiciones
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Última actualización: enero 2026
        </p>

        <div className="mt-10 space-y-8 text-fg-muted">
          <section>
            <h2 className="font-display text-2xl text-fg">1. Aceptación</h2>
            <p className="mt-3 leading-relaxed">
              Al acceder y utilizar el sitio web de LUMEN Estudio (en adelante "el Sitio"),
              aceptás estar sujeto a estos términos y condiciones de uso. Si no estás
              de acuerdo con alguno de estos términos, te pedimos que no utilices el Sitio.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-fg">2. Uso del Sitio</h2>
            <p className="mt-3 leading-relaxed">
              El Sitio y su contenido están destinados a uso personal y no comercial. No
              está permitida la reproducción, distribución, modificación o uso del contenido
              con fines comerciales sin autorización previa y por escrito de LUMEN Estudio.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-fg">3. Propiedad intelectual</h2>
            <p className="mt-3 leading-relaxed">
              Todas las fotografías, videos, textos, diseños, logotipos y demás elementos
              del Sitio son propiedad de LUMEN Estudio o de sus respectivos titulares y
              están protegidos por las leyes de propiedad intelectual. Cualquier uso no
              autorizado constituye una violación de dichas leyes.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-fg">4. Cuentas de usuario</h2>
            <p className="mt-3 leading-relaxed">
              Para acceder a ciertas funciones del Sitio, podés necesitar crear una cuenta.
              Sos responsable de mantener la confidencialidad de tus credenciales y de
              todas las actividades que ocurran bajo tu cuenta. Notificanos inmediatamente
              si detectás cualquier uso no autorizado.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-fg">5. Limitación de responsabilidad</h2>
            <p className="mt-3 leading-relaxed">
              LUMEN Estudio no será responsable por daños directos, indirectos, incidentales
              o consecuentes que resulten del uso o la imposibilidad de usar el Sitio.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-fg">6. Modificaciones</h2>
            <p className="mt-3 leading-relaxed">
              Nos reservamos el derecho de modificar estos términos en cualquier momento.
              Las modificaciones serán efectivas inmediatamente después de su publicación
              en el Sitio. Te recomendamos revisar periódicamente.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-fg">7. Ley aplicable</h2>
            <p className="mt-3 leading-relaxed">
              Estos términos se rigen por las leyes de la República de Costa Rica. Cualquier
              disputa será resuelta por los tribunales competentes de Costa Rica.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-fg">8. Contacto</h2>
            <p className="mt-3 leading-relaxed">
              Para consultas legales:{' '}
              <a href="mailto:legal@example.com" className="text-accent hover:underline">
                legal@example.com
              </a>
            </p>
          </section>
        </div>
      </Container>
    </Section>
  );
}
