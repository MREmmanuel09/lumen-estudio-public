'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, LayoutGrid, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface Mosaic {
  id: string;
  title: string;
  description: string | null;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  fileCount: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  initialMosaics: Mosaic[];
  categories: Category[];
}

const formSchema = z.object({
  title: z.string().trim().min(1, 'Título obligatorio').max(200),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  categoryId: z.string().min(1, 'Categoría obligatoria'),
});

type FormInput = z.infer<typeof formSchema>;

export function AdminMosaicsManager({ initialMosaics, categories }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-fg-muted">
          {initialMosaics.length}{' '}
          {initialMosaics.length === 1 ? 'mosaico' : 'mosaicos'}
        </p>
        <Button
          onClick={() => setCreating(true)}
          disabled={categories.length === 0}
        >
          <Plus className="h-4 w-4" />
          Nuevo mosaico
        </Button>
      </div>

      {categories.length === 0 && (
        <div className="mb-4 border border-accent/50 bg-accent/5 p-4 text-sm text-fg-muted">
          Primero creá una categoría para poder añadir mosaicos.
        </div>
      )}

      {initialMosaics.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-border py-16 text-center">
          <LayoutGrid className="h-10 w-10 text-fg-muted" aria-hidden="true" />
          <p className="mt-4 font-display text-xl text-fg">Sin mosaicos</p>
        </div>
      ) : (
        <div className="border border-border bg-bg-elevated">
          <ul>
            {initialMosaics.map((m, i) => (
              <li
                key={m.id}
                className={
                  i > 0
                    ? 'border-t border-border'
                    : ''
                }
              >
                <Link
                  href={`/admin/mosaicos/${m.id}`}
                  className="group flex items-center justify-between p-4 transition-colors hover:bg-bg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg text-fg">{m.title}</p>
                    <p className="mt-1 font-detail text-xs uppercase tracking-widest text-fg-muted">
                      {m.category.name} · {m.fileCount}{' '}
                      {m.fileCount === 1 ? 'archivo' : 'archivos'}
                    </p>
                    {m.description && (
                      <p className="mt-2 line-clamp-1 text-sm text-fg-muted">
                        {m.description}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="ml-4 h-4 w-4 text-fg-muted transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {creating && (
        <MosaicFormModal
          categories={categories}
          onClose={() => setCreating(false)}
          onSaved={(id) => {
            setCreating(false);
            toast.success('Mosaico creado');
            router.push(`/admin/mosaicos/${id}`);
          }}
        />
      )}
    </div>
  );
}

function MosaicFormModal({
  categories,
  onClose,
  onSaved,
}: {
  categories: Category[];
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormInput) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/mosaics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Error al crear');
      }
      onSaved(json.data.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} ariaLabel="Nuevo mosaico" className="max-w-xl">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        <h2 className="font-display text-2xl text-fg">Nuevo mosaico</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Después podrás añadir archivos y elegir la portada.
        </p>

        <div className="mt-6 space-y-4">
          <Input
            label="Título"
            required
            {...register('title')}
            error={errors.title?.message}
          />
          <Textarea
            label="Descripción"
            rows={3}
            {...register('description')}
            error={errors.description?.message}
          />
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="categoryId"
              className="font-detail text-xs uppercase tracking-widest text-fg-muted"
            >
              Categoría <span className="ml-1 text-danger">*</span>
            </label>
            <select
              id="categoryId"
              {...register('categoryId')}
              className="w-full border border-border bg-transparent px-4 py-3 text-base text-fg focus:border-accent focus:outline-none"
            >
              <option value="">Seleccionar...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="font-detail text-xs text-danger" role="alert">
                {errors.categoryId.message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={submitting}>
            Crear mosaico
          </Button>
        </div>
      </form>
    </Modal>
  );
}
