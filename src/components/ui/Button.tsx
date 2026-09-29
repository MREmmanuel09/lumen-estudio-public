'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-fg hover:bg-fg hover:text-bg border border-transparent',
  secondary:
    'bg-bg-elevated text-fg hover:bg-fg hover:text-bg border border-transparent',
  ghost: 'bg-transparent text-fg hover:bg-bg-elevated border border-transparent',
  outline:
    'bg-transparent text-fg hover:bg-accent hover:text-accent-fg border border-border',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
};

const baseStyles =
  'inline-flex items-center justify-center gap-2 font-detail uppercase tracking-widest transition-colors duration-200 ease-elegant disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={disabled || isLoading ? undefined : { scale: 1.02 }}
        whileTap={disabled || isLoading ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled ?? isLoading}
        {...(props as HTMLMotionProps<'button'>)}
      >
        {isLoading ? (
          <>
            <span
              className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            <span>Cargando...</span>
          </>
        ) : (
          children
        )}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';
