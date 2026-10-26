'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/* ──────────────────────────────────────────────────────
   Navigation config — matches original Tiendanube sidebar
   ────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  // Top section (no header)
  { label: 'Inicio', icon: 'home', href: '/admin/dashboard' },
  { label: 'Estadísticas', icon: 'bar-chart', href: '/admin/stats' },

  // Gestión
  { section: 'Gestión' },
  {
    label: 'Ventas', icon: 'shopping-cart', href: '/admin/ventas',
    children: [
      { label: 'Lista de ventas', href: '/admin/ventas' },
      { label: 'Órdenes de compra', href: '/admin/ventas/ordenes' },
      { label: 'Carritos abandonados', href: '/admin/ventas/carritos' },
    ],
  },
  {
    label: 'Productos', icon: 'box', href: '/admin/productos',
    children: [
      { label: 'Lista de productos', href: '/admin/productos' },
      { label: 'Inventario', href: '/admin/inventario' },
      { label: 'Categorías', href: '/admin/categorias' },
      { label: 'Variaciones', href: '/admin/variaciones' },
      { label: 'Suscripciones', href: '/admin/suscripciones', badgeKey: 'subscribers' },
      { label: 'Tablas de precios', href: '/admin/precios' },
    ],
  },
  { label: 'Pago Nube', icon: 'credit-card', href: '/admin/pagos' },
  { label: 'Envío Nube', icon: 'truck', href: '/admin/envios', badgeKey: 'shipping' },
  {
    label: 'Clientes', icon: 'users', href: '/admin/clientes',
    children: [
      { label: 'Lista de clientes', href: '/admin/clientes' },
      { label: 'Mensajes', href: '/admin/clientes/mensajes', badgeKey: 'messages' },
    ],
  },
  { label: 'Descuentos', icon: 'percent', href: '/admin/descuentos' },
  { label: 'Marketing', icon: 'megaphone', href: '/admin/marketing' },
  { label: 'Comunicaciones', icon: 'message-circle', href: '/admin/comunicaciones' },

  // Canales de venta
  { section: 'Canales de venta' },
  { label: 'Tienda online', icon: 'store', href: '/admin/tienda-online', external: true },
  { label: 'Punto de Venta', icon: 'monitor', href: '/admin/pos', external: true },
  { label: 'Chat', icon: 'message-circle', href: '/admin/chat' },
  { label: 'Instagram y Facebook', icon: 'instagram', href: '/admin/instagram' },
  { label: 'Google Shopping', icon: 'google', href: '/admin/google-shopping' },
  { label: 'TikTok', icon: 'tiktok', href: '/admin/tiktok' },
  { label: 'Pinterest', icon: 'pinterest', href: '/admin/pinterest' },
  { label: 'Marketplaces', icon: 'grid', href: '/admin/marketplaces' },

  // Aplicaciones
  { section: 'Aplicaciones' },
  { label: 'Configuración', icon: 'settings', href: '/admin/configuracion' },
];

/* ──────────────────────────────────────────────────────
   Icon component — inline SVGs matching Tiendanube style
   ────────────────────────────────────────────────────── */
function NavIcon({ name, size = 18 }: { name: string; size?: number }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'home':
      return <svg {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
    case 'bar-chart':
      return <svg {...props}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
    case 'shopping-cart':
      return <svg {...props}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
    case 'box':
      return <svg {...props}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>;
    case 'tag':
      return <svg {...props}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>;
    case 'folder':
      return <svg {...props}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;
    case 'credit-card':
      return <svg {...props}><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>;
    case 'truck':
      return <svg {...props}><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>;
    case 'users':
      return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case 'percent':
      return <svg {...props}><line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>;
    case 'megaphone':
      return <svg {...props}><path d="M3 11l18-5v12L3 13v-2z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>;
    case 'store':
      return <svg {...props}><path d="M3 9l1-4h16l1 4" /><path d="M3 9v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9" /><path d="M9 21v-6h6v6" /><line x1="1" y1="9" x2="23" y2="9" /></svg>;
    case 'monitor':
      return <svg {...props}><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;
    case 'message-circle':
      return <svg {...props}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>;
    case 'instagram':
      return <svg {...props}><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>;
    case 'google':
      return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 0 20" /><path d="M12 2v20" /><path d="M2 12h20" /></svg>;
    case 'tiktok':
      return <svg {...props}><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>;
    case 'pinterest':
      return <svg {...props}><path d="M12 2C6.48 2 2 6.48 2 12c0 4.25 2.67 7.9 6.44 9.34-.09-.78-.17-1.99.04-2.84.18-.78 1.2-5.06 1.2-5.06s-.31-.61-.31-1.51c0-1.42.82-2.48 1.84-2.48.87 0 1.29.65 1.29 1.43 0 .87-.56 2.18-.84 3.39-.24 1.01.5 1.83 1.49 1.83 1.79 0 3.17-1.89 3.17-4.61 0-2.41-1.73-4.1-4.21-4.1-2.87 0-4.55 2.15-4.55 4.37 0 .87.33 1.79.75 2.3.08.1.09.19.07.29l-.28 1.14c-.04.19-.15.23-.35.14-1.31-.61-2.13-2.53-2.13-4.07 0-3.31 2.41-6.36 6.94-6.36 3.65 0 6.48 2.6 6.48 6.07 0 3.62-2.28 6.53-5.45 6.53-1.07 0-2.07-.55-2.41-1.2l-.66 2.5c-.24.92-.88 2.08-1.32 2.78.99.31 2.04.47 3.13.47 5.52 0 10-4.48 10-10S17.52 2 12 2z" /></svg>;
    case 'grid':
      return <svg {...props}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>;
    case 'settings':
      return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
    case 'external-link':
      return <svg {...props} strokeWidth={1.5}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>;
    default:
      return <svg {...props}><circle cx="12" cy="12" r="10" /></svg>;
  }
}

/* ──────────────────────────────────────────────────────
   Sidebar component
   ────────────────────────────────────────────────────── */
type NavigationStats = { messages: number; subscribers: number; shipping: number };

function Sidebar({ collapsed, mobileOpen, onToggle, onNavigate }: { collapsed: boolean; mobileOpen: boolean; onToggle: () => void; onNavigate: () => void }) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['/admin/productos']);
  const [stats, setStats] = useState<NavigationStats>({ messages: 0, subscribers: 0, shipping: 0 });

  useEffect(() => {
    void fetch('/api/admin/navigation-stats')
      .then((response) => response.ok ? response.json() : null)
      .then((data: NavigationStats | null) => { if (data) setStats(data); })
      .catch(() => undefined);
  }, []);

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  const toggleExpand = (href: string) => {
    setExpandedItems(prev =>
      prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
    );
  };

  return (
    <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo — Tiendanube swirl icon only */}
      <div className="admin-sidebar-logo">
        <div className="admin-sidebar-logo-icon">
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
            <path d="M20 4C11.163 4 4 11.163 4 20s7.163 16 16 16 16-7.163 16-16S28.837 4 20 4z" fill="#0059d5"/>
            <path d="M28.5 15.5c-1.5-3-4.5-5-8-5s-6.5 2-8 5c-1 2-1.5 4.5-1.5 7s.5 5 1.5 7c1.5 3 4.5 5 8 5s6.5-2 8-5c1-2 1.5-4.5 1.5-7s-.5-5-1.5-7z" fill="white" opacity="0.3"/>
            <path d="M20 10c-5 0-9 4-9 9s4 9 9 9 9-4 9-9-4-9-9-9z" fill="white"/>
            <path d="M17 16c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3z" fill="#0059d5"/>
          </svg>
        </div>
      </div>

      {/* Toggle */}
      <button className="admin-sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {collapsed ? (
            <polyline points="9 18 15 12 9 6" />
          ) : (
            <polyline points="15 18 9 12 15 6" />
          )}
        </svg>
      </button>

      {/* Navigation */}
      <nav className="admin-nav">
        {NAV_ITEMS.map((item, i) => {
          // Section header
          if ('section' in item && item.section) {
            return (
              <div key={`section-${i}`} className="admin-nav-section-title">
                {item.section}
              </div>
            );
          }

          // Nav item with children (expandable)
           const navItem = item as { label: string; icon: string; href: string; badge?: string; badgeKey?: keyof NavigationStats; external?: boolean; children?: { label: string; href: string; badge?: string; badgeKey?: keyof NavigationStats }[] };
           const getBadge = (entry: { badge?: string; badgeKey?: keyof NavigationStats }) => entry.badgeKey ? (stats[entry.badgeKey] > 0 ? String(stats[entry.badgeKey]) : null) : entry.badge;

          if (navItem.children) {
            const isExpanded = expandedItems.includes(navItem.href);
            const isParentActive = isActive(navItem.href);

            return (
              <div key={navItem.href}>
                <div
                  className={`admin-nav-item ${isParentActive ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleExpand(navItem.href)}
                >
                  <span className="admin-nav-icon">
                    <NavIcon name={navItem.icon} />
                  </span>
                  <span className="admin-nav-label">{navItem.label}</span>
                  <span className="admin-nav-expand" style={{
                    marginLeft: 'auto',
                    transition: 'transform 0.2s',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </div>
                {isExpanded && (
                  <div className="admin-nav-children">
                    {navItem.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`admin-nav-child-item ${pathname === child.href || pathname.startsWith(child.href + '/') ? 'active' : ''}`}
                        onClick={onNavigate}
                      >
                        <span>{child.label}</span>
                         {getBadge(child) && (
                           <span className="admin-nav-badge admin-nav-badge-count">{getBadge(child)}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // Regular nav item
          const active = isActive(navItem.href);

          return (
            <Link
              key={navItem.href}
              href={navItem.href}
              className={`admin-nav-item ${active ? 'active' : ''}`}
              title={collapsed ? navItem.label : undefined}
              target={navItem.external ? '_blank' : undefined}
              rel={navItem.external ? 'noopener noreferrer' : undefined}
              onClick={onNavigate}
            >
              <span className="admin-nav-icon">
                <NavIcon name={navItem.icon} />
              </span>
              <span className="admin-nav-label">{navItem.label}</span>
              {getBadge(navItem) && (
                <span className="admin-nav-badge admin-nav-badge-count">
                  {getBadge(navItem)}
                </span>
              )}
              {navItem.external && !collapsed && (
                <span className="admin-nav-external">
                  <NavIcon name="external-link" size={12} />
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/* ──────────────────────────────────────────────────────
   Topbar component
   ────────────────────────────────────────────────────── */
function Topbar({ onMobileMenuToggle }: { onMobileMenuToggle: () => void }) {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        {/* Mobile hamburger */}
        <button
          className="admin-topbar-hamburger"
          onClick={onMobileMenuToggle}
          aria-label="Abrir menú"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="admin-topbar-breadcrumb">
          <span>Admin</span>
        </div>
      </div>

      <div className="admin-topbar-right">
        <div className="admin-topbar-search">
          <span className="admin-topbar-search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            type="text"
            className="admin-topbar-search-input"
            placeholder="Buscar..."
          />
        </div>

        <button className="admin-topbar-btn" title="Notificaciones">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        <div className="admin-topbar-avatar" title="Joel Pelaez">
          JP
        </div>
      </div>
    </header>
  );
}

/* ──────────────────────────────────────────────────────
   Admin Layout
   ────────────────────────────────────────────────────── */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="admin-app">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="admin-mobile-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="admin-layout">
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileOpen}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onNavigate={() => setMobileOpen(false)}
        />

        <div className={`admin-main-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Topbar onMobileMenuToggle={() => setMobileOpen(!mobileOpen)} />
          <main className="admin-content">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
