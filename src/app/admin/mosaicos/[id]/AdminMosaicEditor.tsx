'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowUp,
  ArrowDown,
  Star,
  Trash2,
  Save,
  Loader2,
  ImageIcon,
  Video as VideoIcon,
  Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { FileUploader } from '@/components/admin/FileUploader';
import { ExifFieldsForm, type ExifPayload } from '@/components/admin/ExifFieldsForm';
import { formatCameraName, formatExifLine } from '@/lib/exif-format';
import {
  MAX_IMAGES_PER_MOSAIC,
  MAX_VIDEOS_PER_MOSAIC,
  MAX_FILES_PER_MOSAIC,
} from '@/lib/file-limits';

interface MosaicFileExif {
  cameraMake: string | null;
  cameraModel: string | null;
  lensModel: string | null;
  focalLength: number | null;
  aperture: number | null;
  shutterSpeed: number | null;
  iso: number | null;
  takenAt: string | null;
}

interface MosaicFile {
  id: string;
  url: string;
  type: string; // 'IMAGE' | 'VIDEO' — string en SQLite, enum en Postgres
  altText: string | null;
  order: number;
  exif: MosaicFileExif | null;
}

interface Mosaic {
  id: string;
  title: string;
  description: string | null;
  categoryId: string;
  coverFileId: string | null;
  category: { id: string; name: string; slug: string };
  files: MosaicFile[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  mosaic: Mosaic;
  categories: Category[];
}

const metaSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  categoryId: z.string().min(1),
});

export function AdminMosaicEditor({ mosaic: initial, categories }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [mosaic, setMosaic] = useState(initial);
  const [deletingFile, setDeletingFile] = useState<MosaicFile | null>(null);
  const [editingExif, setEditingExif] = useState<MosaicFile | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);

  const imageCount = mosaic.files.filter((f) => f.type === 'IMAGE').length;
  const videoCount = mosaic.files.filter((f) => f.type === 'VIDEO').length;
  const totalCount = mosaic.files.length;

  const refresh = () => startTransition(() => router.refresh());

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(metaSchema),
    defaultValues: {
      title: mosaic.title,
      description: mosaic.description ?? '',
      categoryId: mosaic.categoryId,
    },
  });

  const handleSaveMeta = async (data: z.infer<typeof metaSchema>) => {
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/mosaics/${mosaic.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Error');
      toast.success('Mosaico actualizado');
      setMosaic((m) => ({ ...m, ...data }));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSavingMeta(false);
    }
  };

  const handleUploadComplete = (file: {
    id: string;
    url: string;
    type: string;
    altText: string | null;
    order: number;
    cameraMake?: string | null;
    cameraModel?: string | null;
    lensModel?: string | null;
    focalLength?: number | null;
    aperture?: number | null;
    shutterSpeed?: number | null;
    iso?: number | null;
    takenAt?: string | null;
  }) => {
    const hasExif =
      file.cameraMake != null ||
      file.cameraModel != null ||
      file.lensModel != null ||
      file.focalLength != null ||
      file.aperture != null ||
      file.shutterSpeed != null ||
      file.iso != null ||
      file.takenAt != null;
    const next: MosaicFile = {
      id: file.id,
      url: file.url,
      type: file.type,
      altText: file.altText,
      order: file.order,
      exif: hasExif
        ? {
            cameraMake: file.cameraMake ?? null,
            cameraModel: file.cameraModel ?? null,
            lensModel: file.lensModel ?? null,
            focalLength: file.focalLength ?? null,
            aperture: file.aperture ?? null,
            shutterSpeed: file.shutterSpeed ?? null,
            iso: file.iso ?? null,
            takenAt: file.takenAt ?? null,
          }
        : null,
    };
    setMosaic((m) => ({ ...m, files: [...m.files, next] }));
    refresh();
  };

  const handleDeleteFile = async () => {
    if (!deletingFile) return;
    try {
      const res = await fetch(`/api/files/${deletingFile.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Error');
      toast.success('Archivo eliminado');
      setMosaic((m) => {
        const newFiles = m.files.filter((f) => f.id !== deletingFile.id);
        // Si era cover, limpiar
        const newCover = m.coverFileId === deletingFile.id ? null : m.coverFileId;
        return { ...m, files: newFiles, coverFileId: newCover };
      });
      setDeletingFile(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleSetCover = async (fileId: string) => {
    const newCover = mosaic.coverFileId === fileId ? null : fileId;
    try {
      const res = await fetch(`/api/mosaics/${mosaic.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverFileId: newCover }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Error');
      toast.success(newCover ? 'Portada actualizada' : 'Portada removida');
      setMosaic((m) => ({ ...m, coverFileId: newCover }));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleMove = async (fileId: string, direction: -1 | 1) => {
    const sorted = [...mosaic.files].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((f) => f.id === fileId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const reordered = [...sorted];
    const moved = reordered.splice(idx, 1)[0];
    if (!moved) return;
    reordered.splice(newIdx, 0, moved);
    const updates = reordered.map((f, i) => ({ id: f.id, order: i }));
    try {
      const res = await fetch('/api/files/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: updates }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Error');
      setMosaic((m) => ({ ...m, files: reordered.map((f, i) => ({ ...f, order: i })) }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al reordenar');
    }
  };

  return (
    <div className="space-y-8">
      {/* Metadata */}
      <section className="border border-border bg-bg-elevated p-6">
        <h2 className="font-display text-xl text-fg">Información del mosaico</h2>
        <form onSubmit={handleSubmit(handleSaveMeta)} className="mt-6 space-y-4">
          <Input
            label="Título"
            required
            {...register('title')}
            error={errors.title?.message}
          />
          <Textarea
            label="Descripción"
            rows={3}
            {...register('description')}
            error={errors.description?.message}
          />
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="categoryId"
              className="font-detail text-xs uppercase tracking-widest text-fg-muted"
            >
              Categoría
            </label>
            <select
              id="categoryId"
              {...register('categoryId')}
              className="w-full border border-border bg-transparent px-4 py-3 text-base text-fg focus:border-accent focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              isLoading={savingMeta}
              onClick={() => {
                // Forzar submit del form
                const form = document.querySelector('form');
                if (form) form.requestSubmit();
              }}
            >
              <Save className="h-4 w-4" />
              Guardar cambios
            </Button>
          </div>
        </form>
      </section>

      {/* Uploader */}
      <section className="border border-border bg-bg-elevated p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl text-fg">Archivos</h2>
            <p className="mt-1 font-detail text-xs uppercase tracking-widest text-fg-muted">
              {imageCount}/{MAX_IMAGES_PER_MOSAIC} imágenes · {videoCount}/{MAX_VIDEOS_PER_MOSAIC} videos · {totalCount}/{MAX_FILES_PER_MOSAIC} total
            </p>
          </div>
        </div>

        <div className="mt-4">
          <FileUploader
            mosaicId={mosaic.id}
            currentCounts={{ images: imageCount, videos: videoCount, total: totalCount }}
            onUploaded={handleUploadComplete}
          />
        </div>

        {/* Lista de archivos */}
        {mosaic.files.length > 0 && (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mosaic.files
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((file, idx, arr) => (
                <li
                  key={file.id}
                  className={`group relative border bg-bg ${mosaic.coverFileId === file.id ? 'border-accent' : 'border-border'}`}
                >
                  <div className="relative aspect-square overflow-hidden bg-bg-elevated">
                    {file.type === 'IMAGE' ? (
                      <Image
                        src={file.url}
                        alt={file.altText ?? ''}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <VideoIcon className="h-12 w-12 text-fg-muted" />
                      </div>
                    )}
                    {mosaic.coverFileId === file.id && (
                      <div className="absolute left-2 top-2 flex items-center gap-1 bg-accent px-2 py-1 font-detail text-xs uppercase tracking-widest text-accent-fg">
                        <Star className="h-3 w-3" fill="currentColor" />
                        Portada
                      </div>
                    )}
                  </div>
                  {file.type === 'IMAGE' && file.exif && (
                    <p className="border-t border-border px-2 py-1.5 font-detail text-[10px] uppercase tracking-[0.18em] text-fg-muted">
                      {(() => {
                        const camera = formatCameraName(file.exif.cameraMake, file.exif.cameraModel);
                        const line = formatExifLine(file.exif);
                        return [camera, line].filter(Boolean).join(' · ') || 'Sin datos EXIF';
                      })()}
                    </p>
                  )}
                  <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(file.id, -1)}
                        disabled={idx === 0}
                        className="flex h-7 w-7 items-center justify-center text-fg-muted transition-colors hover:bg-bg-elevated hover:text-fg disabled:opacity-30"
                        aria-label="Subir"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(file.id, 1)}
                        disabled={idx === arr.length - 1}
                        className="flex h-7 w-7 items-center justify-center text-fg-muted transition-colors hover:bg-bg-elevated hover:text-fg disabled:opacity-30"
                        aria-label="Bajar"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      {file.type === 'IMAGE' && (
                        <button
                          type="button"
                          onClick={() => setEditingExif(file)}
                          className="flex h-7 w-7 items-center justify-center text-fg-muted transition-colors hover:text-accent"
                          aria-label="Editar ficha técnica"
                          title="Ficha técnica"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSetCover(file.id)}
                        className={`flex h-7 w-7 items-center justify-center transition-colors ${
                          mosaic.coverFileId === file.id
                            ? 'text-accent'
                            : 'text-fg-muted hover:text-accent'
                        }`}
                        aria-label="Marcar como portada"
                      >
                        <Star
                          className="h-4 w-4"
                          fill={mosaic.coverFileId === file.id ? 'currentColor' : 'none'}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingFile(file)}
                        className="flex h-7 w-7 items-center justify-center text-fg-muted transition-colors hover:bg-danger/10 hover:text-danger"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={!!deletingFile}
        onClose={() => setDeletingFile(null)}
        onConfirm={handleDeleteFile}
        title="Eliminar archivo"
        description={
          deletingFile
            ? `Vas a eliminar este ${deletingFile.type === 'IMAGE' ? 'imagen' : 'video'} del mosaico. Si era la portada, se quitará.`
            : ''
        }
        confirmText="Eliminar"
        requireText="ELIMINAR"
      />

      {editingExif && (
        <ExifEditModal
          file={editingExif}
          onClose={() => setEditingExif(null)}
          onSaved={(exif) => {
            setMosaic((m) => ({
              ...m,
              files: m.files.map((f) => (f.id === editingExif.id ? { ...f, exif } : f)),
            }));
            setEditingExif(null);
            toast.success('Ficha técnica actualizada');
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ExifEditModal({
  file,
  onClose,
  onSaved,
}: {
  file: MosaicFile;
  onClose: () => void;
  onSaved: (exif: MosaicFile['exif']) => void;
}) {
  const toast = useToast();
  const [payload, setPayload] = useState<ExifPayload>({});
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const save = async (body: ExifPayload | Record<string, null>) => {
    const res = await fetch(`/api/files/${file.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message ?? 'Error al guardar');
    }
    const d = json.data;
    return {
      cameraMake: d.cameraMake ?? null,
      cameraModel: d.cameraModel ?? null,
      lensModel: d.lensModel ?? null,
      focalLength: d.focalLength ?? null,
      aperture: d.aperture ?? null,
      shutterSpeed: d.shutterSpeed ?? null,
      iso: d.iso ?? null,
      takenAt: d.takenAt ?? null,
    };
  };

  const handleSave = async () => {
    if (Object.keys(payload).length === 0) {
      toast.error('Tildá al menos un campo para guardar');
      return;
    }
    setSaving(true);
    try {
      onSaved(await save(payload));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await save({
        cameraMake: null,
        cameraModel: null,
        lensModel: null,
        focalLength: null,
        aperture: null,
        shutterSpeed: null,
        iso: null,
        takenAt: null,
      });
      onSaved(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al borrar');
    } finally {
      setClearing(false);
    }
  };

  return (
    <Modal open onClose={onClose} ariaLabel="Editar ficha técnica" className="max-w-xl">
      <div className="p-6">
        <h2 className="font-display text-2xl text-fg">Ficha técnica</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Solo se actualizan los campos tildados. Los destildados quedan como están.
        </p>
        <div className="mt-6">
          <ExifFieldsForm
            idPrefix={`edit-${file.id}`}
            initial={{
              cameraMake: file.exif?.cameraMake,
              cameraModel: file.exif?.cameraModel,
              lensModel: file.exif?.lensModel,
              focalLength: file.exif?.focalLength,
              aperture: file.exif?.aperture,
              shutterSpeed: file.exif?.shutterSpeed,
              iso: file.exif?.iso,
              takenAt: file.exif?.takenAt,
            }}
            onChange={setPayload}
          />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={handleClear}
            isLoading={clearing}
            disabled={saving}
            className="text-danger hover:bg-danger/10 hover:text-danger"
          >
            Borrar ficha
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" type="button" onClick={onClose} disabled={saving || clearing}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} isLoading={saving} disabled={clearing}>
              Guardar ficha
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Re-export para evitar warning de import no usado
export { ImageIcon, Loader2 };
