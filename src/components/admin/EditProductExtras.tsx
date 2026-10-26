'use client';

import { useState } from 'react';
import CategoryEditor from './CategoryEditor';
import VariantEditor from './VariantEditor';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Variant {
  id: number;
  name: string;
  stock: number | null;
  price: number | null;
  priceOffer: number | null;
  imageUrl: string | null;
  optionIds: string[];
  isVisible: boolean | null;
}

interface EditProductExtrasProps {
  productId: number;
  currentCategoryIds: number[];
  categories: Category[];
  existingVariants: Variant[];
  productImages: Array<{ id: number; url: string; alt: string | null }>;
}

export default function EditProductExtras({
  productId,
  currentCategoryIds,
  categories,
  existingVariants,
  productImages,
}: EditProductExtrasProps) {
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [showVariantEditor, setShowVariantEditor] = useState(false);

  return (
    <>
      {/* ──── Categorías ──── */}
      <div className="admin-card">
        <h3 className="admin-card-title admin-card-title-row">
          Categorías
          <button
            type="button"
            className="admin-ai-btn"
            onClick={() => setShowCategoryEditor(true)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
            Editar
          </button>
        </h3>

        <div style={{ display: 'flex', gap: 'var(--nimbus-space-2)', flexWrap: 'wrap', marginBottom: 'var(--nimbus-space-3)' }}>
          {categories
            .filter((c) => currentCategoryIds.includes(c.id))
            .map((cat) => (
              <span key={cat.id} className="admin-tag">
                {cat.name}
              </span>
            ))}
          {currentCategoryIds.length === 0 && (
            <span className="admin-tag admin-tag--muted">Sin categoría</span>
          )}
        </div>
      </div>

      {/* ──── Variantes ──── */}
      <div className="admin-card">
        <h3 className="admin-card-title">Variantes</h3>

        <div className="admin-form-group">
          <label className="admin-form-label">Propiedades</label>
          <div style={{ display: 'flex', gap: 'var(--nimbus-space-2)', flexWrap: 'wrap', marginBottom: 'var(--nimbus-space-2)' }}>
            {existingVariants.length > 0 ? (
              existingVariants.slice(0, 5).map((v) => (
                <span key={v.id} className="admin-tag">{v.name}</span>
              ))
            ) : (
              <span className="admin-tag admin-tag--muted">Sin variantes</span>
            )}
          </div>
          <button
            type="button"
            className="admin-link-btn admin-link-btn--primary"
            onClick={() => setShowVariantEditor(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Editar variantes
          </button>
        </div>
      </div>

      {/* Modals */}
      <CategoryEditor
        isOpen={showCategoryEditor}
        onClose={() => setShowCategoryEditor(false)}
        productId={productId}
        currentCategoryIds={currentCategoryIds}
        categories={categories}
      />

      <VariantEditor
        isOpen={showVariantEditor}
        onClose={() => setShowVariantEditor(false)}
        productId={productId}
        existingVariants={existingVariants}
        productImages={productImages}
      />
    </>
  );
}
