import { db } from '@/lib/db';
import { AdminBrandsManager } from './AdminBrandsManager';

export default async function AdminBrandsPage() {
  const brands = await db.brand.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  });

  return (
    <div>
      <div className="mb-8">
        <p className="font-detail text-xs uppercase tracking-widest text-accent">
          Gestión
        </p>
        <h1 className="mt-2 font-display text-display-md text-fg">Marcas</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Marcas de &ldquo;Han confiado en nosotros&rdquo;. Si ninguna está
          visible, la sección se oculta automáticamente en el sitio.
        </p>
      </div>
      <AdminBrandsManager
        initialBrands={brands.map((b) => ({
          id: b.id,
          name: b.name,
          website: b.website,
          order: b.order,
          visible: b.visible,
        }))}
      />
    </div>
  );
}
