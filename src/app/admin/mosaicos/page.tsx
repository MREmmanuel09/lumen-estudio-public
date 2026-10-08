import { db } from '@/lib/db';
import { AdminMosaicsManager } from './AdminMosaicsManager';

export default async function AdminMosaicsPage() {
  const [mosaics, categories] = await Promise.all([
    db.galleryMosaic.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { files: true } },
      },
    }),
    db.galleryCategory.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <p className="font-detail text-xs uppercase tracking-widest text-accent">
          Gestión
        </p>
        <h1 className="mt-2 font-display text-display-md text-fg">Mosaicos</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Administra los mosaicos del portafolio. Tocá uno para editar sus archivos.
        </p>
      </div>
      <AdminMosaicsManager
        initialMosaics={mosaics.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          categoryId: m.categoryId,
          category: m.category,
          fileCount: m._count.files,
        }))}
        categories={categories}
      />
    </div>
  );
}
