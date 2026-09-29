import type { NextConfig } from 'next';

/**
 * Configuración de Next.js 16 para LUMEN Estudio.
 *
 * Incluye headers de seguridad transversales (CSP, X-Frame-Options, etc.)
 * aplicados a todas las rutas vía la función `headers()`.
 */
const isDev = process.env.NODE_ENV !== 'production';

const SECURITY_HEADERS = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // P0: unsafe-eval solo en dev (Next/Turbopack). En prod se elimina.
      isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'", // Tailwind y styled-jsx
      "img-src 'self' data: blob: https://images.unsplash.com https://commondatastorage.googleapis.com https://picsum.photos https://res.cloudinary.com",
      "font-src 'self' data:",
      "connect-src 'self'",
      "media-src 'self' https://commondatastorage.googleapis.com https://res.cloudinary.com blob:",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      'upgrade-insecure-requests',
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // typedRoutes desactivado: hace ruido con rutas referenciadas pero no
  // todavía implementadas (ej. /perfil). Se puede re-habilitar cuando
  // todas las rutas existan.
  typedRoutes: false,
  // Output standalone para Docker (build mínimo, solo lo necesario)
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'commondatastorage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
