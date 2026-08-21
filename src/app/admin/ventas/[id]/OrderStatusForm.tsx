'use client';

import { useState } from 'react';
import { updateOrderStatus } from '../actions';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'packed', label: 'Empaquetado' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
];

interface OrderStatusFormProps {
  orderId: number;
  currentStatus: string;
}

export default function OrderStatusForm({ orderId, currentStatus }: OrderStatusFormProps) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (status === currentStatus) return;
    setLoading(true);
    try {
      await updateOrderStatus(orderId, status);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-order-status-form">
      <label className="admin-form-label">Estado del pedido</label>
      <div className="admin-order-status-row">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="admin-input"
          style={{ width: 'auto', minWidth: '160px' }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={loading || status === currentStatus}
          className="admin-btn admin-btn-primary admin-btn-sm"
        >
          {loading ? 'Guardando...' : 'Guardar estado'}
        </button>
        {saved && (
          <span className="admin-save-confirm">✓ Guardado</span>
        )}
      </div>
    </div>
  );
}
