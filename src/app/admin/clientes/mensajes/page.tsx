import { getContactMessages, updateContactMessageStatus } from './actions';

export const dynamic = 'force-dynamic';

const STATUS_LABELS = { new: 'Nuevo', read: 'Leído', replied: 'Respondido', archived: 'Archivado' } as const;

export default async function Page() {
  const messages = await getContactMessages();

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Mensajes de clientes</h1>
          <p className="admin-page-subtitle">Consultas recibidas desde el formulario de contacto.</p>
        </div>
      </div>
       <div className="admin-table-container admin-mobile-cards admin-mobile-cards--messages">
        {messages.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-state-title">No hay mensajes</div>
            <div className="admin-empty-state-text">Las consultas del formulario aparecerán acá.</div>
          </div>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Fecha</th><th>Contacto</th><th>Mensaje</th><th>Estado</th><th>Acción</th></tr></thead>
            <tbody>
              {messages.map((message) => (
                <tr key={message.id}>
                  <td>{message.createdAt ? new Date(message.createdAt).toLocaleString('es-AR') : '—'}</td>
                  <td><strong>{message.name}</strong><br /><a href={`mailto:${message.email}`}>{message.email}</a>{message.phone && <><br />{message.phone}</>}</td>
                  <td className="admin-message-cell">{message.message}</td>
                  <td><span className="admin-tag">{STATUS_LABELS[message.status as keyof typeof STATUS_LABELS] || message.status}</span></td>
                  <td>
                    <form action={updateContactMessageStatus}>
                      <input type="hidden" name="id" value={message.id} />
                      <select name="status" defaultValue={message.status} className="admin-input admin-input-sm">
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
