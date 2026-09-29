// Extracción y formato de EXIF para fotos del portafolio.
// Solo imágenes (los videos no traen EXIF útil).
//
// PRIVACIDAD: nunca se lee ni se guarda ubicación (GPS) ni miniaturas.
// Se usa `pick` para pedir únicamente los tags necesarios.

import exifr from 'exifr';

export interface PhotoExif {
  cameraMake: string | null;
  cameraModel: string | null;
  lensModel: string | null;
  /** Milímetros */
  focalLength: number | null;
  /** Número f (ej. 1.8) */
  aperture: number | null;
  /** Segundos (ej. 0.004 = 1/250) */
  shutterSpeed: number | null;
  iso: number | null;
  takenAt: Date | null;
}

const EMPTY_EXIF: PhotoExif = {
  cameraMake: null,
  cameraModel: null,
  lensModel: null,
  focalLength: null,
  aperture: null,
  shutterSpeed: null,
  iso: null,
  takenAt: null,
};

function cleanString(value: unknown, max = 80): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\0/g, '').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function cleanNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

/**
 * Extrae EXIF de un buffer JPEG. Best-effort: si no hay EXIF o falla el
 * parseo, devuelve todo null (nunca lanza).
 */
export async function extractPhotoExif(buffer: Buffer): Promise<PhotoExif> {
  try {
    const tags = (await exifr.parse(buffer, {
      pick: [
        'Make',
        'Model',
        'LensModel',
        'FocalLength',
        'FNumber',
        'ExposureTime',
        'ISO',
        'DateTimeOriginal',
      ],
    })) as Record<string, unknown> | undefined;
    if (!tags) return { ...EMPTY_EXIF };

    const takenAt =
      tags['DateTimeOriginal'] instanceof Date && !isNaN(tags['DateTimeOriginal'].getTime())
        ? (tags['DateTimeOriginal'] as Date)
        : null;

    return {
      cameraMake: cleanString(tags['Make'], 40),
      cameraModel: cleanString(tags['Model'], 60),
      lensModel: cleanString(tags['LensModel'], 80),
      focalLength: cleanNumber(tags['FocalLength']),
      aperture: cleanNumber(tags['FNumber']),
      shutterSpeed: cleanNumber(tags['ExposureTime']),
      iso: cleanNumber(tags['ISO']),
      takenAt,
    };
  } catch {
    return { ...EMPTY_EXIF };
  }
}


