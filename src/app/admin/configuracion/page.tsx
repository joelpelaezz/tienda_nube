import Link from 'next/link';
import { CONFIG_SECTION_GROUPS } from './sections';

// C4-TRACE: configuration entry point lists every topic with its own scope.
export default function ConfiguracionPage() {
  return (
    <div className="config-section">
      <div className="config-section-header">
        <h1 className="admin-page-title">Configuración de la tienda</h1>
        <p className="admin-page-subtitle">
          Cada sección se guarda por separado, así un cambio no pisa lo que configuraste en otra.
        </p>
      </div>

      {CONFIG_SECTION_GROUPS.map((group) => (
        <div key={group.group} style={{ marginTop: '24px' }}>
          <h2 className="config-overview-group-title">{group.group}</h2>
          <div className="config-overview-grid">
            {group.items.map((item) => (
              <Link key={item.slug} href={item.href} className="config-overview-card">
                <span className="config-overview-card-title">{item.label}</span>
                <span className="config-overview-card-description">{item.description}</span>
                <span className="config-overview-card-link">
                  {item.external ? 'Abrir' : 'Configurar'}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
