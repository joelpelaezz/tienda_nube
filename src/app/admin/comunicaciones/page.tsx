import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { communicationEvents, contactMessages, newsletterSubscribers } from '@/drizzle/schema';

export const dynamic = 'force-dynamic';

export default async function CommunicationsPage() {
  const [messages, subscribers, whatsappEvents] = await Promise.all([
    db.select().from(contactMessages).orderBy(asc(contactMessages.createdAt)),
    db.select().from(newsletterSubscribers).orderBy(asc(newsletterSubscribers.createdAt)),
    db.select().from(communicationEvents).orderBy(asc(communicationEvents.createdAt)),
  ]);

  const entries = [
    ...messages.map((entry) => ({
      id: `contact-${entry.id}`,
      channel: 'Contacto',
      detail: entry.message,
      person: entry.name,
      address: entry.email,
      status: entry.status,
      source: 'Formulario de contacto',
      createdAt: entry.createdAt,
    })),
    ...subscribers.map((entry) => ({
      id: `newsletter-${entry.id}`,
      channel: 'Newsletter',
      detail: 'Suscripción al newsletter',
      person: entry.name || 'Sin nombre',
      address: entry.email,
      status: entry.status,
      source: entry.source,
      createdAt: entry.createdAt,
    })),
    ...whatsappEvents.map((entry) => ({
      id: `whatsapp-${entry.id}`,
      channel: 'WhatsApp',
      detail: 'Clic de contacto registrado',
      person: entry.name || 'Sin nombre',
      address: entry.phone || 'Sin teléfono',
      status: 'click',
      source: entry.source,
      createdAt: entry.createdAt,
    })),
  ].sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Comunicaciones</h1>
          <p className="admin-page-subtitle">Contactos, newsletter y actividad de WhatsApp en un solo lugar.</p>
        </div>
        <span className="admin-tag">{entries.length} entradas</span>
      </div>

      <div className="admin-communication-grid">
        <div className="admin-card"><strong>{messages.filter((item) => item.status === 'new').length}</strong><span>mensajes nuevos</span></div>
        <div className="admin-card"><strong>{subscribers.filter((item) => item.status === 'subscribed').length}</strong><span>suscriptores activos</span></div>
        <div className="admin-card"><strong>{whatsappEvents.length}</strong><span>clics de WhatsApp</span></div>
      </div>

      <div className="admin-table-container admin-communication-table">
        {entries.length === 0 ? (
          <div className="admin-empty-state"><div className="admin-empty-state-title">No hay comunicaciones</div><div className="admin-empty-state-text">Las entradas aparecerán acá cuando alguien contacte la tienda.</div></div>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Canal</th><th>Contacto</th><th>Detalle</th><th>Origen</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>{entries.map((entry) => (
              <tr key={entry.id}>
                <td><span className={`admin-communication-channel admin-communication-channel--${entry.channel.toLowerCase()}`}>{entry.channel}</span></td>
                <td><strong>{entry.person}</strong><br /><span className="admin-td-muted">{entry.address}</span></td>
                <td className="admin-message-cell">{entry.detail}</td>
                <td>{entry.source}</td>
                <td><span className="admin-tag">{entry.status}</span></td>
                <td>{entry.createdAt ? new Date(entry.createdAt).toLocaleString('es-AR') : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
