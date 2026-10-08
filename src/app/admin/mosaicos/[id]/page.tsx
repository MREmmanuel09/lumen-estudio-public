import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { AdminMosaicEditor } from './AdminMosaicEditor';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminMosaicEditPage({ params }: PageProps) {
  const { id } = await params;
  const mosaic = await db.galleryMosaic.findUnique({
    where: { id },
    include: {
      category: true,
      files: { orderBy: { order: 'asc' } },
    },
  });
  if (!mosaic) notFound();

  const categories = await db.galleryCategory.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  });

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 font-detail text-xs uppercase tracking-widest text-fg-muted">
        <a href="/admin/mosaicos" className="hover:text-fg">Mosaicos</a>
        <span>/</span>
        <span className="text-fg">{mosaic.title}</span>
      </div>

      <AdminMosaicEditor
        mosaic={{
          id: mosaic.id,
          title: mosaic.title,
          description: mosaic.description,
          categoryId: mosaic.categoryId,
          coverFileId: mosaic.coverFileId,
          category: mosaic.category,
          files: mosaic.files.map((f) => ({
            id: f.id,
            url: f.url,
            type: f.type,
            altText: f.altText,
            order: f.order,
            exif:
              f.cameraMake !== null ||
              f.cameraModel !== null ||
              f.lensModel !== null ||
              f.focalLength !== null ||
              f.aperture !== null ||
              f.shutterSpeed !== null ||
              f.iso !== null ||
              f.takenAt !== null
                ? {
                    cameraMake: f.cameraMake,
                    cameraModel: f.cameraModel,
                    lensModel: f.lensModel,
                    focalLength: f.focalLength,
                    aperture: f.aperture,
                    shutterSpeed: f.shutterSpeed,
                    iso: f.iso,
                    takenAt: f.takenAt ? f.takenAt.toISOString() : null,
                  }
                : null,
          })),
        }}
        categories={categories}
      />
    </div>
  );
}
