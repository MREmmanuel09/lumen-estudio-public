'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { Container } from '@/components/layout/Container';
import { staggerContainer, fadeUp } from '@/lib/motion';

const STATS = [
  { label: 'Años de experiencia', value: 12, suffix: '+' },
  { label: 'Proyectos entregados', value: 800, suffix: '+' },
  { label: 'Clientes felices', value: 250, suffix: '+' },
  { label: 'Premios & publicaciones', value: 15, suffix: '' },
];

function CountUp({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionValue, value, {
      duration: 2,
      ease: [0.22, 1, 0.36, 1],
    });
    const unsubscribe = rounded.on('change', (v) => {
      setDisplay(String(v));
    });
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [inView, value, motionValue, rounded]);

  return (
    <span ref={ref} className="font-display text-display-lg text-accent">
      {display}
      <span>{suffix}</span>
    </span>
  );
}

export function StatsSection() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-black py-section">
      {/* Pattern de fondo sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgb(232,224,213) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />

      <Container className="relative">
        <motion.div
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {STATS.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className="border-l-2 border-accent/30 pl-6"
            >
              <CountUp value={stat.value} suffix={stat.suffix} />
              <p className="mt-3 font-detail text-xs uppercase tracking-widest text-fg-muted">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
