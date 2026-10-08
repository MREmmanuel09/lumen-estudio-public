// Formato de EXIF para UI. Puro y client-safe (sin dependencias pesadas).

/** "0.004" → "1/250" · "2" → '2"' · null → null */
export function formatShutterSpeed(seconds: number | null): string | null {
  if (seconds === null) return null;
  if (seconds >= 1) {
    const rounded = Math.round(seconds * 10) / 10;
    return `${rounded}"`;
  }
  const denom = Math.round(1 / seconds);
  if (denom <= 0) return null;
  return `1/${denom}`;
}

/** true si hay al menos un dato fotográfico para mostrar */
export function hasPhotoExif(exif: {
  focalLength: number | null;
  aperture: number | null;
  shutterSpeed: number | null;
  iso: number | null;
}): boolean {
  return (
    exif.focalLength !== null ||
    exif.aperture !== null ||
    exif.shutterSpeed !== null ||
    exif.iso !== null
  );
}

/**
 * Línea artística de ajustes: "85 mm · ƒ/1.8 · 1/250 · ISO 100".
 * Solo incluye los datos presentes. null si no hay ninguno.
 */
export function formatExifLine(exif: {
  focalLength: number | null;
  aperture: number | null;
  shutterSpeed: number | null;
  iso: number | null;
}): string | null {
  const parts: string[] = [];
  if (exif.focalLength !== null) {
    const mm = Math.round(exif.focalLength);
    parts.push(`${mm} mm`);
  }
  if (exif.aperture !== null) {
    const f = Math.round(exif.aperture * 10) / 10;
    parts.push(`ƒ/${f}`);
  }
  const shutter = formatShutterSpeed(exif.shutterSpeed);
  if (shutter) parts.push(shutter);
  if (exif.iso !== null) parts.push(`ISO ${Math.round(exif.iso)}`);
  if (parts.length === 0) return null;
  return parts.join(' · ');
}

/** "Canon" + "Canon EOS R5" → "Canon EOS R5" (evita repetir marca) */
export function formatCameraName(
  make: string | null,
  model: string | null,
): string | null {
  if (!model) return make;
  if (make && model.toLowerCase().startsWith(make.toLowerCase())) return model;
  if (make) return `${make} ${model}`;
  return model;
}
