'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { fadeUp, staggerContainer } from '@/lib/motion';
import { Container } from '@/components/layout/Container';
import { AuthorImage } from './AuthorImage';

export function AboutSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  // Parallax sutil: la imagen se mueve más lento que el scroll
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0.6]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-bg py-section">
      <Container>
        <motion.div
          className="grid items-center gap-12 md:grid-cols-2 md:gap-16"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {/* Imagen con parallax */}
          <motion.div variants={fadeUp} className="relative">
            <AuthorImage style={{ y, opacity }} />
            {/* Acento decorativo */}
            <div className="absolute -bottom-6 -right-6 -z-10 h-32 w-32 border-2 border-accent" aria-hidden="true" />
          </motion.div>

          {/* Texto */}
          <div>
            <motion.p
              variants={fadeUp}
              className="font-detail text-xs uppercase tracking-[0.3em] text-accent"
            >
              Sobre el estudio
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="mt-4 font-display text-display-md text-fg"
            >
              Luz, tiempo y
              <br />
              <span className="italic text-accent">mirada editorial</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-prose text-fg-muted"
            >
              LUMEN es un estudio fotográfico que trabaja con luz natural
              y dirección de arte cuidada, buscando imágenes que respiren
              honestidad.
            </motion.p>
            <motion.p
              variants={fadeUp}
              className="mt-4 max-w-prose text-fg-muted"
            >
              Trabajamos con revistas y marcas, pero el premio que más nos
              importa es la confianza de quienes vuelven.
            </motion.p>

            <motion.dl
              variants={fadeUp}
              className="mt-8 grid grid-cols-2 gap-6 border-t border-border pt-6"
            >
              <div>
                <dt className="font-detail text-xs uppercase tracking-widest text-fg-muted">
                  Formación
                </dt>
                <dd className="mt-1 font-display text-lg text-fg">
                  Escola São Paulo
                </dd>
              </div>
              <div>
                <dt className="font-detail text-xs uppercase tracking-widest text-fg-muted">
                  Publicaciones
                </dt>
                <dd className="mt-1 font-display text-lg text-fg">
                  Vogue · Harper&apos;s · NatGeo
                </dd>
              </div>
            </motion.dl>

            <motion.div
              variants={fadeUp}
              className="mt-6 flex flex-wrap items-center gap-4 border-t border-border pt-6"
            >
              <a
                href="tel:+0000000000"
                className="font-detail text-xs uppercase tracking-widest text-fg-muted transition-colors hover:text-fg"
              >
                +000 0000 0000
              </a>
              <span className="text-fg-muted/30">·</span>
              <a
                href="https://instagram.com/your_handle"
                target="_blank"
                rel="noopener noreferrer"
                className="font-detail text-xs uppercase tracking-widest text-fg-muted transition-colors hover:text-fg"
              >
                @your_handle
              </a>
            </motion.div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
