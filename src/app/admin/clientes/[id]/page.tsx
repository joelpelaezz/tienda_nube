import { notFound } from 'next/navigation';
import Link from 'next/link';
import TrackedWhatsAppLink from '@/components/TrackedWhatsAppLink';
import { db } from '@/lib/db';
import { customers, orders, orderItems } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface CustomerDetailPageProps {
  params: { id: string };
}

function formatPrice(cents: number | null): string {
  if (cents === null || cents === undefined) return '$0';
  return '$' + cents.toLocaleString('es-AR');
}

function formatDate(date: Date | string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Pendiente';
    case 'confirmed': return 'Confirmado';
    case 'packed': return 'Empaquetado';
    case 'shipped': return 'Enviado';
    case 'delivered': return 'Entregado';
    case 'cancelled': return 'Cancelado';
    default: return status;
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'pending': return 'admin-detail-status-badge admin-detail-status-badge--pending';
    case 'delivered': return 'admin-detail-status-badge admin-detail-status-badge--delivered';
    case 'cancelled': return 'admin-detail-status-badge admin-detail-status-badge--cancelled';
    default: return 'admin-detail-status-badge admin-detail-status-badge--default';
  }
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const customerId = parseInt(params.id);
  if (isNaN(customerId)) notFound();

  const customer = await db.select().from(customers).where(eq(customers.id, customerId)).then(r => r[0]);
  if (!customer) notFound();

  const customerOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt));

  // Get item counts per order
  const orderIds = customerOrders.map(o => o.id);
  let itemCounts: Record<number, number> = {};
  if (orderIds.length > 0) {
    for (const oid of orderIds) {
      const count = await db.select({ count: orderItems.id }).from(orderItems).where(eq(orderItems.orderId, oid));
      itemCounts[oid] = count.length;
    }
  }

  const totalSpent = customerOrders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div>
      {/* Back link */}
      <div className="admin-edit-back">
        <Link href="/admin/clientes" className="admin-edit-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Volver a clientes
        </Link>
      </div>

      {/* Header */}
      <div className="admin-edit-header">
        <div className="admin-edit-header-left">
          <div className="admin-detail-customer-avatar">
            {customer.firstName[0]}{customer.lastName[0]}
          </div>
          <div>
            <h1 className="admin-page-title">{customer.firstName} {customer.lastName}</h1>
            <div className="admin-detail-customer-email">{customer.email || 'Sin email'}</div>
          </div>
        </div>
        <div className="admin-edit-header-actions">
          {customer.phone && (
            <TrackedWhatsAppLink
              source="admin-customer-detail"
              name={`${customer.firstName} ${customer.lastName}`.trim()}
              phone={customer.phone || undefined}
              href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn admin-btn-secondary admin-btn-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </TrackedWhatsAppLink>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="admin-btn admin-btn-secondary admin-btn-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Email
            </a>
          )}
        </div>
      </div>

      <div className="admin-detail-grid">
        {/* Left — order history */}
        <div className="admin-detail-main">
          <div className="admin-card">
            <h3 className="admin-detail-section-title">Historial de compras</h3>
            {customerOrders.length === 0 ? (
              <div className="admin-edit-variant-empty">
                Este cliente no tiene compras registradas.
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Orden</th>
                      <th>Estado</th>
                      <th>Ítems</th>
                      <th>Total</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <Link href={`/admin/ventas/${order.id}`} className="admin-productos-product-link">
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td>
                          <span className={getStatusBadgeClass(order.status)}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td>{itemCounts[order.id] || 0}</td>
                        <td className="admin-productos-price-value">{formatPrice(order.total)}</td>
                        <td className="admin-productos-dash">{formatDate(order.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right — customer info */}
        <div className="admin-detail-sidebar">
          <div className="admin-card">
            <h3 className="admin-detail-section-title">Datos del cliente</h3>
            <div className="admin-detail-row">
              <span className="admin-detail-row-label">Nombre</span>
              <span className="admin-detail-row-value">{customer.firstName} {customer.lastName}</span>
            </div>
            {customer.dni && (
              <div className="admin-detail-row">
                <span className="admin-detail-row-label">DNI</span>
                <span className="admin-detail-row-value">{customer.dni}</span>
              </div>
            )}
            <div className="admin-detail-row">
              <span className="admin-detail-row-label">Email</span>
              <span className="admin-detail-row-value">{customer.email || '—'}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-row-label">Teléfono</span>
              <span className="admin-detail-row-value">{customer.phone || '—'}</span>
            </div>
            <div className="admin-detail-divider" />
            <div className="admin-detail-row">
              <span className="admin-detail-row-label">Registrado</span>
              <span className="admin-detail-row-value">{formatDate(customer.createdAt)}</span>
            </div>
          </div>

          <div className="admin-card">
            <h3 className="admin-detail-section-title">Resumen</h3>
            <div className="admin-detail-row">
              <span className="admin-detail-row-label">Total gastado</span>
              <span className="admin-detail-row-value" style={{ fontSize: 'var(--nimbus-fs-h5)' }}>{formatPrice(totalSpent)}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-row-label">Compras realizadas</span>
              <span className="admin-detail-row-value">{customerOrders.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
