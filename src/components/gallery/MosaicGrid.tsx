'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { staggerContainer } from '@/lib/motion';
import { MediaItem } from './MediaItem';
import { Lightbox } from './Lightbox';
import type { MediaFile } from '@/services/gallery';

interface MosaicGridProps {
  files: MediaFile[];
}

/** Cada 6 piezas, la primera es destacada (panorámica doble columna en sm+). */
const RHYTHM = 6;

export function MosaicGrid({ files }: MosaicGridProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const ordered = files.slice().sort((a, b) => a.order - b.order);
  const total = String(ordered.length).padStart(2, '0');

  return (
    <>
      <div className="mb-4 flex justify-end" aria-hidden="true">
        <p className="font-detail text-xs tracking-[0.3em] text-fg-muted/60">
          01 – {total}
        </p>
      </div>

      <motion.div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        {ordered.map((file, index) => (
          <MediaItem
            key={file.id}
            file={file}
            index={index}
            featured={index % RHYTHM === 0}
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </motion.div>

      {activeIndex !== null && (
        <Lightbox
          files={ordered}
          initialIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
        />
      )}
    </>
  );
}
