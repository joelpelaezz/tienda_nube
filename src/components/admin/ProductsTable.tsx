'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { bulkUpdateProducts, type BulkProductAction } from '@/app/admin/productos/actions';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number | null;
  priceOffer: number | null;
  isVisible: boolean | null;
  imageUrl: string | null;
  categoryName: string | null;
  stock?: number | null;
  reservedStock?: number | null;
  productType?: string | null;
  variants: any[];
}

interface ProductsTableProps {
  initialProducts: Product[];
  categories: Category[];
}

export default function ProductsTable({ initialProducts, categories }: ProductsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showDropdown, setShowDropdown] = useState(false);
  const [bulkAction, setBulkAction] = useState<'category' | 'visibility' | 'price' | 'badge' | 'delete' | null>(null);
  const [categoryMode, setCategoryMode] = useState<'add' | 'replace' | 'remove'>('add');
  const [categoryId, setCategoryId] = useState('');
  const [visibility, setVisibility] = useState<'visible' | 'hidden'>('hidden');
  const [priceMode, setPriceMode] = useState<'percent' | 'fixed'>('percent');
  const [priceTarget, setPriceTarget] = useState<'regular' | 'offer' | 'both'>('regular');
  const [priceDirection, setPriceDirection] = useState<'increase' | 'decrease'>('increase');
  const [priceValue, setPriceValue] = useState('');
  const [badge, setBadge] = useState('');
  const [products, setProducts] = useState(initialProducts);
  const selectedCount = selected.size;

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const formatPrice = (cents: number | null) => {
    if (!cents) return '—';
    return `$${(cents / 100).toLocaleString('es-AR')}`;
  };

  const toggleAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulkAction = (action: BulkProductAction) => {
    startTransition(async () => {
      try {
        const result = await bulkUpdateProducts(Array.from(selected), action);
        if (action.type === 'delete') {
          const deletedIds = result?.deletedIds ?? [];
          const blockedIds = result?.blockedIds ?? [];
          setProducts((current) => current.filter((product) => !deletedIds.includes(product.id)));
          window.alert(`Eliminados: ${deletedIds.length}. Bloqueados por tener ventas o pedidos: ${blockedIds.length}.`);
        }
        if (action.type === 'visibility') {
          setProducts((current) => current.map((product) => (
            selected.has(product.id) ? { ...product, isVisible: action.isVisible } : product
          )));
        }
        setSelected(new Set());
        setShowDropdown(false);
        setBulkAction(null);
        router.refresh();
      } catch (error) {
        window.alert(error instanceof Error ? error.message : 'No se pudo aplicar la acción masiva.');
      }
    });
  };

  const applyCategory = () => {
    const parsed = Number(categoryId);
    if (!Number.isInteger(parsed) || parsed <= 0) return;
    runBulkAction({ type: 'category', mode: categoryMode, categoryId: parsed });
  };

  const applyPrice = () => {
    const parsed = Number(priceValue);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    const label = priceMode === 'percent' ? `${parsed}%` : `$${parsed}`;
    if (!window.confirm(`Vas a ${priceDirection === 'increase' ? 'aumentar' : 'reducir'} ${label} en ${selectedCount} producto${selectedCount === 1 ? '' : 's'}. ¿Continuar?`)) return;
    runBulkAction({ type: 'price', target: priceTarget, mode: priceMode, value: parsed, direction: priceDirection });
  };

  return (
    <div>
      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="admin-bulk-bar">
          <span className="admin-bulk-bar-count">
            {selectedCount} producto{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
          </span>
          <div className="admin-bulk-bar-actions">
            <div className="admin-bulk-dropdown-wrapper">
              <button
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => setShowDropdown((v) => !v)}
              >
                Acciones masivas ▾
              </button>
              {showDropdown && (
                <div className="admin-bulk-dropdown">
                  <div className="admin-bulk-dropdown-header">
                    <span>Acciones masivas</span>
                    <button onClick={() => setShowDropdown(false)}>✕</button>
                  </div>
                  <div className="admin-bulk-dropdown-list">
                    <button className="admin-bulk-dropdown-item" onClick={() => setBulkAction('category')}>Categorías</button>
                    <button className="admin-bulk-dropdown-item" onClick={() => setBulkAction('visibility')}>Activar / inactivar</button>
                    <button className="admin-bulk-dropdown-item" onClick={() => setBulkAction('price')}>Ajustar precios</button>
                    <button className="admin-bulk-dropdown-item" onClick={() => setBulkAction('badge')}>Cambiar etiqueta</button>
                    <button className="admin-bulk-dropdown-item admin-bulk-dropdown-item--danger" onClick={() => setBulkAction('delete')}>Eliminar productos</button>
                  </div>
                  {bulkAction === 'category' && (
                    <div className="admin-bulk-dropdown-form">
                      <select value={categoryMode} onChange={(event) => setCategoryMode(event.target.value as typeof categoryMode)}>
                        <option value="add">Agregar categoría</option>
                        <option value="replace">Reemplazar categorías</option>
                        <option value="remove">Quitar categoría</option>
                      </select>
                      <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                        <option value="">Seleccionar categoría</option>
                        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                      </select>
                      <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={applyCategory} disabled={!categoryId || isPending}>Aplicar</button>
                    </div>
                  )}
                  {bulkAction === 'visibility' && (
                    <div className="admin-bulk-dropdown-form">
                      <select value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)}>
                        <option value="visible">Activar y mostrar</option>
                        <option value="hidden">Inactivar y ocultar</option>
                      </select>
                      <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => {
                        if (window.confirm(`Vas a ${visibility === 'visible' ? 'activar' : 'inactivar'} ${selectedCount} producto${selectedCount === 1 ? '' : 's'}. ¿Continuar?`)) {
                          runBulkAction({ type: 'visibility', isVisible: visibility === 'visible' });
                        }
                      }} disabled={isPending}>Aplicar</button>
                    </div>
                  )}
                  {bulkAction === 'price' && (
                    <div className="admin-bulk-dropdown-form">
                      <select value={priceTarget} onChange={(event) => setPriceTarget(event.target.value as typeof priceTarget)}>
                        <option value="regular">Precio regular</option>
                        <option value="offer">Precio de oferta</option>
                        <option value="both">Ambos precios</option>
                      </select>
                      <select value={priceDirection} onChange={(event) => setPriceDirection(event.target.value as typeof priceDirection)}>
                        <option value="increase">Aumentar</option>
                        <option value="decrease">Reducir</option>
                      </select>
                      <select value={priceMode} onChange={(event) => setPriceMode(event.target.value as typeof priceMode)}>
                        <option value="percent">Porcentaje</option>
                        <option value="fixed">Monto fijo</option>
                      </select>
                      <input type="number" min="0" step="0.01" value={priceValue} onChange={(event) => setPriceValue(event.target.value)} placeholder={priceMode === 'percent' ? 'Ej: 10' : 'Ej: 500'} />
                      <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={applyPrice} disabled={!priceValue || isPending}>Aplicar</button>
                    </div>
                  )}
                  {bulkAction === 'badge' && (
                    <div className="admin-bulk-dropdown-form">
                      <input value={badge} onChange={(event) => setBadge(event.target.value)} placeholder="Nuevo badge (vacío para quitar)" />
                      <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => runBulkAction({ type: 'badge', badge: badge || null })} disabled={isPending}>Aplicar</button>
                    </div>
                  )}
                  {bulkAction === 'delete' && (
                    <div className="admin-bulk-dropdown-form">
                      <p className="admin-bulk-warning">Solo se eliminarán productos que no aparezcan en ventas o pedidos.</p>
                      <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => {
                        if (window.confirm(`Se eliminarán definitivamente ${selectedCount} producto${selectedCount === 1 ? '' : 's'} sin ventas ni pedidos. Los demás quedarán bloqueados. ¿Continuar?`)) {
                          runBulkAction({ type: 'delete' });
                        }
                      }} disabled={isPending}>Eliminar seleccionados</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              className="admin-btn admin-btn-ghost admin-btn-sm"
              style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
              onClick={() => setSelected(new Set())}
            >
              Deseleccionar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="admin-card admin-productos-table-wrapper">
        {products.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📦</div>
            <div className="admin-empty-title">No hay productos</div>
          </div>
        ) : (
           <div className="admin-table-wrapper admin-mobile-cards admin-mobile-cards--products">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-productos-th-checkbox">
                    <input
                      type="checkbox"
                      className="admin-checkbox"
                      checked={selected.size === products.length && products.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>Producto</th>
                  <th className="admin-productos-th-status">Estado</th>
                  <th className="admin-productos-th-stock">Stock</th>
                  <th className="admin-productos-th-price">Precio</th>
                  <th className="admin-productos-th-price">Promocional</th>
                  <th className="admin-productos-th-variants">Variantes</th>
                  <th className="admin-productos-th-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const hasVariants = product.variants.length > 0;
                  const isDigital = product.productType === 'digital';
                  const isTrackedPhysical = !isDigital;
                  const totalStock = hasVariants
                    ? product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
                    : Math.max(0, (product.stock ?? 0) - (product.reservedStock ?? 0));

                  return (
                    <tr key={product.id}>
                      <td>
                        <input
                          type="checkbox"
                          className="admin-checkbox"
                          checked={selected.has(product.id)}
                          onChange={() => toggleOne(product.id)}
                        />
                      </td>
                      <td>
                        <div className="admin-table-product-cell">
                          {product.imageUrl ? (
                            <Image src={product.imageUrl} alt={product.name} width={64} height={64} className="admin-table-product-img" />
                          ) : (
                            <div className="admin-table-product-img admin-productos-img-placeholder">📷</div>
                          )}
                          <div>
                            <Link href={`/admin/productos/${product.id}`} className="admin-productos-product-link">
                              {product.name}
                            </Link>
                            {!product.isVisible && (
                              <span className="admin-productos-hidden-badge">Oculto</span>
                            )}
                            {product.categoryName && (
                              <span className="admin-tag admin-tag--sm" style={{ marginTop: 4 }}>{product.categoryName}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="admin-productos-td-center">
                        <span className={`admin-product-status-badge ${product.isVisible ? 'admin-product-status-badge--active' : 'admin-product-status-badge--inactive'}`}>
                          {product.isVisible ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="admin-productos-td-center">
                        {isTrackedPhysical ? (
                          <span className="admin-productos-stock-value">{totalStock}</span>
                        ) : (
                          <span className="admin-productos-stock-empty">Sin stock</span>
                        )}
                      </td>
                      <td>{formatPrice(product.price)}</td>
                      <td>{formatPrice(product.priceOffer)}</td>
                      <td className="admin-productos-td-center">
                        {hasVariants ? (
                          <span className="admin-productos-variant-count">
                            {product.variants.length} variantes
                          </span>
                        ) : (
                          <span className="admin-productos-stock-empty">—</span>
                        )}
                      </td>
                      <td>
                        <div className="admin-productos-actions">
                          <Link href={`/admin/productos/${product.id}`} className="admin-btn admin-btn-ghost admin-btn-icon" title="Editar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .admin-bulk-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #1d4ed8;
          color: white;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .admin-bulk-bar-count {
          font-size: 14px;
          font-weight: 600;
        }
        .admin-bulk-bar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .admin-bulk-dropdown-wrapper {
          position: relative;
        }
        .admin-bulk-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          width: 320px;
          z-index: 100;
        }
        .admin-bulk-dropdown-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }
        .admin-bulk-dropdown-header button {
          background: none;
          border: none;
          cursor: pointer;
          color: #999;
          font-size: 14px;
          padding: 0;
        }
        .admin-bulk-dropdown-list {
          padding: 8px;
          max-height: 240px;
          overflow-y: auto;
        }
        .admin-bulk-dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          color: #333;
          width: 100%;
          border: 0;
          background: transparent;
          text-align: left;
        }
        .admin-bulk-dropdown-item:hover {
          background: #f0f7ff;
          color: #1d4ed8;
        }
        .admin-bulk-dropdown-form {
          display: grid;
          gap: 8px;
          padding: 10px;
          border-top: 1px solid #f0f0f0;
        }
        .admin-bulk-dropdown-form select,
        .admin-bulk-dropdown-form input {
          width: 100%;
          min-height: 34px;
          padding: 6px 8px;
          border: 1px solid #d8dce3;
          border-radius: 4px;
          background: #fff;
          color: #333;
          font-size: 12px;
        }
        .admin-bulk-dropdown-form select option {
          color: #333;
          background: #fff;
        }
        .admin-tag--sm {
          font-size: 11px;
          padding: 2px 6px;
        }
        .admin-product-status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 68px;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }
        .admin-product-status-badge--active {
          background: #e8f7ee;
          color: #19733d;
        }
        .admin-product-status-badge--inactive {
          background: #f0f1f3;
          color: #68707c;
        }
      `}</style>
    </div>
  );
}
