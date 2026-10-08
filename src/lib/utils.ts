/**
 * Utilidades compartidas.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases condicionales con Tailwind merge.
 * Ideal para componentes con variantes y props condicionales.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
