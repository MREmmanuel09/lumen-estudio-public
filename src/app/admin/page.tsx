import Link from 'next/link';
import { db } from '@/lib/db';
import { FolderTree, LayoutGrid, Image, BadgeCheck, Briefcase, Mail, Users, ArrowRight } from 'lucide-react';

async function getStats() {
  const [categories, mosaics, images, videos, unreadMessages, users, brandsTotal, brandsVisible, servicesTotal, servicesVisible] = await Promise.all([
    db.galleryCategory.count(),
    db.galleryMosaic.count(),
    db.file.count({ where: { type: 'IMAGE' } }),
    db.file.count({ where: { type: 'VIDEO' } }),
    db.message.count({ where: { read: false } }),
    db.user.count(),
    db.brand.count(),
    db.brand.count({ where: { visible: true } }),
    db.service.count(),
    db.service.count({ where: { visible: true } }),
  ]);
  return {
    categories,
    mosaics,
    images,
    videos,
    totalFiles: images + videos,
    unreadMessages,
    users,
    brands: `${brandsVisible}/${brandsTotal}`,
    services: `${servicesVisible}/${servicesTotal}`,
  };
}

const STATS_CONFIG = [
  {
    key: 'categories',
    label: 'Categorías',
    icon: FolderTree,
    href: '/admin/categorias',
    accent: 'text-accent',
  },
  {
    key: 'mosaics',
    label: 'Mosaicos',
    icon: LayoutGrid,
    href: '/admin/mosaicos',
    accent: 'text-accent',
  },
  {
    key: 'totalFiles',
    label: 'Archivos',
    icon: Image,
    href: '/admin/mosaicos',
    accent: 'text-accent',
  },
  {
    key: 'services',
    label: 'Servicios visibles',
    icon: Briefcase,
    href: '/admin/servicios',
    accent: 'text-accent',
  },
  {
    key: 'brands',
    label: 'Marcas visibles',
    icon: BadgeCheck,
    href: '/admin/marcas',
    accent: 'text-accent',
  },
  {
    key: 'unreadMessages',
    label: 'Mensajes sin leer',
    icon: Mail,
    href: '/admin/mensajes',
    accent: 'text-danger',
  },
  {
    key: 'users',
    label: 'Usuarios',
    icon: Users,
    href: '/admin/usuarios',
    accent: 'text-accent',
  },
] as const;

export default async function AdminDashboardPage() {
  const stats = await getStats();

  return (
    <div>
      <div className="mb-8">
        <p className="font-detail text-xs uppercase tracking-widest text-accent">
          Panel
        </p>
        <h1 className="mt-2 font-display text-display-md text-fg">Dashboard</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Resumen del estado actual del sitio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {STATS_CONFIG.map((cfg) => {
          const Icon = cfg.icon;
          const value = stats[cfg.key as keyof typeof stats];
          return (
            <Link
              key={cfg.key}
              href={cfg.href}
              className="group border border-border bg-bg-elevated p-6 transition-colors hover:border-accent"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-detail text-xs uppercase tracking-widest text-fg-muted">
                    {cfg.label}
                  </p>
                  <p className={`mt-3 font-display text-4xl ${cfg.accent}`}>
                    {value}
                  </p>
                </div>
                <Icon className={`h-5 w-5 ${cfg.accent}`} aria-hidden="true" />
              </div>
              <div className="mt-4 inline-flex items-center gap-1 font-detail text-xs uppercase tracking-widest text-fg-muted transition-colors group-hover:text-fg">
                Ver
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Detalle adicional */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="border border-border bg-bg-elevated p-6">
          <h2 className="font-display text-xl text-fg">Archivos por tipo</h2>
          <div className="mt-4 flex gap-6">
            <div>
              <p className="font-detail text-xs uppercase tracking-widest text-fg-muted">
                Imágenes
              </p>
              <p className="mt-1 font-display text-3xl text-accent">{stats.images}</p>
            </div>
            <div>
              <p className="font-detail text-xs uppercase tracking-widest text-fg-muted">
                Videos
              </p>
              <p className="mt-1 font-display text-3xl text-accent">{stats.videos}</p>
            </div>
          </div>
        </div>

        <div className="border border-border bg-bg-elevated p-6">
          <h2 className="font-display text-xl text-fg">Acciones rápidas</h2>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/admin/categorias"
              className="border border-border p-3 text-sm text-fg transition-colors hover:border-accent hover:bg-bg"
            >
              + Nueva categoría
            </Link>
            <Link
              href="/admin/mosaicos"
              className="border border-border p-3 text-sm text-fg transition-colors hover:border-accent hover:bg-bg"
            >
              + Nuevo mosaico
            </Link>
            <Link
              href="/admin/mensajes"
              className="border border-border p-3 text-sm text-fg transition-colors hover:border-accent hover:bg-bg"
            >
              Ver mensajes ({stats.unreadMessages} sin leer)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
