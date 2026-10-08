'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MobileMenu } from './MobileMenu';

interface NavLink {
  href: string;
  label: string;
  /** Indica si es un link interno de Next.js (true) o un anchor/hash (false) */
  isRoute?: boolean;
}

interface NavbarProps {
  user: {
    name: string | null;
    role: 'USER' | 'ADMIN';
  } | null;
}

const PUBLIC_LINKS: NavLink[] = [
  { href: '/#galeria', label: 'Galería', isRoute: false },
  { href: '/#contacto', label: 'Contacto', isRoute: false },
];

export function Navbar({ user }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'fixed top-0 left-0 right-0 z-40 transition-all duration-300 ease-elegant',
        scrolled
          ? 'bg-bg/80 backdrop-blur-md border-b border-border'
          : 'bg-transparent',
      )}
    >
      <nav
        className="mx-auto flex w-full max-w-container items-center justify-between px-6 py-4 md:px-10 md:py-6"
        aria-label="Navegación principal"
      >
        <Link
          href="/"
          className="font-display text-2xl tracking-wider text-fg transition-opacity hover:opacity-80"
        >
          LUMEN
          <span className="ml-1 text-accent">·</span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {PUBLIC_LINKS.map((link) => (
            <li key={link.href}>
              {link.isRoute ? (
                <Link
                  href={link.href as Route}
                  className="font-detail text-xs uppercase tracking-widest text-fg-muted transition-colors hover:text-fg"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  href={link.href}
                  className="font-detail text-xs uppercase tracking-widest text-fg-muted transition-colors hover:text-fg"
                >
                  {link.label}
                </a>
              )}
            </li>
          ))}
          {user?.role === 'ADMIN' && (
            <li>
              <Link
                href={'/admin' as Route}
                className="font-detail text-xs uppercase tracking-widest text-accent transition-colors hover:text-fg"
              >
                Admin
              </Link>
            </li>
          )}
          {user ? (
            <li>
              <Link
                href={'/perfil' as Route}
                className="font-detail text-xs uppercase tracking-widest text-fg-muted transition-colors hover:text-fg"
              >
                {user.name ?? 'Perfil'}
              </Link>
            </li>
          ) : (
            <>
              <li>
                <Link
                  href={'/login' as Route}
                  className="font-detail text-xs uppercase tracking-widest text-fg-muted transition-colors hover:text-fg"
                >
                  Login
                </Link>
              </li>
              <li>
                <Link
                  href={'/registro' as Route}
                  className="border border-accent bg-transparent px-5 py-2 font-detail text-xs uppercase tracking-widest text-accent transition-colors hover:bg-accent hover:text-accent-fg"
                >
                  Registro
                </Link>
              </li>
            </>
          )}
        </ul>

        <MobileMenu user={user} publicLinks={PUBLIC_LINKS} />
      </nav>
    </motion.header>
  );
}
