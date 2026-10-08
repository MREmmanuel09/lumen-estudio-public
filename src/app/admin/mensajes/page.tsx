import { db } from '@/lib/db';
import { AdminMessagesList } from './AdminMessagesList';

export default async function AdminMessagesPage() {
  const messages = await db.message.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div>
      <div className="mb-8">
        <p className="font-detail text-xs uppercase tracking-widest text-accent">
          Gestión
        </p>
        <h1 className="mt-2 font-display text-display-md text-fg">Mensajes</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Mensajes recibidos desde el formulario de contacto.
        </p>
      </div>
      <AdminMessagesList
        initialMessages={messages.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          subject: m.subject,
          message: m.message,
          read: m.read,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
