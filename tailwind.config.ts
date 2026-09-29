import type { Config } from 'tailwindcss';

/**
 * Sistema de diseño LUMEN Estudio.
 *
 * Las clases utilitarias (`bg-bg`, `text-fg`, etc.) consumen variables CSS
 * definidas en `src/app/globals.css`. NO usar hex/rgb inline.
 *
 * Paleta de marca (referencia):
 *  - Azul Marino  #0A192F
 *  - Negro        #000000
 *  - Blanco       #F8F9FA
 *  - Hueso        #E8E0D5
 *
 * Tipografías (cargadas en layout.tsx):
 *  - Títulos:  Cormorant Garamond
 *  - Cuerpo:   Inter
 *  - Detalles: Space Grotesk
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Tokens semánticos. Usar siempre estos nombres en componentes.
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        'bg-elevated': 'rgb(var(--color-bg-elevated) / <alpha-value>)',
        fg: 'rgb(var(--color-fg) / <alpha-value>)',
        'fg-muted': 'rgb(var(--color-fg-muted) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-fg': 'rgb(var(--color-accent-fg) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
      },
      fontFamily: {
        // Cargadas via next/font en layout.tsx y expuestas como CSS variables.
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        detail: ['var(--font-detail)', 'monospace'],
      },
      fontSize: {
        // Escala tipográfica editorial
        'display-xl': ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-md': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
      },
      spacing: {
        'section': '6rem',
        'section-sm': '3rem',
      },
      maxWidth: {
        prose: '65ch',
        container: '1400px',
      },
      transitionTimingFunction: {
        elegant: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
