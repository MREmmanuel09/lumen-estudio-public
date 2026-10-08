'use client';

import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { Upload, AlertCircle, CheckCircle2, Loader2, X, ChevronDown, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { ExifFieldsForm, type ExifPayload } from './ExifFieldsForm';
import {
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_IMAGES_PER_MOSAIC,
  MAX_VIDEOS_PER_MOSAIC,
  MAX_FILES_PER_MOSAIC,
} from '@/lib/file-limits';

type FileType = 'IMAGE' | 'VIDEO';

interface FileUploaderProps {
  mosaicId: string;
  currentCounts: { images: number; videos: number; total: number };
  onUploaded: (file: { id: string; url: string; type: FileType; altText: string | null; order: number }) => void;
}

interface UploadingFile {
  id: string;
  file: File;
  type: FileType;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  exif?: ExifPayload;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

function detectType(file: File): FileType | null {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) return 'IMAGE';
  if (ALLOWED_VIDEO_TYPES.includes(file.type)) return 'VIDEO';
  return null;
}

export function FileUploader({ mosaicId, currentCounts, onUploaded }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const pendingCount = uploading.filter((u) => u.status === 'pending').length;

  // Validar y dejar en staging (no sube todavía: permite cargar ficha por foto)
  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;

    // Los ya en staging cuentan para los límites (el servidor valida de nuevo igual)
    const staged = uploading.filter((u) => u.status === 'pending');
    let imagesQueued =
      currentCounts.images + staged.filter((u) => u.type === 'IMAGE').length;
    let videosQueued =
      currentCounts.videos + staged.filter((u) => u.type === 'VIDEO').length;
    let totalQueued = currentCounts.total + staged.length;

    const items: UploadingFile[] = [];

    for (const file of arr) {
      const type = detectType(file);
      if (!type) {
        items.push({
          id: crypto.randomUUID(),
          file,
          type: 'IMAGE',
          status: 'error',
          error: 'Tipo no permitido',
        });
        continue;
      }

      // Límites
      if (totalQueued >= MAX_FILES_PER_MOSAIC) {
        items.push({
          id: crypto.randomUUID(),
          file,
          type,
          status: 'error',
          error: `Máximo ${MAX_FILES_PER_MOSAIC} archivos`,
        });
        continue;
      }
      if (type === 'IMAGE' && imagesQueued >= MAX_IMAGES_PER_MOSAIC) {
        items.push({
          id: crypto.randomUUID(),
          file,
          type,
          status: 'error',
          error: `Máximo ${MAX_IMAGES_PER_MOSAIC} imágenes`,
        });
        continue;
      }
      if (type === 'VIDEO' && videosQueued >= MAX_VIDEOS_PER_MOSAIC) {
        items.push({
          id: crypto.randomUUID(),
          file,
          type,
          status: 'error',
          error: `Máximo ${MAX_VIDEOS_PER_MOSAIC} videos`,
        });
        continue;
      }

      // Tamaño
      const maxSize = type === 'IMAGE' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
      if (file.size > maxSize) {
        const mb = (maxSize / 1024 / 1024).toFixed(0);
        items.push({
          id: crypto.randomUUID(),
          file,
          type,
          status: 'error',
          error: `Excede ${mb}MB`,
        });
        continue;
      }

      items.push({ id: crypto.randomUUID(), file, type, status: 'pending' });
      if (type === 'IMAGE') imagesQueued += 1;
      else videosQueued += 1;
      totalQueued += 1;
    }

    setUploading((prev) => [...prev, ...items]);
  };

  const setExif = (id: string, payload: ExifPayload) => {
    setUploading((prev) => prev.map((u) => (u.id === id ? { ...u, exif: payload } : u)));
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const uploadOne = async (item: UploadingFile) => {
    setUploading((prev) =>
      prev.map((u) => (u.id === item.id ? { ...u, status: 'uploading' } : u)),
    );
    const fd = new FormData();
    fd.append('file', item.file);
    fd.append('mosaicId', mosaicId);
    fd.append('type', item.type);
    if (item.type === 'IMAGE' && item.exif && Object.keys(item.exif).length > 0) {
      fd.append('exif', JSON.stringify(item.exif));
    }

    try {
      const res = await fetch('/api/files', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Error al subir');
      }
      onUploaded(json.data);
      setUploading((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, status: 'done' } : u)),
      );
      // Quitar de la lista tras 2s
      setTimeout(() => {
        setUploading((prev) => prev.filter((u) => u.id !== item.id));
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error';
      setUploading((prev) =>
        prev.map((u) =>
          u.id === item.id ? { ...u, status: 'error', error: msg } : u,
        ),
      );
    }
  };

  const handleUploadAll = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const pendings = uploading.filter((u) => u.status === 'pending');
      for (const item of pendings) {
        await uploadOne(item);
      }
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-3 border-2 border-dashed border-border bg-bg p-8 text-center transition-colors hover:border-accent',
          dragOver && 'border-accent bg-accent/5',
        )}
      >
        <Upload className="h-8 w-8 text-fg-muted" aria-hidden="true" />
        <div>
          <p className="font-display text-lg text-fg">
            Arrastrá archivos o hacé clic para seleccionar
          </p>
          <p className="mt-1 font-detail text-xs uppercase tracking-widest text-fg-muted">
            JPEG, PNG, WebP, AVIF (max 5MB) · MP4, WebM (max 20MB)
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            Luego podés cargar la ficha técnica por foto antes de subir.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
          multiple
          onChange={onChange}
          className="hidden"
        />
      </button>

      {/* Lista de archivos en staging / proceso */}
      {uploading.length > 0 && (
        <div className="mt-4">
          {pendingCount > 0 && (
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-fg-muted">
                {pendingCount} pendiente{pendingCount === 1 ? '' : 's'} de subir
              </p>
              <Button size="sm" onClick={handleUploadAll} isLoading={busy}>
                <Upload className="h-4 w-4" />
                Subir {pendingCount} archivo{pendingCount === 1 ? '' : 's'}
              </Button>
            </div>
          )}
          <ul className="space-y-2">
            {uploading.map((u) => (
              <li
                key={u.id}
                className={cn(
                  'border p-3 text-sm',
                  u.status === 'error'
                    ? 'border-danger/50 bg-danger/5'
                    : 'border-border bg-bg-elevated',
                  u.status === 'done' && 'border-success/50 bg-success/5',
                )}
              >
                <div className="flex items-center gap-3">
                  {u.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 animate-spin text-fg-muted" />
                  )}
                  {u.status === 'done' && (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  )}
                  {u.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-danger" />
                  )}
                  <span className="flex-1 truncate">
                    {u.file.name}{' '}
                    <span className="text-fg-muted">
                      ({(u.file.size / 1024 / 1024).toFixed(1)}MB)
                    </span>
                  </span>
                  {u.error && (
                    <span className="text-danger">{u.error}</span>
                  )}
                  {u.status === 'pending' && u.type === 'IMAGE' && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(u.id)}
                      className="flex items-center gap-1 font-detail text-xs uppercase tracking-widest text-accent hover:text-fg"
                      aria-expanded={!!expanded[u.id]}
                    >
                      <Camera className="h-3 w-3" aria-hidden="true" />
                      Ficha
                      <ChevronDown
                        className={cn(
                          'h-3 w-3 transition-transform',
                          expanded[u.id] && 'rotate-180',
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  )}
                  {u.status === 'error' && (
                    <button
                      type="button"
                      onClick={() =>
                        setUploading((prev) => prev.filter((x) => x.id !== u.id))
                      }
                      className="text-fg-muted hover:text-fg"
                      aria-label="Cerrar"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {u.status === 'pending' && u.type === 'IMAGE' && expanded[u.id] && (
                  <div className="mt-3 border-t border-border pt-3">
                    <ExifFieldsForm
                      idPrefix={`up-${u.id}`}
                      onChange={(payload) => setExif(u.id, payload)}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
