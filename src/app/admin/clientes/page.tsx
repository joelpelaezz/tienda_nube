import Link from 'next/link';
import TrackedWhatsAppLink from '@/components/TrackedWhatsAppLink';
import { db } from '@/lib/db';
import { customers, orders } from '@/drizzle/schema';
import { eq, sql, desc, asc, ilike, and, or } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface ClientesPageProps {
  searchParams: {
    page?: string;
    search?: string;
  };
}

async function getCustomersData(page: number, perPage: number, search: string) {
  const offset = (page - 1) * perPage;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(customers.firstName, `%${search}%`),
        ilike(customers.lastName, `%${search}%`),
        ilike(customers.email, `%${search}%`),
      )
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [customersList, countResult, customerStats] = await Promise.all([
    db.select({
      id: customers.id,
      firstName: customers.firstName,
      lastName: customers.lastName,
      email: customers.email,
      phone: customers.phone,
      dni: customers.dni,
      createdAt: customers.createdAt,
    })
      .from(customers)
      .where(whereClause)
      .orderBy(desc(customers.createdAt))
      .limit(perPage)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(whereClause)
      .then(r => r[0]),
    db.select({
      customerId: orders.customerId,
      totalSpent: sql<number>`coalesce(sum(${orders.total}), 0)`,
    })
      .from(orders)
      .groupBy(orders.customerId),
  ]);

  // Get last order ID per customer (most recent order by createdAt)
  const lastOrdersMap: Record<number, { lastOrderId: number; lastOrderNumber: string; lastOrderDate: Date | null }> = {};
  try {
    // Use raw SQL with DISTINCT ON for Postgres
    const lastOrders = await db
      .select({
        customerId: orders.customerId,
        lastOrderId: orders.id,
        lastOrderNumber: orders.orderNumber,
        lastOrderDate: orders.createdAt,
      })
      .from(orders)
      .orderBy(asc(orders.customerId), desc(orders.createdAt))
      // @ts-ignore - distinctOn is supported in Postgres
      .distinctOn([orders.customerId]);

    for (const o of lastOrders) {
      if (o.customerId) {
        lastOrdersMap[o.customerId] = {
          lastOrderId: o.lastOrderId,
          lastOrderNumber: o.lastOrderNumber || '',
          lastOrderDate: o.lastOrderDate,
        };
      }
    }
  } catch {
    // Fallback: use statsMap order numbers if distinctOn fails
  }

  const statsMap: Record<number, { lastOrderId: number; lastOrderNumber: string; lastOrderDate: Date | null; totalSpent: number }> = {};
  for (const stat of customerStats) {
    if (stat.customerId) {
      statsMap[stat.customerId] = {
        lastOrderId: lastOrdersMap[stat.customerId]?.lastOrderId || 0,
        lastOrderNumber: lastOrdersMap[stat.customerId]?.lastOrderNumber || '',
        lastOrderDate: lastOrdersMap[stat.customerId]?.lastOrderDate || null,
        totalSpent: stat.totalSpent || 0,
      };
    }
  }

  const enriched = customersList.map(c => ({
    ...c,
    lastOrder: statsMap[c.id]?.lastOrderNumber || null,
    lastOrderId: statsMap[c.id]?.lastOrderId || null,
    lastOrderDate: statsMap[c.id]?.lastOrderDate || null,
    totalSpent: statsMap[c.id]?.totalSpent || 0,
  }));

  return { customers: enriched, total: countResult.count };
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

function buildUrl(overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (overrides.page) params.set('page', overrides.page);
  if (overrides.search !== undefined) params.set('search', overrides.search || '');
  return `/admin/clientes?${params.toString()}`;
}

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const page = parseInt(searchParams.page || '1');
  const perPage = 20;
  const search = searchParams.search || '';
  const offset = (page - 1) * perPage;

  const { customers: customersList, total } = await getCustomersData(page, perPage, search);
  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      {/* Header */}
      <div className="admin-page-header">
        <h1 className="admin-page-title">Clientes</h1>
        <div className="admin-page-header-actions">
          <button className="admin-btn admin-btn-secondary admin-btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar lista
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="admin-filter-row">
        <form method="GET" action="/admin/clientes" className="admin-search-wrapper" style={{ flex: 1 }}>
          <div className="admin-search-wrapper" style={{ flex: 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Buscar por nombre, email..."
              className="admin-search-input"
            />
          </div>
          <button type="submit" className="admin-btn admin-btn-secondary admin-btn-sm">
            Buscar
          </button>
        </form>
      </div>

      {/* Content */}
      {customersList.length === 0 ? (
        <div className="admin-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="admin-empty-state-icon">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h2 className="admin-empty-state-title">
            {search ? 'No encontramos clientes para tu búsqueda' : 'No hay clientes aún'}
          </h2>
          <p className="admin-empty-state-text">
            {search ? 'Probá con otros términos de búsqueda.' : 'Los clientes aparecerán cuando hagan pedidos.'}
          </p>
        </div>
      ) : (
        <div className="admin-table-container admin-mobile-cards admin-mobile-cards--clients">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Último pedido</th>
                <th>Total pagado</th>
                <th>Fecha de registro</th>
                <th style={{ width: 120 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {customersList.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--nimbus-space-3)' }}>
                      <div className="admin-contact-avatar" style={{ width: 36, height: 36, fontSize: 'var(--nimbus-font-size-xs)' }}>
                        {customer.firstName?.charAt(0)}{customer.lastName?.charAt(0)}
                      </div>
                      <div>
                        <Link href={`/admin/clientes/${customer.id}`} className="admin-link">
                          {customer.firstName} {customer.lastName}
                        </Link>
                        {customer.dni && (
                          <div className="admin-td-muted" style={{ fontSize: 'var(--nimbus-font-size-xs)' }}>
                            DNI {customer.dni}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--nimbus-space-2)' }}>
                      {customer.email && (
                        <a
                          href={`mailto:${customer.email}`}
                          className="admin-contact-icon admin-contact-email"
                          title={customer.email}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                          </svg>
                        </a>
                      )}
                      {customer.phone && (
                        <TrackedWhatsAppLink
                          source="admin-customer-contact"
                          name={`${customer.firstName} ${customer.lastName}`.trim()}
                          phone={customer.phone || undefined}
                          href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
                          className="admin-contact-icon admin-contact-whatsapp"
                          title={customer.phone}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </TrackedWhatsAppLink>
                      )}
                    </div>
                  </td>
                  <td>
                    {customer.lastOrder && customer.lastOrderId ? (
                      <Link href={`/admin/ventas/${customer.lastOrderId}`} className="admin-link">
                        {customer.lastOrder}
                      </Link>
                    ) : (
                      <span className="admin-td-muted">—</span>
                    )}
                  </td>
                  <td className="admin-td-bold">
                    {formatPrice(customer.totalSpent)}
                  </td>
                  <td className="admin-td-muted">
                    {formatDate(customer.createdAt)}
                  </td>
                  <td>
                    <div className="admin-contact-actions">
                      {customer.phone && (
                        <TrackedWhatsAppLink
                          source="admin-customer-message"
                          name={`${customer.firstName} ${customer.lastName}`.trim()}
                          phone={customer.phone || undefined}
                          href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=Hola%20${encodeURIComponent(customer.firstName || '')},%20somos%20Tendencias.`}
                          className="admin-contact-icon admin-contact-whatsapp"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </TrackedWhatsAppLink>
                      )}
                      {customer.email && (
                        <a
                          href={`mailto:${customer.email}?subject=Tendencias&body=Hola%20${encodeURIComponent(customer.firstName || '')},%20te%20escribimos%20de%20Tendencias.`}
                          className="admin-contact-icon admin-contact-email"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="admin-pagination">
            <span className="admin-pagination-info">
              Mostrando {offset + 1}-{Math.min(offset + perPage, total)} clientes de {total}
            </span>

            {totalPages > 1 && (
              <div className="admin-pagination-buttons">
                {page > 1 && (
                  <Link
                    href={buildUrl({ page: String(page - 1), search })}
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
                    href={buildUrl({ page: String(p), search })}
                    className={`admin-btn admin-btn-sm admin-pagination-btn ${p === page ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
                  >
                    {p}
                  </Link>
                ))}

                {page < totalPages && (
                  <Link
                    href={buildUrl({ page: String(page + 1), search })}
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
        <span style={{ color: 'var(--color-text-muted)', cursor: 'default' }}>Más sobre contactar a clientes</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </div>
    </div>
  );
}
