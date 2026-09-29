'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Shield, User as UserIcon, Trash2, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type Role = 'USER' | 'ADMIN';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string; // viene de la BD como string (SQLite) o Role enum (Postgres)
  emailVerified: Date | null;
  createdAt: string;
}

interface Props {
  currentUserId: string;
  initialUsers: User[];
}

const PROTECTED_EMAIL = 'admin@example.com';

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(128),
  role: z.enum(['USER', 'ADMIN']),
});

type CreateInput = z.infer<typeof createSchema>;

export function AdminUsersManager({ currentUserId, initialUsers }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<User | null>(null);

  const refresh = () => startTransition(() => router.refresh());

  const toggleRole = async (u: User) => {
    const newRole: Role = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Error');
      toast.success(`Rol actualizado a ${newRole}`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/users/${deleting.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Error');
      toast.success('Usuario eliminado');
      setDeleting(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-fg-muted">
          {initialUsers.length}{' '}
          {initialUsers.length === 1 ? 'usuario' : 'usuarios'}
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Crear admin
        </Button>
      </div>

      <div className="border border-border bg-bg-elevated">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left font-detail text-xs uppercase tracking-widest text-fg-muted">
              <th className="p-4">Usuario</th>
              <th className="p-4">Rol</th>
              <th className="p-4">Verificado</th>
              <th className="p-4">Registro</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.map((u, i) => {
              const isProtected = u.email === PROTECTED_EMAIL;
              return (
                <tr
                  key={u.id}
                  className={cn(
                    i > 0 && 'border-t border-border',
                    u.id === currentUserId && 'bg-accent/5',
                  )}
                >
                  <td className="p-4">
                    <p className="font-medium text-fg">{u.name ?? '(sin nombre)'}</p>
                    <p className="font-detail text-xs text-fg-muted">{u.email}</p>
                  </td>
                  <td className="p-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 border px-2 py-0.5 font-detail text-xs uppercase tracking-widest',
                        u.role === 'ADMIN'
                          ? 'border-accent text-accent'
                          : 'border-border text-fg-muted',
                      )}
                    >
                      {u.role === 'ADMIN' ? <Shield className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-fg-muted">
                    {u.emailVerified ? 'Sí' : 'Pendiente'}
                  </td>
                  <td className="p-4 text-fg-muted">
                    {new Date(u.createdAt).toLocaleDateString('es-ES')}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => toggleRole(u)}
                        disabled={isProtected}
                        className="flex h-8 w-8 items-center justify-center text-fg-muted transition-colors hover:bg-bg hover:text-fg disabled:opacity-30"
                        aria-label={u.role === 'ADMIN' ? 'Degradar a USER' : 'Promover a ADMIN'}
                      >
                        {u.role === 'ADMIN' ? (
                          <ShieldOff className="h-4 w-4" />
                        ) : (
                          <Shield className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(u)}
                        disabled={isProtected || u.id === currentUserId}
                        className="flex h-8 w-8 items-center justify-center text-fg-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreateUserModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            toast.success('Usuario creado');
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar usuario"
        description={
          deleting
            ? `Vas a eliminar a ${deleting.name ?? deleting.email}. Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar"
        requireText="ELIMINAR"
      />
    </div>
  );
}

function CreateUserModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateInput>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'ADMIN' },
  });

  const onSubmit = async (data: CreateInput) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Error');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} ariaLabel="Crear usuario" className="max-w-xl">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        <h2 className="font-display text-2xl text-fg">Crear usuario</h2>
        <p className="mt-1 text-sm text-fg-muted">
          El email se marca como verificado automáticamente. Comunicá la contraseña al usuario por un canal seguro.
        </p>

        <div className="mt-6 space-y-4">
          <Input
            label="Nombre"
            required
            {...register('name')}
            error={errors.name?.message}
          />
          <Input
            label="Email"
            type="email"
            required
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Contraseña temporal"
            type="text"
            required
            {...register('password')}
            error={errors.password?.message}
            hint="Mínimo 8 caracteres. El usuario podrá cambiarla."
          />
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="role"
              className="font-detail text-xs uppercase tracking-widest text-fg-muted"
            >
              Rol
            </label>
            <select
              id="role"
              {...register('role')}
              className="w-full border border-border bg-transparent px-4 py-3 text-base text-fg focus:border-accent focus:outline-none"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={submitting}>
            Crear usuario
          </Button>
        </div>
      </form>
    </Modal>
  );
}
