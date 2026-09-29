import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="font-detail text-xs uppercase tracking-widest text-fg-muted"
          >
            {label}
            {props.required && (
              <span className="ml-1 text-danger" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={props.rows ?? 5}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={cn(
            'w-full resize-y border border-border bg-transparent px-4 py-3 font-body text-base text-fg placeholder:text-fg-muted/50',
            'transition-colors duration-200 ease-elegant',
            'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-danger focus:border-danger focus:ring-danger',
            className,
          )}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="font-detail text-xs text-danger"
            role="alert"
          >
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="font-detail text-xs text-fg-muted">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
