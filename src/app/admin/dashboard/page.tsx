import Link from 'next/link';

export default function AdminDashboard() {
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
          <div className="admin-kpi-value">$0</div>
        </Link>

        <Link href="/admin/ventas?status=por-empaquetar" className="admin-kpi-card">
          <div className="admin-kpi-label">Por empaquetar</div>
          <div className="admin-kpi-value">0</div>
        </Link>

        <Link href="/admin/ventas?status=por-enviar" className="admin-kpi-card">
          <div className="admin-kpi-label">Por enviar</div>
          <div className="admin-kpi-value">0</div>
        </Link>

        <Link href="/admin/ventas?status=por-retirar" className="admin-kpi-card">
          <div className="admin-kpi-label">Por retirar</div>
          <div className="admin-kpi-value">0</div>
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
            <div className="admin-dashboard-metric-value">0</div>
          </div>
          <div>
            <div className="admin-kpi-label">Ventas</div>
            <div className="admin-dashboard-metric-value">0</div>
          </div>
          <div>
            <div className="admin-kpi-label">Facturación</div>
            <div className="admin-dashboard-metric-value">$0</div>
          </div>
          <div>
            <div className="admin-kpi-label">Ticket promedio</div>
            <div className="admin-dashboard-metric-value">$0</div>
          </div>
        </div>
      </div>

      {/* Onboarding checklist */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Primeros pasos</h3>
          <span className="admin-badge admin-badge-info">0/6</span>
        </div>

        <div className="admin-dashboard-steps">
          {[
            { label: 'Creá y publicá tu tienda', done: true },
            { label: 'Mostrá tus productos', done: false },
            { label: 'Personalizá tu tienda', done: false },
            { label: 'Definí de dónde salen tus pedidos', done: false },
            { label: 'Elegí cómo enviar tus productos', done: false },
            { label: 'Revisá la configuración de Pago Nube', done: false },
          ].map((step, i) => (
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
