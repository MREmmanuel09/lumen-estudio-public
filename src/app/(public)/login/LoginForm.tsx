'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { fadeUp, staggerContainer } from '@/lib/motion';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

type LoginInput = z.infer<typeof loginSchema>;

interface ApiErrorBody {
  code: string;
  message: string;
  details?: { retryAfter?: number };
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { user: { role: string } };
        error?: ApiErrorBody;
      };

      if (!res.ok || !body.success) {
        // Mensaje genérico para credenciales inválidas (anti-enumeración)
        if (body.error?.code === 'AUTH_INVALID') {
          throw new Error('Email o contraseña incorrectos.');
        }
        if (body.error?.code === 'RATE_LIMITED') {
          throw new Error(body.error.message);
        }
        if (body.error?.code === 'VALIDATION_ERROR') {
          throw new Error('Revisá los datos ingresados.');
        }
        throw new Error(body.error?.message ?? 'Error al iniciar sesión');
      }

      // Redirigir: si es admin y pidió /admin, llevarlo ahí; sino a callbackUrl
      const role = body.data?.user.role;
      const target =
        role === 'ADMIN' && callbackUrl === '/'
          ? '/admin'
          : callbackUrl;
      router.push(target as Route);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

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
          autoComplete="current-password"
          {...register('password')}
          error={errors.password?.message}
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

      <motion.div variants={fadeUp} className="flex items-center justify-between text-sm">
        <Link
          href="/recuperar"
          className="text-fg-muted underline-offset-2 transition-colors hover:text-accent hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Button type="submit" isLoading={submitting} className="w-full" size="lg">
          Iniciar sesión
        </Button>
      </motion.div>

      <motion.p variants={fadeUp} className="text-center text-sm text-fg-muted">
        ¿No tenés cuenta?{' '}
        <Link href="/registro" className="text-accent hover:underline">
          Crear cuenta
        </Link>
      </motion.p>
    </motion.form>
  );
}
