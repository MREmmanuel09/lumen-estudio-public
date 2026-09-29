// POST /api/files — admin
// Sube un archivo a un mosaico, valida tipo, tamaño, dimensiones, límites.

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiError, ok, withApiHandler } from '@/lib/api/response';
import { requireAdmin } from '@/lib/session';
import { getStorage } from '@/lib/storage';
import { validateFile, MAX_IMAGES_PER_MOSAIC, MAX_VIDEOS_PER_MOSAIC, MAX_FILES_PER_MOSAIC } from '@/lib/file-utils';
import { extractPhotoExif } from '@/lib/exif';
import { fileTypeSchema, manualExifSchema, type ManualExifInput } from '@/lib/schemas/file';

export const POST = withApiHandler(async (req: NextRequest) => {
  await requireAdmin();

  // 1. Parsear form-data
  const formData = await req.formData().catch(() => null);
  if (!formData) {
    throw new ApiError('VALIDATION_ERROR', 'Se requiere multipart/form-data');
  }

  const file = formData.get('file');
  const mosaicId = formData.get('mosaicId');
  const type = formData.get('type');

  if (!(file instanceof File)) {
    throw new ApiError('VALIDATION_ERROR', 'Campo "file" requerido');
  }
  if (typeof mosaicId !== 'string' || !mosaicId) {
    throw new ApiError('VALIDATION_ERROR', 'Campo "mosaicId" requerido');
  }
  const typeParsed = fileTypeSchema.safeParse(type);
  if (!typeParsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Campo "type" debe ser IMAGE o VIDEO');
  }

  // 2. Verificar que el mosaico existe
  const mosaic = await db.galleryMosaic.findUnique({
    where: { id: mosaicId },
    include: { category: { select: { slug: true } }, files: true },
  });
  if (!mosaic) {
    throw new ApiError('NOT_FOUND', 'Mosaico no encontrado');
  }

  // 3. Validar límites de archivos
  const currentImages = mosaic.files.filter((f) => f.type === 'IMAGE').length;
  const currentVideos = mosaic.files.filter((f) => f.type === 'VIDEO').length;
  const currentTotal = mosaic.files.length;

  if (currentTotal >= MAX_FILES_PER_MOSAIC) {
    throw new ApiError(
      'VALIDATION_ERROR',
      `El mosaico ya tiene el máximo de ${MAX_FILES_PER_MOSAIC} archivos`,
    );
  }
  if (typeParsed.data === 'IMAGE' && currentImages >= MAX_IMAGES_PER_MOSAIC) {
    throw new ApiError(
      'VALIDATION_ERROR',
      `El mosaico ya tiene el máximo de ${MAX_IMAGES_PER_MOSAIC} imágenes`,
    );
  }
  if (typeParsed.data === 'VIDEO' && currentVideos >= MAX_VIDEOS_PER_MOSAIC) {
    throw new ApiError(
      'VALIDATION_ERROR',
      `El mosaico ya tiene el máximo de ${MAX_VIDEOS_PER_MOSAIC} videos`,
    );
  }

  // 4. Leer buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 5. Validar archivo (MIME, tamaño, dimensiones)
  const validation = await validateFile(buffer, typeParsed.data).catch((err: Error) => {
    throw new ApiError('VALIDATION_ERROR', err.message);
  });

  // 6. Guardar en storage
  const storage = getStorage();
  const saved = await storage.save({
    buffer,
    originalName: file.name,
    mimeType: validation.mime,
    category: typeParsed.data === 'IMAGE' ? 'image' : 'video',
    categorySlug: mosaic.category.slug,
    mosaicId: mosaic.id,
  });

  // 7. EXIF (solo imágenes; best-effort, nunca bloquea la subida).
  // GPS jamás se lee ni se guarda (ver src/lib/exif.ts).
  // Ficha manual del admin (campo `exif` JSON): prima sobre lo auto-extraído.
  const isImage = typeParsed.data === 'IMAGE';
  let manual: ManualExifInput | null = null;
  if (isImage) {
    const rawExif = formData.get('exif');
    if (typeof rawExif === 'string' && rawExif.trim()) {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawExif);
      } catch {
        throw new ApiError('VALIDATION_ERROR', 'Campo "exif" no es JSON válido');
      }
      const manualParsed = manualExifSchema.safeParse(parsedJson);
      if (!manualParsed.success) {
        throw new ApiError('VALIDATION_ERROR', 'Ficha técnica inválida', {
          fields: manualParsed.error.flatten().fieldErrors,
        });
      }
      manual = manualParsed.data;
    }
  }
  const auto = isImage ? await extractPhotoExif(buffer) : null;
  const pickStr = (m?: string | null, a?: string | null): string | null =>
    m && m.trim() ? m : (a ?? null);
  const pickNum = (m?: number | null, a?: number | null): number | null =>
    m ?? a ?? null;
  const exif = {
    cameraMake: pickStr(manual?.cameraMake, auto?.cameraMake),
    cameraModel: pickStr(manual?.cameraModel, auto?.cameraModel),
    lensModel: pickStr(manual?.lensModel, auto?.lensModel),
    focalLength: pickNum(manual?.focalLength, auto?.focalLength),
    aperture: pickNum(manual?.aperture, auto?.aperture),
    shutterSpeed: pickNum(manual?.shutterSpeed, auto?.shutterSpeed),
    iso: pickNum(manual?.iso, auto?.iso),
    takenAt:
      manual?.takenAt != null && manual.takenAt !== ''
        ? new Date(manual.takenAt)
        : (auto?.takenAt ?? null),
  };

  // 8. Crear registro en BD (con rollback manual si falla)
  let dbRecord;
  try {
    dbRecord = await db.file.create({
      data: {
        url: saved.url,
        key: saved.key,
        type: typeParsed.data,
        status: 'READY',
        mosaicId: mosaic.id,
        order: currentTotal,
        width: validation.dimensions?.width ?? null,
        height: validation.dimensions?.height ?? null,
        cameraMake: exif?.cameraMake ?? null,
        cameraModel: exif?.cameraModel ?? null,
        lensModel: exif?.lensModel ?? null,
        focalLength: exif?.focalLength ?? null,
        aperture: exif?.aperture ?? null,
        shutterSpeed: exif?.shutterSpeed ?? null,
        iso: exif?.iso !== null && exif?.iso !== undefined ? Math.round(exif.iso) : null,
        takenAt: exif?.takenAt ?? null,
      },
    });
  } catch (err) {
    // Rollback: eliminar archivo del storage
    await storage.delete(saved.key).catch(() => {});
    throw err;
  }

  return ok(dbRecord, { status: 201 });
});
