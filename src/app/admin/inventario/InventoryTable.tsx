'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import type { InventoryProduct, InventoryResult, InventoryStatusFilter, InventoryVariant } from './types';
import StatsBar from './StatsBar';
import Toolbar from './Toolbar';
import ProductRow from './ProductRow';
import EditStockModal from './EditStockModal';
import StockHistoryModal from './StockHistoryModal';
import Pagination from './Pagination';

interface InventoryTableProps {
  initialInventory: InventoryResult;
}

type SelectedStock =
  | { kind: 'variant'; variant: InventoryVariant; product: InventoryProduct }
  | { kind: 'product'; product: InventoryProduct };

export default function InventoryTable({ initialInventory }: InventoryTableProps) {
  const [inventory, setInventory] = useState(initialInventory);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InventoryStatusFilter>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<SelectedStock | null>(null);
  const [history, setHistory] = useState<SelectedStock | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();

    startTransition(async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        search: searchQuery,
        status: statusFilter,
      });

      try {
        const response = await fetch(`/api/inventory?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const nextInventory = (await response.json()) as InventoryResult;
        setInventory(nextInventory);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('[InventoryTable] Error al cargar inventario', error);
      }
    });

    return () => controller.abort();
  }, [currentPage, searchQuery, statusFilter, reloadKey]);

  const hasFilters = searchQuery.trim().length > 0 || statusFilter !== 'todos';

  const visibleRange = useMemo(() => {
    if (inventory.total === 0) return { from: 0, to: 0 };
    const from = (inventory.page - 1) * inventory.perPage + 1;
    const to = Math.min(inventory.page * inventory.perPage, inventory.total);
    return { from, to };
  }, [inventory.page, inventory.perPage, inventory.total]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleStatusChange = useCallback((value: InventoryStatusFilter) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('todos');
    setCurrentPage(1);
  }, []);

  const handleSaved = (itemId: number, newStock: number, kind: 'variant' | 'product') => {
    setInventory((prev) => ({
      ...prev,
      products: prev.products.map((product) => ({
        ...product,
        ...(kind === 'product' && product.id === itemId
          ? {
              stock: newStock,
              availableStock: Math.max(0, newStock - product.reservedStock),
            }
          : {}),
        variants: product.variants.map((variant) =>
          kind === 'variant' && variant.id === itemId
            ? { ...variant, stock: newStock, availableStock: Math.max(0, newStock - variant.reservedStock) }
            : variant,
        ),
      })),
    }));
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="admin-inventory">
      <StatsBar stats={inventory.stats} />

      <Toolbar
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        hasFilters={hasFilters}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onClearFilters={handleClearFilters}
      />

      <div className="admin-card admin-inventory-table-card" aria-busy={isPending}>
        <div className="admin-table-wrapper admin-mobile-cards admin-mobile-cards--inventory admin-inventory-table-wrapper">
          <table className="admin-table admin-inventory-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Stock</th>
                <th>Variantes</th>
                <th>SKU</th>
                <th>Historial</th>
              </tr>
            </thead>
            <tbody>
              {inventory.products.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="admin-empty">
                      <div className="admin-empty-icon">📦</div>
                      <div className="admin-empty-title">No hay productos para mostrar</div>
                      <div className="admin-empty-text">Probá limpiar los filtros o cargar stock en Inventario.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                inventory.products.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onEditStock={(variant) => setEditing({ kind: 'variant', product, variant })}
                    onViewHistory={(variant) => setHistory({ kind: 'variant', product, variant })}
                    onEditProductStock={(selectedProduct) => setEditing({ kind: 'product', product: selectedProduct })}
                    onViewProductHistory={(selectedProduct) => setHistory({ kind: 'product', product: selectedProduct })}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={inventory.page}
          totalPages={inventory.totalPages}
          total={inventory.total}
          from={visibleRange.from}
          to={visibleRange.to}
          onPageChange={setCurrentPage}
        />
      </div>

      {editing && (
        <EditStockModal
          variantId={editing.kind === 'variant' ? editing.variant.id : undefined}
          productId={editing.kind === 'product' ? editing.product.id : undefined}
          currentStock={editing.kind === 'variant' ? editing.variant.stock : editing.product.stock ?? 0}
          reservedStock={editing.kind === 'variant' ? editing.variant.reservedStock : editing.product.reservedStock}
          productName={editing.product.name}
          variantName={editing.kind === 'variant' ? editing.variant.name : undefined}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {history && (
        <StockHistoryModal
          variantId={history.kind === 'variant' ? history.variant.id : undefined}
          productId={history.kind === 'product' ? history.product.id : undefined}
          productName={history.product.name}
          variantName={history.kind === 'variant' ? history.variant.name : undefined}
          onClose={() => setHistory(null)}
        />
      )}
    </div>
  );
}
