'use client';

import { motion } from 'framer-motion';
import { staggerContainer, fadeUp } from '@/lib/motion';
import { Container } from '@/components/layout/Container';

const STEPS = [
  {
    number: '01',
    title: 'Consulta inicial',
    description:
      'Conversamos sobre tu visión, el contexto y los objetivos. Sin compromiso, sin formulario largo. Una llamada o un café.',
    duration: '1 semana',
  },
  {
    number: '02',
    title: 'Conceptualización',
    description:
      'Creamos un moodboard, definimos locaciones, estilismo y plan de producción. Te presentamos una propuesta visual completa antes de la sesión.',
    duration: '1-2 semanas',
  },
  {
    number: '03',
    title: 'La sesión',
    description:
      'Producimos en estudio o exteriores, con dirección de arte en tiempo real. Trabajamos con luz natural cuando es posible, y siempre con un equipo profesional.',
    duration: '1-2 días',
  },
  {
    number: '04',
    title: 'Postproducción',
    description:
      'Edición y revelado no destructivo. Retoque de color consistente con la propuesta original. Entrega en alta resolución + web.',
    duration: '2-3 semanas',
  },
];

export function ProcessSection() {
  return (
    <section id="proceso" className="bg-bg py-section">
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
            Cómo trabajamos
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mt-4 font-display text-display-md text-fg"
          >
            Cuatro pasos,
            <br />
            <span className="italic text-accent">una conversación</span>
          </motion.h2>
        </motion.div>

        <motion.ol
          className="grid gap-8 md:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {STEPS.map((step, i) => (
            <motion.li
              key={step.number}
              variants={fadeUp}
              className="relative"
            >
              {/* Línea conectora (entre steps, no después del último) */}
              {i < STEPS.length - 1 && (
                <div
                  className="absolute left-6 top-12 hidden h-px w-full bg-gradient-to-r from-accent/40 to-transparent lg:block"
                  style={{ width: 'calc(100% - 1.5rem)' }}
                  aria-hidden="true"
                />
              )}

              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center border border-accent/40 bg-bg-elevated font-display text-xl text-accent">
                  {step.number}
                </div>
                <h3 className="font-display text-xl text-fg">{step.title}</h3>
                <p className="mt-3 text-sm text-fg-muted">{step.description}</p>
                <p className="mt-4 font-detail text-xs uppercase tracking-widest text-fg-muted">
                  {step.duration}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </Container>
    </section>
  );
}
