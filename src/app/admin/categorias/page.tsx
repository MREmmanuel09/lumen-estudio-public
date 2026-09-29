import { db } from '@/lib/db';
import { AdminCategoriesManager } from './AdminCategoriesManager';

export default async function AdminCategoriesPage() {
  const categories = await db.galleryCategory.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { mosaics: true } } },
  });

  return (
    <div>
      <div className="mb-8">
        <p className="font-detail text-xs uppercase tracking-widest text-accent">
          Gestión
        </p>
        <h1 className="mt-2 font-display text-display-md text-fg">Categorías</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Administra las categorías del portafolio.
        </p>
      </div>
      <AdminCategoriesManager
        initialCategories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description ?? '',
          coverImage: c.coverImage,
          mosaicCount: c._count.mosaics,
        }))}
      />
    </div>
  );
}
