'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { Plus, Pencil, Trash2, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string | null;
  mosaicCount: number;
}

interface Props {
  initialCategories: Category[];
}

const formSchema = z.object({
  name: z.string().trim().min(1, 'Nombre obligatorio').max(100),
  slug: z
    .string()
    .trim()
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones')
    .optional()
    .or(z.literal('')),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  coverImage: z.string().trim().url('URL inválida').optional().or(z.literal('')),
});

type FormInput = z.infer<typeof formSchema>;

export function AdminCategoriesManager({ initialCategories }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const refresh = () => {
    startTransition(() => router.refresh());
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/categories/${deleting.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Error');
      toast.success('Categoría eliminada');
      setDeleting(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-fg-muted">
          {initialCategories.length}{' '}
          {initialCategories.length === 1 ? 'categoría' : 'categorías'}
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      {initialCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-border py-16 text-center">
          <FolderTree className="h-10 w-10 text-fg-muted" aria-hidden="true" />
          <p className="mt-4 font-display text-xl text-fg">Sin categorías</p>
          <p className="mt-2 max-w-sm text-sm text-fg-muted">
            Creá tu primera categoría para empezar a organizar el portafolio.
          </p>
          <Button className="mt-6" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Crear categoría
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {initialCategories.map((cat) => (
            <div
              key={cat.id}
              className="group border border-border bg-bg-elevated transition-colors hover:border-accent"
            >
              <div className="relative aspect-video overflow-hidden bg-bg">
                {cat.coverImage ? (
                  <Image
                    src={cat.coverImage}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-fg-muted">
                    Sin portada
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-display text-xl text-fg">{cat.name}</h3>
                <p className="mt-1 font-detail text-xs uppercase tracking-widest text-fg-muted">
                  {cat.slug} · {cat.mosaicCount}{' '}
                  {cat.mosaicCount === 1 ? 'mosaico' : 'mosaicos'}
                </p>
                <p className="mt-3 line-clamp-2 text-sm text-fg-muted">
                  {cat.description}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(cat)}
                  >
                    <Pencil className="h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleting(cat)}
                    className="text-danger hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-3 w-3" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <CategoryFormModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            toast.success('Categoría creada');
            refresh();
          }}
        />
      )}

      {editing && (
        <CategoryFormModal
          category={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast.success('Categoría actualizada');
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar categoría"
        description={
          deleting
            ? `Vas a eliminar "${deleting.name}" con ${deleting.mosaicCount} mosaico(s) y todos sus archivos. Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar"
        requireText="ELIMINAR"
        loading={deleteLoading}
      />
    </div>
  );
}

function CategoryFormModal({
  category,
  onClose,
  onSaved,
}: {
  category?: Category;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      description: category?.description ?? '',
      coverImage: category?.coverImage ?? '',
    },
  });

  const onSubmit = async (data: FormInput) => {
    setSubmitting(true);
    try {
      const url = category ? `/api/categories/${category.id}` : '/api/categories';
      const method = category ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          slug: data.slug || undefined,
          description: data.description,
          coverImage: data.coverImage || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Error al guardar');
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabel={category ? 'Editar categoría' : 'Nueva categoría'}
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        <h2 className="font-display text-2xl text-fg">
          {category ? 'Editar categoría' : 'Nueva categoría'}
        </h2>

        <div className="mt-6 space-y-4">
          <Input
            label="Nombre"
            required
            {...register('name')}
            error={errors.name?.message}
          />
          <Input
            label="Slug"
            hint="Opcional. Se genera del nombre si queda vacío."
            {...register('slug')}
            error={errors.slug?.message}
          />
          <Textarea
            label="Descripción"
            rows={3}
            {...register('description')}
            error={errors.description?.message}
          />
          <Input
            label="URL de portada"
            hint="Opcional. URL de imagen."
            {...register('coverImage')}
            error={errors.coverImage?.message}
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={submitting}>
            {category ? 'Guardar cambios' : 'Crear categoría'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
