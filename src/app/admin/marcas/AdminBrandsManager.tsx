'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Eye, EyeOff, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface Brand {
  id: string;
  name: string;
  website: string | null;
  order: number;
  visible: boolean;
}

interface Props {
  initialBrands: Brand[];
}

const formSchema = z.object({
  name: z.string().trim().min(1, 'Nombre obligatorio').max(60),
  website: z
    .string()
    .trim()
    .url('URL inválida')
    .refine((url) => url.startsWith('https://'), 'La web debe empezar con https://')
    .optional()
    .or(z.literal('')),
  order: z.coerce.number().int().min(0).max(1000),
  visible: z.boolean(),
});

type FormInput = z.infer<typeof formSchema>;

export function AdminBrandsManager({ initialBrands }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<Brand | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Brand | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const visibleCount = initialBrands.filter((b) => b.visible).length;

  const refresh = () => {
    startTransition(() => router.refresh());
  };

  const handleToggle = async (brand: Brand) => {
    setTogglingId(brand.id);
    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible: !brand.visible }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Error');
      toast.success(brand.visible ? 'Marca oculta' : 'Marca visible');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar visibilidad');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/brands/${deleting.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Error');
      toast.success('Marca eliminada');
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
      <div
        className={cn(
          'mb-4 border p-4 text-sm',
          visibleCount === 0
            ? 'border-danger/40 bg-danger/5 text-fg-muted'
            : 'border-accent/30 bg-accent/5 text-fg-muted',
        )}
        role="status"
      >
        {visibleCount === 0 ? (
          <>
            <span className="font-detail text-xs uppercase tracking-widest text-danger">
              Sección oculta en el sitio
            </span>
            <p className="mt-1">
              No hay marcas visibles, por eso &ldquo;Han confiado en nosotros&rdquo; no
              se muestra. Activá alguna con el ojo para publicarla.
            </p>
          </>
        ) : (
          <>
            <span className="font-detail text-xs uppercase tracking-widest text-accent">
              Sección visible en el sitio
            </span>
            <p className="mt-1">
              {visibleCount} {visibleCount === 1 ? 'marca visible' : 'marcas visibles'} de{' '}
              {initialBrands.length}. Apagá todas para ocultar la sección.
            </p>
          </>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-fg-muted">
          {initialBrands.length} {initialBrands.length === 1 ? 'marca' : 'marcas'}
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Nueva marca
        </Button>
      </div>

      {initialBrands.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-border py-16 text-center">
          <BadgeCheck className="h-10 w-10 text-fg-muted" aria-hidden="true" />
          <p className="mt-4 font-display text-xl text-fg">Sin marcas</p>
          <p className="mt-2 max-w-sm text-sm text-fg-muted">
            Agregá las marcas o clientes que confiaron en el estudio.
          </p>
          <Button className="mt-6" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Agregar marca
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border border border-border bg-bg-elevated">
          {initialBrands.map((brand) => (
            <li
              key={brand.id}
              className={cn(
                'flex items-center gap-4 p-4 transition-opacity',
                !brand.visible && 'opacity-60',
              )}
            >
              <button
                type="button"
                onClick={() => handleToggle(brand)}
                disabled={togglingId === brand.id}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center border transition-colors',
                  brand.visible
                    ? 'border-accent/50 text-accent hover:bg-accent/10'
                    : 'border-border text-fg-muted hover:border-accent hover:text-accent',
                )}
                aria-label={brand.visible ? `Ocultar ${brand.name}` : `Mostrar ${brand.name}`}
                aria-pressed={brand.visible}
                title={brand.visible ? 'Visible — clic para ocultar' : 'Oculta — clic para mostrar'}
              >
                {brand.visible ? (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xl text-fg">{brand.name}</p>
                <p className="mt-0.5 font-detail text-xs uppercase tracking-widest text-fg-muted">
                  Orden {brand.order}
                  {brand.website ? ` · ${brand.website}` : ' · sin web'} ·{' '}
                  {brand.visible ? 'visible' : 'oculta'}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(brand)}>
                  <Pencil className="h-3 w-3" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleting(brand)}
                  className="text-danger hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-3 w-3" />
                  Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <BrandFormModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            toast.success('Marca creada');
            refresh();
          }}
        />
      )}

      {editing && (
        <BrandFormModal
          brand={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast.success('Marca actualizada');
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar marca"
        description={deleting ? `Vas a eliminar "${deleting.name}". Esta acción no se puede deshacer.` : ''}
        confirmText="Eliminar"
        loading={deleteLoading}
      />
    </div>
  );
}

function BrandFormModal({
  brand,
  onClose,
  onSaved,
}: {
  brand?: Brand;
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
      name: brand?.name ?? '',
      website: brand?.website ?? '',
      order: brand?.order ?? 0,
      visible: brand?.visible ?? true,
    },
  });

  const onSubmit = async (data: FormInput) => {
    setSubmitting(true);
    try {
      const url = brand ? `/api/brands/${brand.id}` : '/api/brands';
      const method = brand ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          website: data.website || undefined,
          order: data.order,
          visible: data.visible,
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
      ariaLabel={brand ? 'Editar marca' : 'Nueva marca'}
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        <h2 className="font-display text-2xl text-fg">
          {brand ? 'Editar marca' : 'Nueva marca'}
        </h2>

        <div className="mt-6 space-y-4">
          <Input
            label="Nombre"
            required
            placeholder="NIKE"
            {...register('name')}
            error={errors.name?.message}
          />
          <Input
            label="Sitio web"
            hint="Opcional. Debe empezar con https:// — la marca enlaza a esa web."
            placeholder="https://www.nike.com"
            {...register('website')}
            error={errors.website?.message}
          />
          <Input
            label="Orden"
            hint="Las marcas se muestran de menor a mayor."
            type="number"
            min={0}
            max={1000}
            {...register('order')}
            error={errors.order?.message}
          />
          <div className="flex items-start gap-3">
            <input
              id="brand-visible"
              type="checkbox"
              {...register('visible')}
              className="mt-1 h-4 w-4 border border-border bg-transparent accent-accent"
            />
            <label htmlFor="brand-visible" className="text-sm text-fg-muted">
              Visible en el sitio. Si la apagás y no queda ninguna visible, la
              sección se oculta automáticamente.
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={submitting}>
            {brand ? 'Guardar cambios' : 'Crear marca'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
