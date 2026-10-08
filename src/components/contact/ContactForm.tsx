'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { fadeUp, staggerContainer } from '@/lib/motion';

const contactSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().trim().toLowerCase().email('Email inválido'),
  subject: z.string().trim().max(200).optional(),
  message: z
    .string()
    .trim()
    .min(10, 'El mensaje debe tener al menos 10 caracteres')
    .max(1000, 'El mensaje no puede tener más de 1000 caracteres'),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Debés aceptar la política de privacidad' }),
  }),
  // Honeypot: campo oculto que humanos no llenan, bots sí.
  // Se acepta para poder simular éxito en silencio en onSubmit.
  website: z.string().max(500).optional(),
});

type ContactInput = z.infer<typeof contactSchema>;

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { website: '' },
  });

  const onSubmit = async (data: ContactInput) => {
    if (data.website) {
      // Honeypot activado: simular éxito sin pedir nada a la red.
      setStatus('success');
      reset();
      return;
    }
    setStatus('submitting');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(body.error?.message ?? 'Error al enviar el mensaje');
      }
      setStatus('success');
      reset();
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-sm border border-accent/30 bg-accent/5 p-8 text-center"
      >
        <p className="font-detail text-xs uppercase tracking-widest text-accent">
          Mensaje enviado
        </p>
        <h3 className="mt-3 font-display text-2xl text-fg">Gracias por escribir</h3>
        <p className="mt-2 text-fg-muted">
          Te respondemos en menos de 48 horas hábiles.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-6"
          onClick={() => setStatus('idle')}
        >
          Enviar otro mensaje
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
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
        <Input
          label="Asunto"
          hint="Opcional"
          {...register('subject')}
          error={errors.subject?.message}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <Textarea
          label="Mensaje"
          required
          {...register('message')}
          error={errors.message?.message}
        />
      </motion.div>

      {/* Honeypot: oculto a usuarios, visible a bots */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="website-honey">No llenar este campo</label>
        <input
          id="website-honey"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register('website')}
        />
      </div>

      <motion.div variants={fadeUp} className="flex items-start gap-3">
        <input
          id="consent"
          type="checkbox"
          {...register('consent')}
          className="mt-1 h-4 w-4 border border-border bg-transparent accent-accent"
        />
        <label htmlFor="consent" className="text-sm text-fg-muted">
          Acepto la{' '}
          <a href="/privacidad" className="text-accent underline-offset-2 hover:underline">
            política de privacidad
          </a>
          .
        </label>
      </motion.div>
      {errors.consent && (
        <p className="font-detail text-xs text-danger" role="alert">
          {errors.consent.message}
        </p>
      )}

      {errorMessage && (
        <p className="font-detail text-sm text-danger" role="alert">
          {errorMessage}
        </p>
      )}

      <motion.div variants={fadeUp}>
        <Button type="submit" isLoading={status === 'submitting'}>
          Enviar mensaje
        </Button>
      </motion.div>
    </motion.form>
  );
}
