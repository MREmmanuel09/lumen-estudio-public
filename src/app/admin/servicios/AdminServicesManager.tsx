'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Eye, EyeOff, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { SERVICE_ICON_NAMES } from '@/components/home/service-icons';

interface Service {
  id: string;
  title: string;
  slug: string;
  description: string;
  priceLabel: string | null;
  priceNote: string | null;
  durationLabel: string | null;
  featuresText: string;
  icon: string | null;
  image: string | null;
  order: number;
  visible: boolean;
}

interface Props {
  initialServices: Service[];
}

const formSchema = z.object({
  title: z.string().trim().min(1, 'Título obligatorio').max(100),
  slug: z
    .string()
    .trim()
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones')
    .optional()
    .or(z.literal('')),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  priceLabel: z.string().trim().max(60).optional().or(z.literal('')),
  priceNote: z.string().trim().max(60).optional().or(z.literal('')),
  durationLabel: z.string().trim().max(120).optional().or(z.literal('')),
  featuresText: z.string().trim().max(2000).optional().or(z.literal('')),
  icon: z.string().optional().or(z.literal('')),
  image: z.string().trim().url('URL inválida').optional().or(z.literal('')),
  order: z.coerce.number().int().min(0).max(1000),
  visible: z.boolean(),
});

type FormInput = z.infer<typeof formSchema>;

export function AdminServicesManager({ initialServices }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const visibleCount = initialServices.filter((s) => s.visible).length;

  const refresh = () => {
    startTransition(() => router.refresh());
  };

  const handleToggle = async (service: Service) => {
    setTogglingId(service.id);
    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible: !service.visible }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Error');
      toast.success(service.visible ? 'Servicio oculto' : 'Servicio visible');
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
      const res = await fetch(`/api/services/${deleting.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Error');
      toast.success('Servicio eliminado');
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
              No hay servicios visibles, por eso la sección no se muestra.
              Activá alguno con el ojo para publicarlo.
            </p>
          </>
        ) : (
          <>
            <span className="font-detail text-xs uppercase tracking-widest text-accent">
              Sección visible en el sitio
            </span>
            <p className="mt-1">
              {visibleCount} {visibleCount === 1 ? 'servicio visible' : 'servicios visibles'}{' '}
              de {initialServices.length}.
            </p>
          </>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-fg-muted">
          {initialServices.length} {initialServices.length === 1 ? 'servicio' : 'servicios'}
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Nuevo servicio
        </Button>
      </div>

      {initialServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-border py-16 text-center">
          <Briefcase className="h-10 w-10 text-fg-muted" aria-hidden="true" />
          <p className="mt-4 font-display text-xl text-fg">Sin servicios</p>
          <p className="mt-2 max-w-sm text-sm text-fg-muted">
            Agregá el primer servicio del estudio.
          </p>
          <Button className="mt-6" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Crear servicio
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border border border-border bg-bg-elevated">
          {initialServices.map((service) => (
            <li
              key={service.id}
              className={cn('flex items-center gap-4 p-4', !service.visible && 'opacity-60')}
            >
              <button
                type="button"
                onClick={() => handleToggle(service)}
                disabled={togglingId === service.id}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center border transition-colors',
                  service.visible
                    ? 'border-accent/50 text-accent hover:bg-accent/10'
                    : 'border-border text-fg-muted hover:border-accent hover:text-accent',
                )}
                aria-label={service.visible ? `Ocultar ${service.title}` : `Mostrar ${service.title}`}
                aria-pressed={service.visible}
                title={service.visible ? 'Visible — clic para ocultar' : 'Oculta — clic para mostrar'}
              >
                {service.visible ? (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xl text-fg">{service.title}</p>
                <p className="mt-0.5 truncate font-detail text-xs uppercase tracking-widest text-fg-muted">
                  {service.slug} · {service.priceLabel ?? 'A convenir'} ·{' '}
                  {service.visible ? 'visible' : 'oculto'}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(service)}>
                  <Pencil className="h-3 w-3" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleting(service)}
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
        <ServiceFormModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            toast.success('Servicio creado');
            refresh();
          }}
        />
      )}

      {editing && (
        <ServiceFormModal
          service={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast.success('Servicio actualizado');
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar servicio"
        description={
          deleting
            ? `Vas a eliminar "${deleting.title}" y su página de detalle. Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar"
        loading={deleteLoading}
      />
    </div>
  );
}

function ServiceFormModal({
  service,
  onClose,
  onSaved,
}: {
  service?: Service;
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
      title: service?.title ?? '',
      slug: service?.slug ?? '',
      description: service?.description ?? '',
      priceLabel: service?.priceLabel ?? '',
      priceNote: service?.priceNote ?? '',
      durationLabel: service?.durationLabel ?? '',
      featuresText: service?.featuresText ?? '',
      icon: service?.icon ?? '',
      image: service?.image ?? '',
      order: service?.order ?? 0,
      visible: service?.visible ?? true,
    },
  });

  const onSubmit = async (data: FormInput) => {
    setSubmitting(true);
    try {
      const url = service ? `/api/services/${service.id}` : '/api/services';
      const method = service ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          slug: data.slug || undefined,
          description: data.description,
          priceLabel: data.priceLabel || undefined,
          priceNote: data.priceNote || undefined,
          durationLabel: data.durationLabel || undefined,
          featuresText: data.featuresText,
          icon: data.icon || undefined,
          image: data.image || undefined,
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
      ariaLabel={service ? 'Editar servicio' : 'Nuevo servicio'}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        <h2 className="font-display text-2xl text-fg">
          {service ? 'Editar servicio' : 'Nuevo servicio'}
        </h2>

        <div className="mt-6 space-y-4">
          <Input
            label="Título"
            required
            placeholder="Bodas & Eventos"
            {...register('title')}
            error={errors.title?.message}
          />
          <Input
            label="Slug"
            hint={
              service
                ? 'Cuidado: cambiarlo rompe la URL del detalle.'
                : 'Opcional. Se genera del título si queda vacío.'
            }
            {...register('slug')}
            error={errors.slug?.message}
          />
          <Textarea
            label="Descripción"
            hint="Se admite formato simple (negrita, cursiva, enlaces)."
            rows={4}
            {...register('description')}
            error={errors.description?.message}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Precio"
              placeholder="Desde Q 8,500"
              {...register('priceLabel')}
              error={errors.priceLabel?.message}
            />
            <Input
              label="Nota de precio"
              placeholder="por jornada"
              {...register('priceNote')}
              error={errors.priceNote?.message}
            />
          </div>
          <Input
            label="Duración / entrega"
            placeholder="Entrega en 48h"
            {...register('durationLabel')}
            error={errors.durationLabel?.message}
          />
          <Textarea
            label="Incluye (uno por línea)"
            hint="Cada línea es un ítem del checklist del detalle."
            rows={4}
            placeholder={'Álbum de autor\nEntrega digital'}
            {...register('featuresText')}
            error={errors.featuresText?.message}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="service-icon"
                className="font-detail text-xs uppercase tracking-widest text-fg-muted"
              >
                Icono
              </label>
              <select
                id="service-icon"
                {...register('icon')}
                className="w-full border border-border bg-transparent px-4 py-3 font-body text-base text-fg focus:border-accent focus:outline-none"
              >
                <option value="">Automático</option>
                {SERVICE_ICON_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Orden"
              hint="De menor a mayor."
              type="number"
              min={0}
              max={1000}
              {...register('order')}
              error={errors.order?.message}
            />
          </div>
          <Input
            label="URL de imagen"
            hint="Opcional. Portada de la tarjeta y el detalle."
            {...register('image')}
            error={errors.image?.message}
          />
          <div className="flex items-start gap-3">
            <input
              id="service-visible"
              type="checkbox"
              {...register('visible')}
              className="mt-1 h-4 w-4 border border-border bg-transparent accent-accent"
            />
            <label htmlFor="service-visible" className="text-sm text-fg-muted">
              Visible en el sitio. Si no queda ninguno visible, la sección se
              oculta automáticamente.
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={submitting}>
            {service ? 'Guardar cambios' : 'Crear servicio'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
