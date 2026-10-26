'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCoupon, updateCoupon } from './actions';

// C4-TRACE: date-only coupon fields display and submit using UTC calendar-day semantics.

export interface CouponRow {
  id: number;
  code: string;
  type: string;
  value: number;
  minPurchase: number | null;
  maxUses: number | null;
  usedCount: number | null;
  isActive: boolean | null;
  validFrom: Date | null;
  validUntil: Date | null;
}

interface CouponFormProps {
  coupon?: CouponRow | null;
}

const toDateInput = (value: Date | null) =>
  value ? value.toISOString().slice(0, 10) : '';

export default function CouponForm({ coupon = null }: CouponFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>(coupon?.type === 'fixed' ? 'fixed' : 'percent');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError('');
    formData.set('type', type);

    startTransition(async () => {
      try {
        if (coupon) await updateCoupon(formData);
        else await createCoupon(formData);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar el cupón.');
      }
    });
  };

  return (
    <>
      {!coupon && (
        <button
          type="button"
          className="admin-btn admin-btn-primary admin-btn-sm"
          onClick={() => { setOpen(true); setError(''); }}
        >
          Crear cupón
        </button>
      )}

      {coupon && (
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => { setOpen(true); setError(''); }}>
          Editar
        </button>
      )}

      {open && (
        <div className="admin-coupon-modal-overlay" role="presentation" onMouseDown={() => setOpen(false)}>
          <div
            className="admin-coupon-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coupon-form-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-coupon-modal-header">
              <h2 id="coupon-form-title">{coupon ? 'Editar cupón' : 'Crear cupón'}</h2>
              <button type="button" className="admin-coupon-modal-close" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
            </div>

            <form action={handleSubmit}>
              <div className="admin-coupon-modal-body">
                {coupon && <input type="hidden" name="id" value={coupon.id} />}

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="coupon-code">Código</label>
                  <input
                    id="coupon-code"
                    name="code"
                    className="admin-input"
                    defaultValue={coupon?.code ?? ''}
                    placeholder="VERANO25"
                    required
                    maxLength={24}
                  />
                  <span className="admin-field-hint">El cliente lo escribe en mayúsculas; se guarda en mayúsculas.</span>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="coupon-type">Tipo de descuento</label>
                  <select
                    id="coupon-type"
                    className="admin-select"
                    value={type}
                    onChange={(event) => setType(event.target.value as 'percent' | 'fixed')}
                  >
                    <option value="percent">Porcentaje</option>
                    <option value="fixed">Monto fijo</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="coupon-value">
                    {type === 'percent' ? 'Porcentaje' : 'Monto fijo'}
                  </label>
                  <input
                    id="coupon-value"
                    name="value"
                    type="number"
                    step="any"
                    min={0}
                    className="admin-input"
                    defaultValue={
                      coupon
                        ? coupon.type === 'percent' ? String(coupon.value) : String(coupon.value / 100)
                        : type === 'percent' ? '10' : '0'
                    }
                    required
                  />
                  {type === 'percent' && <span className="admin-field-hint">Entre 1 y 100.</span>}
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="coupon-min-purchase">Compra mínima</label>
                  <input
                    id="coupon-min-purchase"
                    name="minPurchase"
                    type="number"
                    step="any"
                    min="0"
                    className="admin-input"
                    defaultValue={coupon?.minPurchase != null ? String(coupon.minPurchase / 100) : ''}
                    placeholder="Sin mínimo"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="coupon-max-uses">Cantidad máxima de usos</label>
                  <input
                    id="coupon-max-uses"
                    name="maxUses"
                    type="number"
                    step="1"
                    min="0"
                    className="admin-input"
                    defaultValue={coupon?.maxUses != null ? String(coupon.maxUses) : ''}
                    placeholder="Sin límite"
                  />
                </div>

                <div className="admin-form-grid">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="coupon-valid-from">Válido desde</label>
                    <input
                      id="coupon-valid-from"
                      name="validFrom"
                      type="date"
                      className="admin-input"
                      defaultValue={toDateInput(coupon?.validFrom ?? null)}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="coupon-valid-until">Válido hasta</label>
                    <input
                      id="coupon-valid-until"
                      name="validUntil"
                      type="date"
                      className="admin-input"
                      defaultValue={toDateInput(coupon?.validUntil ?? null)}
                    />
                  </div>
                </div>

                <label className="admin-checkbox-label">
                  <input type="checkbox" name="isActive" defaultChecked={coupon ? coupon.isActive !== false : true} />
                  <span>Cupón activo</span>
                </label>

                {error && <div className="admin-error-box" style={{ marginTop: 12 }}>{error}</div>}
              </div>

              <div className="admin-coupon-modal-footer">
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setOpen(false)} disabled={isPending}>
                  Cancelar
                </button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={isPending}>
                  {isPending ? 'Guardando...' : 'Guardar cupón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
