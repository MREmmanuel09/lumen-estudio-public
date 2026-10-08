// File validation utilities — magic bytes, dimensiones, MIME allowlist.
// Ver CONTRATOS_TECNICOS.md §5.
//
// Este archivo importa 'sharp' y 'file-type' (solo server-side).
// Para constantes sin dependencias pesadas, importá desde `@/lib/file-limits`.

import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MIN_IMAGE_SIDE,
  MAX_IMAGE_SIDE,
  type AllowedImageMime,
  type AllowedVideoMime,
  type AllowedMime,
} from './file-limits';

export {
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MIN_IMAGE_SIDE,
  MAX_IMAGE_SIDE,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
  MIN_IMAGES_PER_MOSAIC,
  MAX_IMAGES_PER_MOSAIC,
  MIN_VIDEOS_PER_MOSAIC,
  MAX_VIDEOS_PER_MOSAIC,
  MIN_FILES_PER_MOSAIC,
  MAX_FILES_PER_MOSAIC,
  type AllowedImageMime,
  type AllowedVideoMime,
  type AllowedMime,
} from './file-limits';

export function isAllowedImage(mime: string): mime is AllowedImageMime {
  return (ALLOWED_IMAGE_MIMES as readonly string[]).includes(mime);
}

export function isAllowedVideo(mime: string): mime is AllowedVideoMime {
  return (ALLOWED_VIDEO_MIMES as readonly string[]).includes(mime);
}

export function isAllowedMime(mime: string): mime is AllowedMime {
  return isAllowedImage(mime) || isAllowedVideo(mime);
}

export interface DetectedFileType {
  mime: AllowedMime;
  ext: string;
}

/**
 * Detecta el MIME real del archivo leyendo magic bytes.
 * NUNCA confiar en el Content-Type del request ni en la extensión.
 */
export async function detectFileType(buffer: Buffer): Promise<DetectedFileType | null> {
  const result = await fileTypeFromBuffer(buffer);
  if (!result) return null;
  if (!isAllowedMime(result.mime)) return null;
  return { mime: result.mime, ext: result.ext };
}

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Lee dimensiones de una imagen. Falla si no es una imagen soportada por sharp.
 */
export async function getImageDimensions(buffer: Buffer): Promise<ImageDimensions> {
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) {
    throw new Error('No se pudieron leer las dimensiones de la imagen');
  }
  return { width: meta.width, height: meta.height };
}

/**
 * Valida que una imagen cumpla con los requisitos mínimos/máximos.
 */
export function validateImageDimensions(dim: ImageDimensions): { valid: boolean; reason?: string } {
  const shortest = Math.min(dim.width, dim.height);
  const longest = Math.max(dim.width, dim.height);
  if (shortest < MIN_IMAGE_SIDE) {
    return { valid: false, reason: `El lado más corto debe tener al menos ${MIN_IMAGE_SIDE}px (tiene ${shortest}px)` };
  }
  if (longest > MAX_IMAGE_SIDE) {
    return { valid: false, reason: `El lado más largo no puede superar ${MAX_IMAGE_SIDE}px (tiene ${longest}px)` };
  }
  return { valid: true };
}

export interface FileValidationResult {
  mime: AllowedMime;
  ext: string;
  /** Solo para imágenes */
  dimensions?: ImageDimensions;
}

/**
 * Validación completa: MIME + tamaño + (dimensiones si es imagen).
 * Lanza Error con mensaje legible si falla.
 */
export async function validateFile(
  buffer: Buffer,
  declaredType: 'IMAGE' | 'VIDEO',
): Promise<FileValidationResult> {
  // 1. Detectar MIME real
  const detected = await detectFileType(buffer);
  if (!detected) {
    throw new Error('Tipo de archivo no permitido o no detectable');
  }

  // 2. Verificar que coincide con el tipo declarado
  if (declaredType === 'IMAGE' && !isAllowedImage(detected.mime)) {
    throw new Error('Se esperaba una imagen pero el archivo no lo es');
  }
  if (declaredType === 'VIDEO' && !isAllowedVideo(detected.mime)) {
    throw new Error('Se esperaba un video pero el archivo no lo es');
  }

  // 3. Verificar tamaño
  const maxSize = isAllowedImage(detected.mime) ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (buffer.length > maxSize) {
    const mb = (maxSize / 1024 / 1024).toFixed(0);
    throw new Error(`El archivo excede el tamaño máximo de ${mb}MB`);
  }

  // 4. Si es imagen, validar dimensiones
  const result: FileValidationResult = { mime: detected.mime, ext: detected.ext };
  if (isAllowedImage(detected.mime)) {
    const dimensions = await getImageDimensions(buffer);
    const dimCheck = validateImageDimensions(dimensions);
    if (!dimCheck.valid) {
      throw new Error(dimCheck.reason);
    }
    result.dimensions = dimensions;
  }

  return result;
}
