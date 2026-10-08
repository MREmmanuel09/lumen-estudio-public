'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderTree,
  LayoutGrid,
  BadgeCheck,
  Briefcase,
  Mail,
  Users,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToastProvider } from '@/components/ui/Toast';

const NAV_ITEMS: Array<{ href: Route; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/categorias', label: 'Categorías', icon: FolderTree },
  { href: '/admin/mosaicos', label: 'Mosaicos', icon: LayoutGrid },
  { href: '/admin/servicios', label: 'Servicios', icon: Briefcase },
  { href: '/admin/marcas', label: 'Marcas', icon: BadgeCheck },
  { href: '/admin/mensajes', label: 'Mensajes', icon: Mail },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AdminShellInner>{children}</AdminShellInner>
    </ToastProvider>
  );
}

function AdminShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg px-4 py-3 md:hidden">
        <Link href="/admin" className="font-display text-xl text-fg">
          LUMEN · Admin
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-10 w-10 items-center justify-center"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-bg-elevated md:flex md:flex-col">
          <SidebarContent isActive={isActive} onLogout={handleLogout} />
        </aside>

        {/* Sidebar mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              onClick={() => setDrawerOpen(false)}
              aria-label="Cerrar menú"
            />
            <aside className="absolute left-0 top-0 h-full w-72 border-r border-border bg-bg-elevated shadow-2xl">
              <div className="flex items-center justify-between border-b border-border p-4">
                <Link
                  href="/admin"
                  onClick={() => setDrawerOpen(false)}
                  className="font-display text-xl text-fg"
                >
                  LUMEN · Admin
                </Link>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-8 w-8 items-center justify-center"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarContent
                isActive={isActive}
                onNavigate={() => setDrawerOpen(false)}
                onLogout={handleLogout}
              />
            </aside>
          </div>
        )}

        {/* Main */}
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  isActive,
  onNavigate,
  onLogout,
}: {
  isActive: (href: string, exact?: boolean) => boolean;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <nav className="flex h-full flex-col">
      <div className="hidden border-b border-border p-6 md:block">
        <Link href="/admin" className="block">
          <p className="font-display text-2xl text-fg">LUMEN</p>
          <p className="mt-1 font-detail text-xs uppercase tracking-widest text-accent">
            Panel Admin
          </p>
        </Link>
      </div>

      <ul className="flex-1 space-y-1 p-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-accent text-accent-fg'
                    : 'text-fg-muted hover:bg-bg hover:text-fg',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="space-y-1 border-t border-border p-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-fg-muted transition-colors hover:bg-bg hover:text-fg"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Volver al sitio
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-fg-muted transition-colors hover:bg-bg hover:text-fg"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
