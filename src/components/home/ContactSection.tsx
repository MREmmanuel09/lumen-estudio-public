'use client';

import { motion } from 'framer-motion';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { ContactForm } from '@/components/contact/ContactForm';
import { fadeUp, staggerContainer } from '@/lib/motion';

export function ContactSection() {
  return (
    <Section id="contacto" spacing="lg" variant="elevated">
      <Container>
        <motion.div
          className="grid gap-12 md:grid-cols-2 md:gap-16"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <motion.div variants={fadeUp}>
            <p className="font-detail text-xs uppercase tracking-[0.3em] text-accent">
              Contacto
            </p>
            <h2 className="mt-4 font-display text-display-md text-fg">
              Hablemos de tu proyecto
            </h2>
            <p className="mt-6 max-w-md text-fg-muted">
              Contanos qué tenés en mente. Ya sea una sesión editorial, cobertura de evento o
              proyecto de marca, respondemos en menos de 48 horas hábiles.
            </p>
            <div className="mt-10 space-y-3 text-sm">
              <p className="flex items-center gap-3 text-fg-muted">
                <span className="font-detail text-xs uppercase tracking-widest text-accent">
                  Email
                </span>
                <a href="mailto:hola@example.com" className="hover:text-fg">
                  hola@example.com
                </a>
              </p>
              <p className="flex items-center gap-3 text-fg-muted">
                <span className="font-detail text-xs uppercase tracking-widest text-accent">
                  Teléfono
                </span>
                <a
                  href="https://wa.me/0000000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-fg"
                >
                  +000 0000 0000
                </a>
              </p>
              <p className="flex items-center gap-3 text-fg-muted">
                <span className="font-detail text-xs uppercase tracking-widest text-accent">
                  Instagram
                </span>
                <a
                  href="https://instagram.com/your_handle"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-fg"
                >
                  @your_handle
                </a>
              </p>
              <p className="flex items-center gap-3 text-fg-muted">
                <span className="font-detail text-xs uppercase tracking-widest text-accent">
                  Ubicación
                </span>
                Costa Rica
              </p>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <ContactForm />
          </motion.div>
        </motion.div>
      </Container>
    </Section>
  );
}
