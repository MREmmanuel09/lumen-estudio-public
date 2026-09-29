'use client';

import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  error?: string;
  hint?: string;
};

const EyeIcon = ({ off }: { off: boolean }) => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    {off ? (
      <>
        <path d="M3 3l18 18" strokeLinecap="round" />
        <path
          d="M10.6 5.1A9.7 9.7 0 0 1 12 5c5 0 9 4.5 9 7 0 .8-.5 1.9-1.4 3M6.5 6.9C4.4 8.3 3 10.4 3 12c0 2.5 4 7 9 7 1.6 0 3-.4 4.2-1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.9 9.9a3 3 0 0 0 4.2 4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ) : (
      <>
        <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false);

    const trailing: ReactNode = (
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Ver contraseña'}
        aria-pressed={visible}
        className={cn(
          'flex h-8 w-8 items-center justify-center text-fg-muted transition-colors',
          'hover:text-fg focus-visible:text-fg focus-visible:outline-none',
        )}
      >
        <EyeIcon off={!visible} />
      </button>
    );

    return (
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        trailing={trailing}
        className={className}
        {...props}
      />
    );
  },
);
