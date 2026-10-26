import Link from 'next/link';
import { db } from '@/lib/db';
import { orders, orderItems, products, customers } from '@/drizzle/schema';
import { eq, sql, desc, count, sum } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Count orders by status (matching the same mapping as ventas page)
  const [allOrders] = await db
    .select({ count: count() })
    .from(orders);

  const [pendingOrders] = await db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.status, 'pending'));

  const [confirmedOrders] = await db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.status, 'confirmed'));

  const [packedOrders] = await db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.status, 'packed'));

  const [shippedOrders] = await db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.status, 'shipped'));

  const [deliveredOrders] = await db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.status, 'delivered'));

  // Por cobrar = pending + confirmed
  const porCobrar = (pendingOrders?.count ?? 0) + (confirmedOrders?.count ?? 0);
  // Por empaquetar = packed
  const porEmpaquetar = packedOrders?.count ?? 0;
  // Por enviar = shipped
  const porEnviar = shippedOrders?.count ?? 0;
  // Por retirar = delivered (ready to pickup)
  const porRetirar = deliveredOrders?.count ?? 0;

  // Daily metrics (today's orders)
  const [todayOrders] = await db
    .select({
      count: count(),
      total: sum(orders.total),
    })
    .from(orders)
    .where(sql`DATE(orders.created_at) = CURRENT_DATE`);

  const todayCount = todayOrders?.count ?? 0;
  const todayTotal = todayOrders?.total ?? 0;
  const ticketPromedio = todayCount > 0 ? Math.round(Number(todayTotal) / todayCount) : 0;

  // Onboarding steps
  const [productsCount] = await db.select({ count: count() }).from(products);
  const [customersCount] = await db.select({ count: count() }).from(customers);

  const onboardingSteps = [
    { label: 'Creá y publicá tu tienda', done: true },
    { label: 'Mostrá tus productos', done: (productsCount?.count ?? 0) > 0 },
    { label: 'Personalizá tu tienda', done: false },
    { label: 'Definí de dónde salen tus pedidos', done: (customersCount?.count ?? 0) > 0 },
    { label: 'Elegí cómo enviar tus productos', done: false },
    { label: 'Revisá la configuración de Pago Nube', done: false },
  ];
  const onboardingDone = onboardingSteps.filter(s => s.done).length;

  return {
    porCobrar,
    porEmpaquetar,
    porEnviar,
    porRetirar,
    todayCount,
    todayTotal: Number(todayTotal),
    ticketPromedio,
    onboardingSteps,
    onboardingDone,
    totalOrders: allOrders?.count ?? 0,
  };
}

export default async function AdminDashboard() {
  const data = await getDashboardData();

  return (
    <div>
      {/* Page header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Inicio</h1>
          <p className="admin-page-subtitle">Resumen de tu tienda</p>
        </div>

        {/* Period selector */}
        <div className="admin-period-selector">
          <button className="admin-period-btn active">Hoy</button>
          <button className="admin-period-btn">Ayer</button>
          <button className="admin-period-btn">Esta semana</button>
        </div>
      </div>

      {/* KPI Cards — links to filtered orders */}
      <div className="admin-kpi-grid">
        <Link href="/admin/ventas?status=por-cobrar" className="admin-kpi-card">
          <div className="admin-kpi-label">Por cobrar</div>
          <div className="admin-kpi-value">{data.porCobrar}</div>
        </Link>

        <Link href="/admin/ventas?status=por-empaquetar" className="admin-kpi-card">
          <div className="admin-kpi-label">Por empaquetar</div>
          <div className="admin-kpi-value">{data.porEmpaquetar}</div>
        </Link>

        <Link href="/admin/ventas?status=por-enviar" className="admin-kpi-card">
          <div className="admin-kpi-label">Por enviar</div>
          <div className="admin-kpi-value">{data.porEnviar}</div>
        </Link>

        <Link href="/admin/ventas?status=por-retirar" className="admin-kpi-card">
          <div className="admin-kpi-label">Por retirar</div>
          <div className="admin-kpi-value">{data.porRetirar}</div>
        </Link>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button className="admin-tab active">Métricas de la tienda</button>
        <button className="admin-tab">Productos más vendidos</button>
      </div>

      {/* Metrics section */}
      <div className="admin-card admin-dashboard-metrics">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Métricas del día</h3>
        </div>

        <div className="admin-dashboard-metrics-grid">
          <div>
            <div className="admin-kpi-label">Visitas únicas</div>
            <div className="admin-dashboard-metric-value">—</div>
          </div>
          <div>
            <div className="admin-kpi-label">Ventas</div>
            <div className="admin-dashboard-metric-value">{data.todayCount}</div>
          </div>
          <div>
            <div className="admin-kpi-label">Facturación</div>
            <div className="admin-dashboard-metric-value">${data.todayTotal.toLocaleString('es-AR')}</div>
          </div>
          <div>
            <div className="admin-kpi-label">Ticket promedio</div>
            <div className="admin-dashboard-metric-value">${data.ticketPromedio.toLocaleString('es-AR')}</div>
          </div>
        </div>
      </div>

      {/* Onboarding checklist */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Primeros pasos</h3>
          <span className="admin-badge admin-badge-info">{data.onboardingDone}/6</span>
        </div>

        <div className="admin-dashboard-steps">
          {data.onboardingSteps.map((step, i) => (
            <div key={i} className="admin-dashboard-step">
              <div className={`admin-dashboard-step-check ${step.done ? 'admin-dashboard-step-check--done' : ''}`}>
                {step.done && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span className={`admin-dashboard-step-label ${step.done ? 'admin-dashboard-step-label--done' : ''}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
