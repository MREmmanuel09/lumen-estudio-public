import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Cómo LUMEN Estudio protege tus datos personales.',
};

export default function PrivacyPage() {
  return (
    <Section spacing="lg" className="pt-32">
      <Container className="max-w-3xl">
        <p className="font-detail text-xs uppercase tracking-[0.3em] text-accent">
          Legal
        </p>
        <h1 className="mt-4 font-display text-display-md text-fg">
          Política de privacidad
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Última actualización: enero 2026
        </p>

        <div className="mt-10 space-y-8 text-fg-muted">
          <section>
            <h2 className="font-display text-2xl text-fg">1. Datos que recopilamos</h2>
            <p className="mt-3 leading-relaxed">
              Recopilamos los siguientes datos personales cuando interactuás con el Sitio:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
              <li>
                <strong className="text-fg">Datos de cuenta</strong>: nombre, email y
                contraseña (hasheada) cuando creás una cuenta.
              </li>
              <li>
                <strong className="text-fg">Datos de contacto</strong>: nombre, email,
                asunto y mensaje cuando nos escribís desde el formulario de contacto.
              </li>
              <li>
                <strong className="text-fg">Datos técnicos</strong>: dirección IP,
                navegador y páginas visitadas, con fines de seguridad y analítica.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-fg">2. Uso de los datos</h2>
            <p className="mt-3 leading-relaxed">
              Usamos tus datos personales para:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
              <li>Gestionar tu cuenta y autenticación.</li>
              <li>Responder a tus mensajes de contacto.</li>
              <li>Enviar comunicaciones transaccionales (verificación de email, recuperación de contraseña).</li>
              <li>Mejorar el Sitio y prevenir fraudes.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-fg">3. Cookies</h2>
            <p className="mt-3 leading-relaxed">
              Usamos cookies técnicas para mantener tu sesión iniciada y recordar tus
              preferencias. No usamos cookies de seguimiento publicitario ni compartimos
              datos con terceros para marketing.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-fg">4. Almacenamiento y seguridad</h2>
            <p className="mt-3 leading-relaxed">
              Tus datos se almacenan en bases de datos cifradas y se transmiten mediante
              HTTPS. Implementamos medidas de seguridad técnicas y organizativas para
              protegerlos contra accesos no autorizados, pérdida o alteración.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-fg">5. Tus derechos</h2>
            <p className="mt-3 leading-relaxed">
              Podés ejercer en cualquier momento los siguientes derechos:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
              <li><strong className="text-fg">Acceso</strong>: conocer qué datos tenemos sobre vos.</li>
              <li><strong className="text-fg">Rectificación</strong>: corregir datos incorrectos o incompletos.</li>
              <li><strong className="text-fg">Eliminación</strong>: solicitar la eliminación de tu cuenta y datos.</li>
              <li><strong className="text-fg">Oposición</strong>: oponerte a tratamientos específicos.</li>
            </ul>
            <p className="mt-3 leading-relaxed">
              Para ejercerlos, escribinos a{' '}
              <a href="mailto:privacidad@example.com" className="text-accent hover:underline">
                privacidad@example.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-fg">6. Retención de datos</h2>
            <p className="mt-3 leading-relaxed">
              Conservamos tus datos personales mientras tu cuenta esté activa o mientras
              sea necesario para cumplir con obligaciones legales. Al eliminar tu cuenta,
              tus datos se eliminan en un plazo máximo de 30 días, salvo aquellos que
              debamos conservar por ley.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-fg">7. Cambios a esta política</h2>
            <p className="mt-3 leading-relaxed">
              Podemos actualizar esta política periódicamente. Te notificaremos cualquier
              cambio significativo por email o mediante un aviso visible en el Sitio.
            </p>
          </section>
        </div>
      </Container>
    </Section>
  );
}
