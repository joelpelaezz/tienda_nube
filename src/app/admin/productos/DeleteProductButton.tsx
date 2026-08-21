'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProduct } from './actions';

export default function DeleteProductButton({ productId }: { productId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm('¿Estás seguro que querés eliminar este producto? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    setLoading(true);
    try {
      await deleteProduct(productId);
      router.push('/admin/productos');
    } catch (error) {
      console.error('Error deleting product:', error);
      setLoading(false);
    }
  };

  return (
    <button
      className="admin-btn admin-btn-secondary admin-btn-sm"
      onClick={handleDelete}
      disabled={loading}
      style={{ color: 'var(--nimbus-danger)' }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
      {loading ? 'Eliminando...' : 'Eliminar'}
    </button>
  );
}
