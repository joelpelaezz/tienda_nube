import Link from 'next/link';
import { db } from '@/lib/db';
import { orders, orderItems, customers } from '@/drizzle/schema';
import { eq, sql, desc, ilike, and, or, count, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface VentasPageProps {
  searchParams: {
    page?: string;
    search?: string;
    status?: string;
  };
}

async function getOrdersData(page: number, perPage: number, search: string, statusFilter: string) {
  const offset = (page - 1) * perPage;

  // Build conditions
  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(orders.orderNumber, `%${search}%`),
        ilike(customers.firstName, `%${search}%`),
        ilike(customers.lastName, `%${search}%`),
        ilike(customers.email, `%${search}%`)
      )
    );
  }
  if (statusFilter && statusFilter !== 'all') {
    // Map tab labels to statuses
    const statusMap: Record<string, string[]> = {
      'por-cobrar': ['pending', 'confirmed'],
      'por-empaquetar': ['packed'],
      'por-enviar': ['shipped'],
      'por-retirar': ['ready-for-pickup'],
      'por-archivar': ['delivered'],
    };
    const statuses = statusMap[statusFilter] || [statusFilter];
    if (statuses.length > 0) {
      conditions.push(inArray(orders.status, statuses));
    }
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [ordersList, countResult, statusCounts] = await Promise.all([
    db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      customerEmail: customers.email,
    })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(perPage)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(whereClause)
      .then(r => r[0]),
    db.select({
      status: orders.status,
      count: sql<number>`count(*)::int`,
    })
      .from(orders)
      .groupBy(orders.status),
  ]);

  return {
    orders: ordersList,
    total: countResult.count,
    statusCounts,
  };
}

function getStatusCounts(statusCounts: { status: string; count: number }[]) {
  const map: Record<string, number> = {};
  for (const row of statusCounts) {
    map[row.status] = row.count;
  }
  return {
    pending: map['pending'] || 0,
    confirmed: map['confirmed'] || 0,
    packed: map['packed'] || 0,
    shipped: map['shipped'] || 0,
    delivered: map['delivered'] || 0,
    cancelled: map['cancelled'] || 0,
  };
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

function getStatusClass(status: string): string {
  switch (status) {
    case 'pending': return 'admin-order-status admin-order-status-pending';
    case 'delivered': return 'admin-order-status admin-order-status-delivered';
    case 'cancelled': return 'admin-order-status admin-order-status-cancelled';
    default: return 'admin-order-status admin-order-status-default';
  }
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

function buildUrl(overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (overrides.page) params.set('page', overrides.page);
  if (overrides.search !== undefined) params.set('search', overrides.search || '');
  if (overrides.status !== undefined) params.set('status', overrides.status || '');
  return `/admin/ventas?${params.toString()}`;
}

export default async function VentasPage({ searchParams }: VentasPageProps) {
  const page = parseInt(searchParams.page || '1');
  const perPage = 20;
  const search = searchParams.search || '';
  const statusFilter = searchParams.status || 'all';
  const offset = (page - 1) * perPage;

  const { orders: ordersList, total, statusCounts } = await getOrdersData(page, perPage, search, statusFilter);
  const counts = getStatusCounts(statusCounts);
  const totalPages = Math.ceil(total / perPage);

  const tabs = [
    { label: 'Todas', value: 'all', count: total },
    { label: 'Por cobrar', value: 'por-cobrar', count: counts.pending + counts.confirmed },
    { label: 'Por empaquetar', value: 'por-empaquetar', count: counts.packed },
    { label: 'Por enviar', value: 'por-enviar', count: counts.shipped },
    { label: 'Por archivar', value: 'por-archivar', count: counts.delivered },
  ];

  return (
    <div>
      {/* Header */}
      <div className="admin-page-header">
        <h1 className="admin-page-title">Ventas</h1>
        <div className="admin-page-header-actions">
          <button className="admin-btn admin-btn-secondary admin-btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar lista
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="admin-filter-row">
        <form method="GET" action="/admin/ventas" className="admin-search-wrapper" style={{ flex: 1, display: 'flex', gap: 'var(--nimbus-space-2)' }}>
          {statusFilter !== 'all' && <input type="hidden" name="status" value={statusFilter} />}
          <div className="admin-search-wrapper" style={{ flex: 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Buscar por número de orden, nombre o email del cliente"
              className="admin-search-input"
            />
          </div>
          <button type="submit" className="admin-btn admin-btn-secondary admin-btn-sm">
            Buscar
          </button>
        </form>

        {/* Status tabs */}
        <div className="admin-status-tabs">
          {tabs.map((tab) => (
            <Link
              key={tab.value}
              href={buildUrl({ page: '1', search, status: tab.value })}
              className={`admin-status-tab ${statusFilter === tab.value ? 'admin-status-tab-active' : ''}`}
            >
              <span>{tab.label}</span>
              <span className="admin-status-badge">{tab.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Content */}
      {ordersList.length === 0 ? (
        <div className="admin-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="admin-empty-state-icon">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <h2 className="admin-empty-state-title">
            {search ? 'No encontramos ventas para tu búsqueda' : 'No hay ventas aún'}
          </h2>
          <p className="admin-empty-state-text">
            {search ? 'Probá con otros términos de búsqueda.' : 'Las ventas aparecerán cuando los clientes hagan pedidos.'}
          </p>
        </div>
      ) : (
         <div className="admin-table-container admin-mobile-cards admin-mobile-cards--sales">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" className="admin-checkbox" />
                </th>
                <th>Orden</th>
                <th>Estado</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {ordersList.map((order) => (
                <tr key={order.id}>
                  <td>
                    <input type="checkbox" className="admin-checkbox" />
                  </td>
                  <td>
                    <Link href={`/admin/ventas/${order.id}`} className="admin-link">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td>
                    <span className={getStatusClass(order.status)}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td>
                    {order.customerFirstName ? `${order.customerFirstName} ${order.customerLastName}` : '—'}
                  </td>
                  <td className="admin-td-bold">
                    {formatPrice(order.total)}
                  </td>
                  <td className="admin-td-muted">
                    {formatDate(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="admin-pagination">
            <span className="admin-pagination-info">
              Mostrando {offset + 1}-{Math.min(offset + perPage, total)} ventas de {total}
            </span>

            {totalPages > 1 && (
              <div className="admin-pagination-buttons">
                {page > 1 && (
                  <Link
                    href={buildUrl({ page: String(page - 1), search, status: statusFilter })}
                    className="admin-btn admin-btn-ghost admin-btn-sm admin-pagination-btn"
                  >
                    ←
                  </Link>
                )}

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
                  return startPage + i;
                }).filter(p => p <= totalPages).map((p) => (
                  <Link
                    key={p}
                    href={buildUrl({ page: String(p), search, status: statusFilter })}
                    className={`admin-btn admin-btn-sm admin-pagination-btn ${p === page ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
                  >
                    {p}
                  </Link>
                ))}

                {page < totalPages && (
                  <Link
                    href={buildUrl({ page: String(page + 1), search, status: statusFilter })}
                    className="admin-btn admin-btn-ghost admin-btn-sm admin-pagination-btn"
                  >
                    →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help link */}
      <div className="admin-help-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span style={{ color: 'var(--color-text-muted)', cursor: 'default' }}>Más sobre ventas</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </div>
    </div>
  );
}
