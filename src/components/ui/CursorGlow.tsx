'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

/**
 * Glow ambiental que acompaña al mouse (punto + anillo + halo suave).
 *
 * Diseñado para NO interferir con el resto:
 * - `pointer-events-none`: nunca bloquea clics ni hovers existentes.
 * - Posición por motion values (sin re-renders por movimiento).
 * - Solo se monta con puntero fino (`pointer: fine`): en táctil no existe.
 * - Respeta `prefers-reduced-motion` (no se monta).
 * - Paleta de marca (accent hueso) con opacidades bajas.
 */
export function CursorGlow() {
  const reduceMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  // Anillo y halo con retardo elástico (efecto "acompaña", no "pega").
  const ringX = useSpring(x, { stiffness: 260, damping: 26, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 260, damping: 26, mass: 0.6 });
  const haloX = useSpring(x, { stiffness: 120, damping: 22, mass: 0.9 });
  const haloY = useSpring(y, { stiffness: 120, damping: 22, mass: 0.9 });

  useEffect(() => {
    if (reduceMotion) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    setEnabled(true);

    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible((prev) => (prev ? prev : true));
      const target = e.target as HTMLElement | null;
      const interactive = !!target?.closest(
        'a, button, [role="button"], input, textarea, select, summary',
      );
      setHovering((prev) => (prev === interactive ? prev : interactive));
    };
    const onLeave = () => setVisible(false);

    window.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, [reduceMotion, x, y]);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100]">
      {/* Halo amplio y tenue */}
      <motion.div
        className="absolute h-56 w-56 rounded-full bg-accent/[0.05] blur-2xl"
        style={{ x: haloX, y: haloY, translateX: '-50%', translateY: '-50%' }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      {/* Anillo con retardo */}
      <motion.div
        className="absolute h-9 w-9 rounded-full border border-accent/40"
        style={{ x: ringX, y: ringY, translateX: '-50%', translateY: '-50%' }}
        animate={{ opacity: visible ? 1 : 0, scale: hovering ? 1.6 : 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* Punto preciso sobre el cursor */}
      <motion.div
        className="absolute h-1.5 w-1.5 rounded-full bg-accent"
        style={{ x, y, translateX: '-50%', translateY: '-50%' }}
        animate={{ opacity: visible ? 0.9 : 0, scale: hovering ? 0.6 : 1 }}
        transition={{ duration: 0.2 }}
      />
    </div>
  );
}
