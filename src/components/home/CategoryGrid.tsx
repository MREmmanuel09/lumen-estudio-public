'use client';

import { motion } from 'framer-motion';
import { staggerContainer } from '@/lib/motion';
import { CategoryCard } from './CategoryCard';
import type { Category } from '@/services/gallery';

interface CategoryGridProps {
  categories: Category[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <motion.div
      className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3"
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
    >
      {categories.map((category, index) => (
        <CategoryCard key={category.slug} category={category} priority={index < 3} />
      ))}
    </motion.div>
  );
}
