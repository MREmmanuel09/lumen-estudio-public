import { cn } from '@/lib/utils';
import { formatCameraName, formatExifLine } from '@/lib/exif-format';
import type { PhotoExifInfo } from '@/services/gallery';

interface ExifCaptionProps {
  exif: PhotoExifInfo | null;
  className?: string;
}

/**
 * Ficha técnica artística de la foto:
 *   Canon EOS R5 · RF85mm F1.2 L USM
 *   85 mm · ƒ/1.8 · 1/250 · ISO 100
 * No renderiza nada si no hay datos.
 */
export function ExifCaption({ exif, className }: ExifCaptionProps) {
  if (!exif) return null;
  const camera = formatCameraName(exif.cameraMake, exif.cameraModel);
  const gear = [camera, exif.lensModel].filter(Boolean).join(' · ');
  const line = formatExifLine(exif);
  if (!gear && !line) return null;

  return (
    <div className={cn('font-detail uppercase tracking-[0.18em]', className)}>
      {gear && <p className="text-[11px] text-fg-muted">{gear}</p>}
      {line && <p className="mt-1 text-[11px] text-accent">{line}</p>}
    </div>
  );
}
