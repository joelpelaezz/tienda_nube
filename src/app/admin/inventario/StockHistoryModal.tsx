'use client';

import { useEffect, useState } from 'react';
import type { StockMovementView } from './types';

interface StockHistoryModalProps {
  variantId?: number;
  productId?: number;
  productName: string;
  variantName?: string;
  onClose: () => void;
}

function formatDate(value: string | null) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatQuantity(quantity: number) {
  if (quantity > 0) return `+${quantity}`;
  return String(quantity);
}

export default function StockHistoryModal({ variantId, productId, productName, variantName, onClose }: StockHistoryModalProps) {
  const [movements, setMovements] = useState<StockMovementView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadHistory() {
      try {
        setLoading(true);
        const historyUrl = variantId != null
          ? `/api/inventory/${variantId}/history`
          : `/api/inventory/product-history?productId=${productId}`;
        const response = await fetch(historyUrl, { signal: controller.signal });
        if (!response.ok) throw new Error('No se pudo cargar el historial.');
        const data = (await response.json()) as { movements: StockMovementView[] };
        setMovements(data.movements);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'No se pudo cargar el historial.');
      } finally {
        setLoading(false);
      }
    }

    loadHistory();

    return () => controller.abort();
  }, [productId, variantId]);

  return (
    <div className="admin-inventory-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="admin-inventory-modal admin-inventory-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-history-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="admin-inventory-modal-header">
          <div>
            <h2 id="stock-history-title">Historial de stock</h2>
            <p>{productName}{variantName ? ` - ${variantName}` : ''}</p>
          </div>
          <button type="button" className="admin-inventory-modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div className="admin-inventory-modal-body">
          {loading ? (
            <div className="admin-inventory-history-state">Cargando historial...</div>
          ) : error ? (
            <div className="admin-alert-error">{error}</div>
          ) : movements.length === 0 ? (
            <div className="admin-inventory-history-state">Sin movimientos</div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table admin-inventory-history-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{formatDate(movement.createdAt)}</td>
                      <td>{movement.movementTypeLabel}</td>
                      <td className={movement.quantity >= 0 ? 'admin-inventory-qty-positive' : 'admin-inventory-qty-negative'}>
                        {formatQuantity(movement.quantity)}
                      </td>
                      <td>{movement.stockAfter}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="admin-inventory-modal-footer">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Cerrar</button>
        </footer>
      </section>
    </div>
  );
}
