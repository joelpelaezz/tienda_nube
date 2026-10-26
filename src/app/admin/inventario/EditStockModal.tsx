'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProductStock, updateVariantStock } from './actions';

interface EditStockModalProps {
  variantId?: number;
  productId?: number;
  currentStock: number;
  reservedStock: number;
  productName: string;
  variantName?: string;
  onClose: () => void;
  onSaved: (id: number, newStock: number, kind: 'variant' | 'product') => void;
}

export default function EditStockModal({
  variantId,
  productId,
  currentStock,
  reservedStock,
  productName,
  variantName,
  onClose,
  onSaved,
}: EditStockModalProps) {
  const router = useRouter();
  const [newStock, setNewStock] = useState(String(currentStock));
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const parsedStock = Number(newStock);
  const isValid = Number.isInteger(parsedStock) && parsedStock >= 0;
  const isUnchanged = isValid && parsedStock === currentStock;

  const handleSave = () => {
    setError('');

    if (!isValid) {
      setError('Ingresá un número entero mayor o igual a 0.');
      return;
    }

    if (isUnchanged) {
      onClose();
      return;
    }

    startTransition(async () => {
      try {
        const isVariant = variantId != null;
        const inventoryId = variantId ?? productId;
        if (inventoryId == null) throw new Error('No se identificó el elemento de inventario.');
        if (isVariant) await updateVariantStock(inventoryId, parsedStock);
        else await updateProductStock(inventoryId, parsedStock);
        onSaved(inventoryId, parsedStock, isVariant ? 'variant' : 'product');
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo actualizar el stock.');
      }
    });
  };

  return (
    <div className="admin-inventory-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="admin-inventory-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-stock-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="admin-inventory-modal-header">
          <h2 id="edit-stock-title">Editar stock</h2>
          <button type="button" className="admin-inventory-modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div className="admin-inventory-modal-body">
          <dl className="admin-inventory-stock-detail">
            <div>
              <dt>Producto</dt>
              <dd>{productName}</dd>
            </div>
            <div>
              <dt>{variantId != null ? 'Variante' : 'Tipo'}</dt>
              <dd>{variantName ?? 'Producto sin variantes'}</dd>
            </div>
            <div>
              <dt>Stock total</dt>
              <dd>{currentStock}</dd>
            </div>
            {reservedStock > 0 && (
              <div>
                <dt>Reservado</dt>
                <dd className="admin-inventory-reserved-label">{reservedStock}</dd>
              </div>
            )}
            <div>
              <dt>Disponible</dt>
              <dd>{Math.max(0, currentStock - reservedStock)}</dd>
            </div>
          </dl>

          <label className="admin-form-label" htmlFor="new-stock">
            Nuevo stock
            {reservedStock > 0 && <span className="admin-form-hint"> (mínimo: {reservedStock})</span>}
          </label>
          <input
            id="new-stock"
            className={`admin-input ${error ? 'admin-input--error' : ''}`}
            type="number"
            min={reservedStock}
            step="1"
            value={newStock}
            onChange={(event) => setNewStock(event.target.value)}
            autoFocus
          />
          {error && <span className="admin-field-error">{error}</span>}
        </div>

        <footer className="admin-inventory-modal-footer">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose} disabled={isPending}>Cancelar</button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={handleSave} disabled={isPending || !isValid || isUnchanged}>
            {isPending ? 'Guardando...' : 'Guardar stock'}
          </button>
        </footer>
      </section>
    </div>
  );
}
