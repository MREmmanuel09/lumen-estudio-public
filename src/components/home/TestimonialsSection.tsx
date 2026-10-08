'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Container } from '@/components/layout/Container';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { fadeUp, staggerContainer } from '@/lib/motion';

const TESTIMONIALS = [
  {
    quote:
      'Abi capturó la esencia de nuestra boda sin invadir ni un solo momento. Las fotos respiran la misma luz y calidez que recordamos.',
    author: 'María & Carlos',
    role: 'Boda en Antigua',
    initials: 'MC',
  },
  {
    quote:
      'El equipo de LUMEN entiende la moda como narrativa. No hacen fotos lindas, hacen imágenes que cuentan algo sobre la marca.',
    author: 'Lucía Mendoza',
    role: 'Directora creativa, Casa Modas',
    initials: 'LM',
  },
  {
    quote:
      'Contratamos a LUMEN para nuestro catálogo y el resultado superó todo: la dirección de arte, el ritmo de entrega, el cuidado en los detalles.',
    author: 'Roberto Pinto',
    role: 'CEO, Café Origen',
    initials: 'RP',
  },
  {
    quote:
      'Mi retrato de autor fue una experiencia. Me sentí cómoda desde el primer minuto. Las fotos dicen cosas que yo no sabía que quería contar.',
    author: 'Andrea Solís',
    role: 'Retrato personal',
    initials: 'AS',
  },
];

export function TestimonialsSection() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  // Auto-rotate cada 6s
  useEffect(() => {
    const id = setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const go = (dir: 1 | -1) => {
    setDirection(dir);
    setIndex((i) => (i + dir + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  const current = TESTIMONIALS[index]!;

  return (
    <section className="relative overflow-hidden bg-bg-elevated py-section">
      <Container>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="mb-12 max-w-2xl"
        >
          <motion.p
            variants={fadeUp}
            className="font-detail text-xs uppercase tracking-[0.3em] text-accent"
          >
            Testimonios
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mt-4 font-display text-display-md text-fg"
          >
            Voces que vuelven
          </motion.h2>
        </motion.div>

        <div className="relative max-w-3xl">
          <Quote
            className="absolute -left-2 -top-2 h-12 w-12 text-accent/20"
            aria-hidden="true"
          />

          <AnimatePresence mode="wait" custom={direction}>
            <motion.figure
              key={index}
              custom={direction}
              initial={{ opacity: 0, x: direction * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -30 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <blockquote className="font-display text-2xl italic leading-relaxed text-fg md:text-3xl">
                &ldquo;{current.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-bg font-display text-lg text-accent">
                  {current.initials}
                </div>
                <div>
                  <p className="font-display text-lg text-fg">{current.author}</p>
                  <p className="font-detail text-xs uppercase tracking-widest text-fg-muted">
                    {current.role}
                  </p>
                </div>
              </figcaption>
            </motion.figure>
          </AnimatePresence>

          {/* Controles */}
          <div className="mt-10 flex items-center gap-4">
            <button
              type="button"
              onClick={() => go(-1)}
              className="flex h-10 w-10 items-center justify-center border border-border text-fg-muted transition-colors hover:border-accent hover:text-accent"
              aria-label="Testimonio anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="flex h-10 w-10 items-center justify-center border border-border text-fg-muted transition-colors hover:border-accent hover:text-accent"
              aria-label="Siguiente testimonio"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="flex gap-1.5">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setDirection(i > index ? 1 : -1);
                    setIndex(i);
                  }}
                  className={`h-1 w-8 transition-colors ${
                    i === index ? 'bg-accent' : 'bg-border'
                  }`}
                  aria-label={`Ir al testimonio ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
