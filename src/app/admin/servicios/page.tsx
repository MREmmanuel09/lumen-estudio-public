import { db } from '@/lib/db';
import { AdminServicesManager } from './AdminServicesManager';

function featuresToText(features: string): string {
  try {
    const parsed: unknown = JSON.parse(features);
    if (Array.isArray(parsed)) {
      return parsed.filter((f): f is string => typeof f === 'string').join('\n');
    }
  } catch {
    // cae al string crudo
  }
  return features;
}

export default async function AdminServicesPage() {
  const services = await db.service.findMany({
    orderBy: [{ order: 'asc' }, { title: 'asc' }],
  });

  return (
    <div>
      <div className="mb-8">
        <p className="font-detail text-xs uppercase tracking-widest text-accent">
          Gestión
        </p>
        <h1 className="mt-2 font-display text-display-md text-fg">Servicios</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Servicios de la home y sus páginas de detalle. Si ninguno está
          visible, la sección se oculta automáticamente.
        </p>
      </div>
      <AdminServicesManager
        initialServices={services.map((s) => ({
          id: s.id,
          title: s.title,
          slug: s.slug,
          description: s.description ?? '',
          priceLabel: s.priceLabel,
          priceNote: s.priceNote,
          durationLabel: s.durationLabel,
          featuresText: featuresToText(s.features),
          icon: s.icon,
          image: s.image,
          order: s.order,
          visible: s.visible,
        }))}
      />
    </div>
  );
}
