'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProductCategories } from '@/app/admin/productos/actions';
import styles from './CategoryEditor.module.css';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface CategoryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  currentCategoryIds: number[];
  categories: Category[];
}

export default function CategoryEditor({
  isOpen,
  onClose,
  productId,
  currentCategoryIds,
  categories,
}: CategoryEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<number[]>(currentCategoryIds);

  const toggleCategory = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    startTransition(async () => {
      await updateProductCategories(productId, selectedIds);
      router.refresh();
      onClose();
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Editar categorías</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.hint}>
            Seleccioná una o más categorías para este producto.
          </p>
          <div className={styles.list}>
            {categories.map((cat) => (
              <label key={cat.id} className={styles.item}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                />
                <span className={styles.itemLabel}>{cat.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
