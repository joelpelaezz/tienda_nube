import type { InventoryStats } from './types';

interface StatsBarProps {
  stats: InventoryStats;
}

export default function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="admin-inventory-stats" aria-label="Resumen de stock">
      <article className="admin-inventory-stat-card admin-inventory-stat-card--total">
        <span className="admin-inventory-stat-label" title="Unidades disponibles después de descontar las reservadas">Disponible</span>
        <strong className="admin-inventory-stat-value">{stats.totalAvailable}</strong>
      </article>
      <article className="admin-inventory-stat-card admin-inventory-stat-card--total">
        <span className="admin-inventory-stat-label" title="Unidades físicas registradas, incluidas las reservadas">Stock total</span>
        <strong className="admin-inventory-stat-value">{stats.totalStock}</strong>
      </article>
      <article className="admin-inventory-stat-card admin-inventory-stat-card--low">
        <span className="admin-inventory-stat-label" title="Productos o variantes con entre 1 y 5 unidades disponibles">Stock bajo</span>
        <strong className="admin-inventory-stat-value">{stats.lowStock}</strong>
      </article>
      <article className="admin-inventory-stat-card admin-inventory-stat-card--out">
        <span className="admin-inventory-stat-label" title="Productos o variantes sin unidades disponibles">Sin stock</span>
        <strong className="admin-inventory-stat-value">{stats.outOfStock}</strong>
      </article>
    </div>
  );
}
