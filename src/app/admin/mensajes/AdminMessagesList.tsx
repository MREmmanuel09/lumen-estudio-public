'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, MailOpen, Trash2, Filter } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

interface Props {
  initialMessages: Message[];
}

export function AdminMessagesList({ initialMessages }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [deleting, setDeleting] = useState<Message | null>(null);

  const filtered = filter === 'unread' ? initialMessages.filter((m) => !m.read) : initialMessages;
  const unreadCount = initialMessages.filter((m) => !m.read).length;

  const refresh = () => startTransition(() => router.refresh());

  const toggleRead = async (msg: Message) => {
    try {
      const res = await fetch(`/api/messages/${msg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: !msg.read }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Error');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/messages/${deleting.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Error');
      toast.success('Mensaje eliminado');
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
          {initialMessages.length} mensajes · {unreadCount} sin leer
        </p>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-fg-muted" />
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'border px-3 py-1.5 font-detail text-xs uppercase tracking-widest transition-colors',
              filter === 'all'
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-border text-fg-muted hover:text-fg',
            )}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={cn(
              'border px-3 py-1.5 font-detail text-xs uppercase tracking-widest transition-colors',
              filter === 'unread'
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-border text-fg-muted hover:text-fg',
            )}
          >
            Sin leer
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-border py-16 text-center">
          <Mail className="h-10 w-10 text-fg-muted" aria-hidden="true" />
          <p className="mt-4 font-display text-xl text-fg">Sin mensajes</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((m) => (
            <li
              key={m.id}
              className={cn(
                'border bg-bg-elevated p-4 transition-colors',
                m.read ? 'border-border' : 'border-accent/50',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {m.read ? (
                      <MailOpen className="h-4 w-4 text-fg-muted" />
                    ) : (
                      <Mail className="h-4 w-4 text-accent" />
                    )}
                    <h3 className="truncate font-display text-lg text-fg">
                      {m.subject ?? '(sin asunto)'}
                    </h3>
                    {!m.read && (
                      <span className="rounded-full bg-accent px-2 py-0.5 font-detail text-xs uppercase tracking-widest text-accent-fg">
                        Nuevo
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-detail text-xs uppercase tracking-widest text-fg-muted">
                    {m.name} · {m.email} ·{' '}
                    {new Date(m.createdAt).toLocaleString('es-ES')}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-fg">
                    {m.message}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => toggleRead(m)}
                    className="flex h-8 w-8 items-center justify-center text-fg-muted transition-colors hover:bg-bg hover:text-fg"
                    aria-label={m.read ? 'Marcar no leído' : 'Marcar leído'}
                  >
                    {m.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(m)}
                    className="flex h-8 w-8 items-center justify-center text-fg-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar mensaje"
        description={deleting ? `Vas a eliminar el mensaje de ${deleting.name}.` : ''}
        confirmText="Eliminar"
      />
    </div>
  );
}
