'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '@/lib/motion';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1554080353-a576cf803bda?w=2400&q=85&auto=format&fit=crop';

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      {/* P0 UX: next/image priority (LCP) + Ken Burns sutil, misma paleta */}
      <motion.div
        className="absolute inset-0"
        aria-hidden="true"
        initial={{ scale: 1 }}
        animate={{ scale: 1.06 }}
        transition={{ duration: 10, ease: 'easeOut' }}
      >
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80"
        aria-hidden="true"
      />

      <motion.div
        className="relative z-10 mx-auto w-full max-w-container px-6 text-center md:px-10"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          variants={fadeUp}
          className="font-detail text-xs uppercase tracking-[0.4em] text-accent md:text-sm"
        >
          Estudio Fotográfico · Costa Rica
        </motion.p>

        <motion.h1
          variants={fadeUp}
          className="mt-6 font-display text-5xl leading-[1.05] text-fg md:text-display-lg lg:text-display-xl"
        >
          Luz que cuenta
          <br />
          <span className="italic text-accent">historias</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mx-auto mt-8 max-w-xl font-body text-base leading-relaxed text-fg-muted md:text-lg"
        >
          Retratos editoriales, moda y proyectos de marca con dirección de arte cuidada.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="#galeria"
            className="inline-flex items-center justify-center border border-accent bg-accent px-8 py-4 font-detail text-xs uppercase tracking-widest text-accent-fg transition-colors hover:bg-fg hover:text-bg"
          >
            Ver portafolio
          </Link>
          <Link
            href="#contacto"
            className="inline-flex items-center justify-center border border-fg/40 bg-transparent px-8 py-4 font-detail text-xs uppercase tracking-widest text-fg transition-colors hover:border-accent hover:text-accent"
          >
            Contactar
          </Link>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="h-10 w-6 border border-fg/40"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
