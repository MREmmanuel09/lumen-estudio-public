'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Container } from '@/components/layout/Container';
import { ArrowRight } from 'lucide-react';
import { fadeUp, staggerContainer } from '@/lib/motion';

const BG_IMAGE =
  'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=2400&q=85&auto=format&fit=crop';

export function CTASection() {
  return (
    <section
      className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-black"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-scroll bg-no-repeat md:bg-fixed"
        style={{ backgroundImage: `url(${BG_IMAGE})` }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/90"
        aria-hidden="true"
      />

      <Container className="relative z-10 text-center">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <motion.p
            variants={fadeUp}
            className="font-detail text-xs uppercase tracking-[0.4em] text-accent md:text-sm"
          >
            ¿Listo para empezar?
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mx-auto mt-6 max-w-3xl font-display text-display-md text-fg md:text-display-lg"
          >
            Creemos algo que merezca ser
            <span className="italic text-accent"> recordado</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-xl text-fg-muted"
          >
            Sesiones limitadas por trimestre. Escribinos con tu idea,
            fecha tentativa o simplemente tu visión. Respondemos en menos
            de 48 horas hábiles.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="#contacto"
              className="group inline-flex items-center gap-3 border border-accent bg-accent px-8 py-4 font-detail text-xs uppercase tracking-widest text-accent-fg transition-all hover:bg-fg hover:text-bg"
            >
              Iniciar un proyecto
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="mailto:hola@example.com"
              className="inline-flex items-center gap-3 border border-fg/40 bg-transparent px-8 py-4 font-detail text-xs uppercase tracking-widest text-fg transition-colors hover:border-accent hover:text-accent"
            >
              hola@example.com
            </Link>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
