'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';

const passwordRules = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña no puede tener más de 128 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un símbolo');

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresá tu contraseña actual'),
    newPassword: passwordRules,
    confirmPassword: z.string().min(1, 'Confirmá la nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'La nueva contraseña debe ser distinta a la actual',
    path: ['newPassword'],
  });

type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

interface ApiErrorBody {
  code: string;
  message: string;
  details?: { retryAfter?: number };
}

export function ChangePasswordForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { message?: string };
        error?: ApiErrorBody;
      };

      if (!res.ok || !body.success) {
        if (body.error?.code === 'AUTH_INVALID') {
          throw new Error(body.error.message);
        }
        if (body.error?.code === 'AUTH_REQUIRED') {
          throw new Error('Tu sesión expiró. Iniciá sesión nuevamente.');
        }
        if (body.error?.code === 'RATE_LIMITED') {
          throw new Error(body.error.message);
        }
        if (body.error?.code === 'VALIDATION_ERROR') {
          throw new Error('Revisá los datos ingresados.');
        }
        throw new Error(body.error?.message ?? 'No se pudo actualizar la contraseña');
      }

      reset();
      setSuccess(body.data?.message ?? 'Contraseña actualizada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      noValidate
    >
      <PasswordInput
        label="Contraseña actual"
        required
        autoComplete="current-password"
        {...register('currentPassword')}
        error={errors.currentPassword?.message}
      />

      <PasswordInput
        label="Nueva contraseña"
        required
        autoComplete="new-password"
        hint="Mínimo 8 caracteres, una mayúscula, un número y un símbolo"
        {...register('newPassword')}
        error={errors.newPassword?.message}
      />

      <PasswordInput
        label="Repetir nueva contraseña"
        required
        autoComplete="new-password"
        {...register('confirmPassword')}
        error={errors.confirmPassword?.message}
      />

      {error && (
        <p
          className="rounded-sm border border-danger/30 bg-danger/5 p-3 font-detail text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          className="rounded-sm border border-accent/30 bg-accent/5 p-3 font-detail text-sm text-accent"
          role="status"
        >
          {success}
        </p>
      )}

      <Button type="submit" isLoading={submitting} variant="outline" className="w-full">
        Actualizar contraseña
      </Button>
    </form>
  );
}
