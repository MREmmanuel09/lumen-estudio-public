'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { ExifCaption } from './ExifCaption';
import type { MediaFile } from '@/services/gallery';

interface LightboxProps {
  files: MediaFile[];
  initialIndex: number;
  onClose: () => void;
}

export function Lightbox({ files, initialIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const current = files[index];

  const goPrev = useCallback(() => {
    setDirection(-1);
    setIndex((i) => (i - 1 + files.length) % files.length);
  }, [files.length]);
  const goNext = useCallback(() => {
    setDirection(1);
    setIndex((i) => (i + 1) % files.length);
  }, [files.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  // P0 UX: precargar anterior/siguiente para navegación sin parpadeo.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    [index - 1, index + 1].forEach((i) => {
      const file = files[(i + files.length) % files.length];
      if (file?.type === 'image') {
        const img = new window.Image();
        img.src = file.url;
      }
    });
  }, [index, files]);

  if (!current) return null;

  return (
    <Modal open onClose={onClose} ariaLabel={`Visor de medios: ${index + 1} de ${files.length}`}>
      <div className="relative flex h-[80vh] flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <p className="font-detail text-xs uppercase tracking-widest text-fg-muted">
            {index + 1} / {files.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-fg transition-colors hover:text-accent"
            aria-label="Cerrar visor"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Media */}
        <div className="relative flex-1 overflow-hidden bg-black">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -60 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80) goNext();
                else if (info.offset.x > 80) goPrev();
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {current.type === 'image' ? (
                <Image
                  src={current.url}
                  alt={current.alt ?? ''}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  priority
                />
              ) : (
                <video
                  src={current.url}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="h-full w-full"
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Controles de navegación */}
          {files.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-fg/30 bg-black/40 text-fg backdrop-blur-sm transition-colors hover:bg-black/70"
                aria-label="Anterior"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-fg/30 bg-black/40 text-fg backdrop-blur-sm transition-colors hover:bg-black/70"
                aria-label="Siguiente"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Footer con caption + ficha técnica */}
        {(current.alt || (current.type === 'image' && current.exif)) && (
          <div className="border-t border-border p-4">
            {current.alt && <p className="text-sm text-fg-muted">{current.alt}</p>}
            {current.type === 'image' && (
              <ExifCaption exif={current.exif} className={current.alt ? 'mt-3' : ''} />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
