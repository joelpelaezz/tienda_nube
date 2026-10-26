'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCoupon, toggleCoupon } from './actions';

interface RowActionsProps {
  id: number;
  code: string;
  isActive: boolean;
}

export default function CouponRowActions({ id, code, isActive }: RowActionsProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const run = (task: () => Promise<void>) => {
    setError('');
    startTransition(async () => {
      try {
        await task();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo completar la acción.');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className="admin-btn admin-btn-ghost admin-btn-sm"
        disabled={isPending}
        onClick={() => run(() => toggleCoupon(id, !isActive))}
        title={isActive ? 'Desactivar cupón' : 'Activar cupón'}
      >
        {isActive ? 'Desactivar' : 'Activar'}
      </button>
      <button
        type="button"
        className="admin-btn admin-btn-ghost admin-btn-sm admin-btn-remove"
        disabled={isPending}
        onClick={() => {
          if (window.confirm(`¿Eliminar el cupón ${code}? Los pedidos que ya lo usaron no se modifican.`)) {
            run(() => deleteCoupon(id));
          }
        }}
        title="Eliminar cupón"
        aria-label={`Eliminar cupón ${code}`}
      >
        Eliminar
      </button>
      {error && <div className="admin-error-box" style={{ marginTop: 8 }}>{error}</div>}
    </>
  );
}