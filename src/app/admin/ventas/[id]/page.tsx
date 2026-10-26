import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { orders, orderItems, customers, productImages } from '@/drizzle/schema';
import { eq, asc, inArray } from 'drizzle-orm';
import OrderStatusForm from './OrderStatusForm';

export const dynamic = 'force-dynamic';

interface OrderDetailPageProps {
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

function formatDateTime(date: Date | string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const orderId = parseInt(params.id);
  if (isNaN(orderId)) notFound();

  const order = await db.select().from(orders).where(eq(orders.id, orderId)).then(r => r[0]);
  if (!order) notFound();

  const [items, customer] = await Promise.all([
    db.select({
      id: orderItems.id,
      productName: orderItems.productName,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      productId: orderItems.productId,
    })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId)),
    order.customerId
      ? db.select().from(customers).where(eq(customers.id, order.customerId)).then(r => r[0])
      : null,
  ]);

  // Fetch images for order items
  const productIds = items.map(i => i.productId).filter(Boolean) as number[];
  let imagesMap: Record<number, string> = {};
  if (productIds.length > 0) {
    const images = await db.select().from(productImages).where(
      inArray(productImages.productId, productIds)
    );
    for (const img of images) {
      if (!imagesMap[img.productId]) {
        imagesMap[img.productId] = img.url;
      }
    }
  }

  const subtotal = items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);

  return (
    <div>
      {/* Back link */}
      <div className="admin-edit-back">
        <Link href="/admin/ventas" className="admin-edit-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Volver a ventas
        </Link>
      </div>

      {/* Header */}
      <div className="admin-edit-header">
        <div className="admin-edit-header-left">
          <h1 className="admin-page-title">Orden {order.orderNumber}</h1>
          <span className={getStatusBadgeClass(order.status)}>
            {getStatusLabel(order.status)}
          </span>
        </div>
        <div className="admin-edit-header-actions">
          <button className="admin-btn admin-btn-secondary admin-btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Imprimir
          </button>
        </div>
      </div>

      <div className="admin-detail-grid">
        {/* Left — items + notes */}
        <div className="admin-detail-main">
          {/* Items */}
          <div className="admin-card">
            <h3 className="admin-detail-section-title">Productos</h3>
            {items.map((item) => (
              <div key={item.id} className="admin-detail-item">
                <div className="admin-detail-item-img">
                  {imagesMap[item.productId!] ? (
                    <Image src={imagesMap[item.productId!]} alt={item.productName} width={96} height={96} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div className="admin-detail-item-img-placeholder">📷</div>
                  )}
                </div>
                <div className="admin-detail-item-info">
                  <div className="admin-detail-item-name">{item.productName}</div>
                  <div className="admin-detail-item-qty">x{item.quantity}</div>
                </div>
                <div className="admin-detail-item-price">
                  {formatPrice(item.unitPrice * item.quantity)}
                </div>
              </div>
            ))}

            <div className="admin-detail-divider" />

            <div className="admin-detail-row">
              <span className="admin-detail-row-label">Subtotal</span>
              <span className="admin-detail-row-value">{formatPrice(subtotal)}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-row-label">Envío</span>
              <span className="admin-detail-row-value admin-detail-row-value--muted">$0</span>
            </div>
            <div className="admin-detail-divider" />
            <div className="admin-detail-row">
              <span className="admin-detail-row-label" style={{ fontWeight: 'var(--nimbus-fw-bold)' }}>Total</span>
              <span className="admin-detail-row-value" style={{ fontSize: 'var(--nimbus-fs-h5)' }}>{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="admin-card">
              <h3 className="admin-detail-section-title">Notas</h3>
              <p style={{ fontSize: 'var(--nimbus-fs-body)', color: 'var(--nimbus-neutral-text-high)' }}>{order.notes}</p>
            </div>
          )}
        </div>

        {/* Right — sidebar */}
        <div className="admin-detail-sidebar">
          {/* Customer */}
          <div className="admin-card">
            <h3 className="admin-detail-section-title">Cliente</h3>
            {customer ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--nimbus-space-3)', marginBottom: 'var(--nimbus-space-4)' }}>
                <div className="admin-detail-customer-avatar">
                  {customer.firstName[0]}{customer.lastName[0]}
                </div>
                <div>
                  <div className="admin-detail-customer-name">
                    <Link href={`/admin/clientes/${customer.id}`} className="admin-productos-product-link">
                      {customer.firstName} {customer.lastName}
                    </Link>
                  </div>
                  <div className="admin-detail-customer-email">{customer.email || 'Sin email'}</div>
                </div>
              </div>
            ) : (
              <p className="admin-detail-row-value--muted">Sin cliente asignado</p>
            )}
          </div>

          {/* Payment info */}
          <div className="admin-card">
            <h3 className="admin-detail-section-title">Pago</h3>
            <div className="admin-detail-row">
              <span className="admin-detail-row-label">Método</span>
              <span className="admin-detail-row-value">Mercado Pago</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-row-label">Estado</span>
              <span className={getStatusBadgeClass(order.status)}>
                {getStatusLabel(order.status)}
              </span>
            </div>
            <OrderStatusForm orderId={order.id} currentStatus={order.status} />
          </div>

          {/* Dates */}
          <div className="admin-card">
            <h3 className="admin-detail-section-title">Fechas</h3>
            <div className="admin-detail-row">
              <span className="admin-detail-row-label">Creada</span>
              <span className="admin-detail-row-value">{formatDateTime(order.createdAt)}</span>
            </div>
            <div className="admin-detail-row">
              <span className="admin-detail-row-label">Actualizada</span>
              <span className="admin-detail-row-value">{formatDateTime(order.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
