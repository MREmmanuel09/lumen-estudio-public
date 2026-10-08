'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { fadeUp, staggerContainer } from '@/lib/motion';
import { cn } from '@/lib/utils';

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.string().trim().toLowerCase().email('Email inválido'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Al menos una mayúscula')
      .regex(/[0-9]/, 'Al menos un número')
      .regex(/[^A-Za-z0-9]/, 'Al menos un símbolo'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type RegisterInput = z.infer<typeof registerSchema>;

interface ApiErrorBody {
  code: string;
  message: string;
}

export function RegisterForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password') ?? '';

  const requirements = [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Una mayúscula', met: /[A-Z]/.test(password) },
    { label: 'Un número', met: /[0-9]/.test(password) },
    { label: 'Un símbolo', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const onSubmit = async (data: RegisterInput) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: ApiErrorBody;
      };

      if (!res.ok || !body.success) {
        if (body.error?.code === 'VALIDATION_ERROR') {
          throw new Error('Revisá los datos del formulario.');
        }
        if (body.error?.code === 'RATE_LIMITED') {
          throw new Error(body.error.message);
        }
        throw new Error(body.error?.message ?? 'Error al crear la cuenta');
      }

      setSuccess(true);
      // Redirigir al login tras 3s
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-sm border border-accent/30 bg-accent/5 p-8 text-center"
      >
        <p className="font-detail text-xs uppercase tracking-widest text-accent">
          Cuenta creada
        </p>
        <h3 className="mt-3 font-display text-2xl text-fg">Revisa tu email</h3>
        <p className="mt-2 text-sm text-fg-muted">
          Te enviamos un enlace de verificación. Hacé clic para activar tu cuenta.
        </p>
        <p className="mt-4 text-xs text-fg-muted">
          Te llevamos al login en unos segundos...
        </p>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
      noValidate
    >
      <motion.div variants={fadeUp}>
        <Input
          label="Nombre"
          required
          autoComplete="name"
          {...register('name')}
          error={errors.name?.message}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <Input
          label="Email"
          type="email"
          required
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <PasswordInput
          label="Contraseña"
          required
          autoComplete="new-password"
          {...register('password')}
          error={errors.password?.message}
        />
        {password && (
          <ul className="mt-2 space-y-1 text-xs">
            {requirements.map((req) => (
              <li
                key={req.label}
                className={cn(
                  'flex items-center gap-2',
                  req.met ? 'text-success' : 'text-fg-muted',
                )}
              >
                <span aria-hidden="true">{req.met ? '✓' : '○'}</span>
                {req.label}
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      <motion.div variants={fadeUp}>
        <PasswordInput
          label="Confirmar contraseña"
          required
          autoComplete="new-password"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />
      </motion.div>

      {error && (
        <motion.p
          variants={fadeUp}
          className="rounded-sm border border-danger/30 bg-danger/5 p-3 font-detail text-sm text-danger"
          role="alert"
        >
          {error}
        </motion.p>
      )}

      <motion.div variants={fadeUp}>
        <Button type="submit" isLoading={submitting} className="w-full" size="lg">
          Crear cuenta
        </Button>
      </motion.div>

      <motion.p variants={fadeUp} className="text-center text-sm text-fg-muted">
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="text-accent hover:underline">
          Iniciar sesión
        </Link>
      </motion.p>
    </motion.form>
  );
}
