'use client';

import { motion, type MotionStyle } from 'framer-motion';
import { useState } from 'react';

const LOCAL_IMAGE = '/images/author.jpg';
const FALLBACK_REMOTE =
  'https://images.unsplash.com/photo-1554048612-b6a482bc67e9?w=1600&q=85&auto=format&fit=crop';

interface AuthorImageProps {
  style?: MotionStyle;
}

type Source = 'local' | 'remote' | 'placeholder';

/**
 * Imagen del autor con fallback en cascada:
 * 1. /images/author.jpg (local, subida por el usuario)
 * 2. Unsplash (remoto, foto genérica de stock)
 * 3. Placeholder SVG con iniciales genéricas (siempre se ve, sin red)
 *
 * NOTA para repo público: el placeholder usa iniciales "L S" (LUMEN Studio)
 * en lugar del nombre del fundador. Si querés tu propio placeholder,
 * editá las iniciales en `AuthorPlaceholder` abajo.
 */
export function AuthorImage({ style }: AuthorImageProps) {
  const [source, setSource] = useState<Source>('local');
  const [src, setSrc] = useState(LOCAL_IMAGE);

  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-bg-elevated">
      {/* Placeholder siempre presente como base */}
      <AuthorPlaceholder style={style} />

      {/* Imagen real (local o remoto) — encima del placeholder */}
      {source !== 'placeholder' && (
        <motion.img
          src={src}
          alt="Retrato del estudio"
          style={style}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => {
            if (source === 'local') {
              setSource('remote');
              setSrc(FALLBACK_REMOTE);
            } else {
              setSource('placeholder');
            }
          }}
        />
      )}

      {/* Badge de "imagen pendiente" si quedó en placeholder */}
      {source === 'placeholder' && (
        <div className="absolute bottom-4 left-4 right-4 rounded-sm border border-fg/30 bg-black/60 px-3 py-2 text-center font-detail text-[10px] uppercase tracking-widest text-fg-muted backdrop-blur-sm">
          Subí tu retrato a <code className="text-accent">public/images/author.jpg</code>
        </div>
      )}
    </div>
  );
}

/**
 * Placeholder SVG con las iniciales estilizadas.
 * Se ve profesional mientras no hay foto real.
 */
function AuthorPlaceholder({ style }: { style?: MotionStyle }) {
  return (
    <motion.div
      style={style}
      className="absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0A192F" />
            <stop offset="100%" stopColor="#112240" />
          </linearGradient>
          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="rgba(232,224,213,0.05)" />
            <stop offset="100%" stopColor="rgba(10,25,47,0.4)" />
          </radialGradient>
          <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.5" fill="rgba(232,224,213,0.06)" />
          </pattern>
        </defs>

        {/* Fondo con gradiente */}
        <rect width="400" height="500" fill="url(#bgGradient)" />
        <rect width="400" height="500" fill="url(#dots)" />
        <rect width="400" height="500" fill="url(#vignette)" />

        {/* Marco decorativo */}
        <rect
          x="30"
          y="30"
          width="340"
          height="440"
          fill="none"
          stroke="rgba(232,224,213,0.15)"
          strokeWidth="1"
        />
        <rect
          x="40"
          y="40"
          width="320"
          height="420"
          fill="none"
          stroke="rgba(232,224,213,0.08)"
          strokeWidth="1"
        />

        {/* Iniciales "LS" (LUMEN Studio) — placeholder genérico */}
        <text
          x="200"
          y="250"
          fontFamily="Cormorant Garamond, Georgia, serif"
          fontSize="180"
          fontWeight="500"
          fill="rgba(232,224,213,0.92)"
          textAnchor="middle"
          dominantBaseline="central"
          letterSpacing="-0.04em"
        >
          LS
        </text>

        {/* Etiqueta inferior */}
        <text
          x="200"
          y="400"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="11"
          fontWeight="500"
          fill="rgba(232,224,213,0.5)"
          textAnchor="middle"
          letterSpacing="0.3em"
        >
          LUMEN STUDIO
        </text>

        {/* Líneas decorativas */}
        <line x1="120" y1="430" x2="180" y2="430" stroke="rgba(232,224,213,0.3)" strokeWidth="0.5" />
        <line x1="220" y1="430" x2="280" y2="430" stroke="rgba(232,224,213,0.3)" strokeWidth="0.5" />
      </svg>
    </motion.div>
  );
}
