import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  /** Variante de fondo */
  variant?: 'default' | 'elevated' | 'accent';
  /** Padding vertical */
  spacing?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: 'bg-bg',
  elevated: 'bg-bg-elevated',
  accent: 'bg-accent text-accent-fg',
};

const spacingStyles = {
  sm: 'py-section-sm',
  md: 'py-section',
  lg: 'py-24 md:py-32',
};

export function Section({
  children,
  className,
  id,
  variant = 'default',
  spacing = 'md',
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(variantStyles[variant], spacingStyles[spacing], className)}
    >
      {children}
    </section>
  );
}
