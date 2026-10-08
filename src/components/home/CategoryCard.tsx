'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/motion';
import type { Category } from '@/services/gallery';

interface CategoryCardProps {
  category: Category;
  priority?: boolean;
}

export function CategoryCard({ category, priority = false }: CategoryCardProps) {
  return (
    <motion.div variants={fadeUp} className="group">
      <Link
        href={`/galeria/${category.slug}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-bg-elevated">
          {category.coverImage ? (
            <Image
              src={category.coverImage}
              alt={category.name}
              fill
              priority={priority}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 ease-elegant group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="font-detail text-xs uppercase tracking-widest text-fg-muted">
                Sin portada
              </p>
            </div>
          )}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <p className="font-detail text-xs uppercase tracking-widest text-accent">
              Portafolio
              {category.mosaicCount !== undefined && category.mosaicCount > 0 && (
                <span className="ml-2 text-fg-muted">
                  · {category.mosaicCount} {category.mosaicCount === 1 ? 'proyecto' : 'proyectos'}
                </span>
              )}
            </p>
            <h3 className="mt-2 font-display text-3xl text-fg md:text-4xl">
              {category.name}
            </h3>
            <p className="mt-3 line-clamp-2 max-w-md text-sm text-fg-muted">
              {category.description}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 font-detail text-xs uppercase tracking-widest text-fg transition-colors group-hover:text-accent">
              <span>Explorar</span>
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
