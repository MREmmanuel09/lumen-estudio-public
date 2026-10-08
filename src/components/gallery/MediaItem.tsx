'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { fadeScale } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { ExifCaption } from './ExifCaption';
import type { MediaFile } from '@/services/gallery';

interface MediaItemProps {
  file: MediaFile;
  onClick: () => void;
  /** Posición en el mosaico (numeración editorial + patrón de ritmo) */
  index: number;
  /** Pieza destacada: panorámica a doble columna (solo sm+) */
  featured?: boolean;
}

/**
 * Tarjeta individual del mosaico. Soporta imagen y video.
 * Lazy loading nativo (Image con sizes, video con preload="metadata").
 * El marco hairline y el zoom 1.03 acompañan sin competir con la foto.
 */
export function MediaItem({ file, onClick, index, featured = false }: MediaItemProps) {
  const number = String(index + 1).padStart(2, '0');

  return (
    <motion.button
      type="button"
      variants={fadeScale}
      onClick={onClick}
      className={cn(
        'group relative block w-full overflow-hidden border border-border bg-bg-elevated text-left transition-colors duration-300 hover:border-accent/60 hover:shadow-[0_8px_40px_-12px_rgb(var(--color-accent)/0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        featured && 'sm:col-span-2',
      )}
      aria-label={`${file.type === 'video' ? 'Video' : 'Imagen'}: ${file.alt ?? 'Sin descripción'}`}
    >
      <div className={cn('relative', featured ? 'aspect-[16/10]' : 'aspect-[3/4]')}>
        {file.type === 'image' ? (
          <Image
            src={file.url}
            alt={file.alt ?? ''}
            fill
            sizes={
              featured
                ? '(max-width: 768px) 100vw, 66vw'
                : '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            }
            className="object-cover transition-transform duration-700 ease-elegant group-hover:scale-[1.03]"
          />
        ) : (
          <video
            src={file.url}
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover transition-transform duration-700 ease-elegant group-hover:scale-[1.03]"
          />
        )}

        {/* Numeración editorial (solo hover, decorativa) */}
        <span
          className="absolute left-3 top-3 font-detail text-[11px] tracking-[0.25em] text-fg/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden="true"
        >
          {number}
        </span>

        {file.type === 'video' && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-fg/60 bg-black/30 backdrop-blur-sm">
              <svg
                className="ml-0.5 h-5 w-5 text-fg"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        <div
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden="true"
        />

        {(file.alt || (file.type === 'image' && file.exif)) && (
          <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {file.alt && <p className="line-clamp-2 text-sm text-fg">{file.alt}</p>}
            {file.type === 'image' && (
              <ExifCaption exif={file.exif} className={file.alt ? 'mt-2' : ''} />
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}
