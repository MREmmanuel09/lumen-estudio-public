'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import type { Route } from 'next';
import { AnimatePresence, motion } from 'framer-motion';

interface NavLink {
  href: string;
  label: string;
  isRoute?: boolean;
}

interface MobileMenuProps {
  user: {
    name: string | null;
    role: 'USER' | 'ADMIN';
  } | null;
  publicLinks: NavLink[];
}

export function MobileMenu({ user, publicLinks }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bloquea el scroll del body y cierra con Escape mientras el menú está abierto
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mobile-menu"
          className="fixed inset-0 z-50 md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          />
          <motion.div
            id="mobile-menu"
            className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto overscroll-contain bg-bg-elevated px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center"
                aria-label="Cerrar menú"
                autoFocus
              >
                <svg
                  className="h-6 w-6 text-fg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <ul className="mt-8 flex flex-col gap-6">
              {publicLinks.map((link) => (
                <li key={link.href}>
                  {link.isRoute ? (
                    <Link
                      href={link.href as Route}
                      onClick={() => setOpen(false)}
                      className="font-display text-2xl text-fg transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="font-display text-2xl text-fg transition-colors hover:text-accent"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
              {user?.role === 'ADMIN' && (
                <li>
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="font-display text-2xl text-accent"
                  >
                    Admin
                  </Link>
                </li>
              )}
              <li className="my-2 h-px w-full bg-border" />
              {user ? (
                <li>
                  <Link
                    href={'/perfil' as Route}
                    onClick={() => setOpen(false)}
                    className="font-detail text-xs uppercase tracking-widest text-fg-muted"
                  >
                    {user.name ?? 'Perfil'}
                  </Link>
                </li>
              ) : (
                <>
                  <li>
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="font-detail text-xs uppercase tracking-widest text-fg-muted"
                    >
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/registro"
                      onClick={() => setOpen(false)}
                      className="font-detail text-xs uppercase tracking-widest text-accent"
                    >
                      Crear cuenta
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center md:hidden"
        aria-label="Abrir menú"
        aria-expanded={open}
        aria-controls="mobile-menu"
      >
        <span className="sr-only">Menú</span>
        <svg
          className="h-6 w-6 text-fg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
        </svg>
      </button>

      {mounted && createPortal(overlay, document.body)}
    </>
  );
}
