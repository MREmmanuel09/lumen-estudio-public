import type { Metadata } from 'next';
import { MotionConfig } from 'framer-motion';
import { Cormorant_Garamond, Inter, Space_Grotesk } from 'next/font/google';
import { CursorGlow } from '@/components/ui/CursorGlow';
import './globals.css';

/**
 * Tipografías de marca. Las CSS variables que exponen están consumidas por
 * tailwind.config.ts (fontFamily.display | body | detail).
 */
const fontDisplay = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const fontBody = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const fontDetail = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-detail',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'LUMEN Estudio',
    template: '%s · LUMEN Estudio',
  },
  description:
    'Estudio fotográfico premium. Portafolio editorial, moda, retrato y más.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  ),
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    siteName: 'LUMEN Estudio',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontDetail.variable}`}
    >
      <body className="min-h-screen bg-bg text-fg antialiased">
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
        <CursorGlow />
      </body>
    </html>
  );
}
