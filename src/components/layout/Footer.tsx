import Link from 'next/link';
import type { Route } from 'next';

const SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://instagram.com/your_handle' },
  { label: 'WhatsApp', href: 'https://wa.me/0000000000' },
  { label: 'Behance', href: 'https://behance.net' },
];

const LEGAL_LINKS: Array<{ href: Route; label: string }> = [
  { href: '/terminos', label: 'Términos' },
  { href: '/privacidad', label: 'Privacidad' },
];

export function Footer() {
  return (
    <footer className="bg-black text-fg-muted">
      <div className="mx-auto w-full max-w-container px-6 py-16 md:px-10 md:py-20">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="font-display text-3xl text-fg">LUMEN</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed">
              Estudio fotográfico premium. Retratos, moda y proyectos
              editoriales con luz natural. Costa Rica.
            </p>
          </div>

          <div>
            <p className="font-detail text-xs uppercase tracking-widest text-accent">
              Contacto
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a
                  href="mailto:hola@example.com"
                  className="transition-colors hover:text-fg"
                >
                  hola@example.com
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/0000000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-fg"
                >
                  +000 0000 0000
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/your_handle"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-fg"
                >
                  @your_handle
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-detail text-xs uppercase tracking-widest text-accent">
              Síguenos
            </p>
            <ul className="mt-4 space-y-2">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm transition-colors hover:text-fg"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            <p className="font-detail text-xs uppercase tracking-widest text-accent mt-8">
              Legal
            </p>
            <ul className="mt-4 space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors hover:text-fg"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-fg-muted/20 pt-6 text-xs">
          <p>
            © {new Date().getFullYear()} LUMEN Estudio · Costa Rica. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
