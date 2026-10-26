import { getNewsletterSubscribers, updateNewsletterSubscriberStatus } from './actions';

export const dynamic = 'force-dynamic';

const STATUS_LABELS = {
  subscribed: 'Suscripto',
  unsubscribed: 'Dado de baja',
} as const;

export default async function SuscripcionesPage() {
  const subscribers = await getNewsletterSubscribers();
  const activeCount = subscribers.filter((subscriber) => subscriber.status === 'subscribed').length;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Suscripciones</h1>
          <p className="admin-page-subtitle">Personas suscriptas al newsletter desde la tienda.</p>
        </div>
        <span className="admin-tag">{activeCount} activos</span>
      </div>

       <div className="admin-table-container admin-mobile-cards admin-mobile-cards--subscriptions">
        {subscribers.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-state-title">No hay suscriptores</div>
            <div className="admin-empty-state-text">Las suscripciones del newsletter aparecerán acá.</div>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Fecha</th><th>Contacto</th><th>Origen</th><th>Estado</th><th>Acción</th></tr>
            </thead>
            <tbody>
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id}>
                  <td>{subscriber.createdAt ? new Date(subscriber.createdAt).toLocaleString('es-AR') : '—'}</td>
                  <td>
                    <strong>{subscriber.name || 'Sin nombre'}</strong><br />
                    <a href={`mailto:${subscriber.email}`}>{subscriber.email}</a>
                  </td>
                  <td>{subscriber.source}</td>
                  <td><span className="admin-tag">{STATUS_LABELS[subscriber.status as keyof typeof STATUS_LABELS] || subscriber.status}</span></td>
                  <td>
                    <form action={updateNewsletterSubscriberStatus}>
                      <input type="hidden" name="id" value={subscriber.id} />
                      <select name="status" defaultValue={subscriber.status} className="admin-input admin-input-sm">
                        {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <button type="submit" className="admin-btn admin-btn-secondary admin-btn-sm">Guardar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
