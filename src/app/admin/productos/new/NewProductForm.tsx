'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createProduct } from '../actions';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Variant {
  name: string;
  stock: number;
}

interface NewProductFormProps {
  categories: Category[];
}

export default function NewProductForm({ categories }: NewProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    priceOffer: '',
    priceTransfer: '',
    discount: '',
    badge: '',
    imageUrl: '',
    categoryId: '',
    isVisible: true,
  });
  const [variants, setVariants] = useState<Variant[]>([
    { name: '', stock: 0 },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price) {
      console.log('Form validation failed: name=', form.name, 'price=', form.price);
      return;
    }

    console.log('Form submitted, creating product:', form.name);
    setLoading(true);
    try {
      const validVariants = variants.filter((v) => v.name.trim() !== '');
      const result = await createProduct({
        name: form.name,
        description: form.description || undefined,
        price: Math.round(parseFloat(form.price) * 100),
        priceOffer: form.priceOffer ? Math.round(parseFloat(form.priceOffer) * 100) : undefined,
        priceTransfer: form.priceTransfer ? Math.round(parseFloat(form.priceTransfer) * 100) : undefined,
        discount: form.discount || undefined,
        badge: form.badge || undefined,
        categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
        isVisible: form.isVisible,
        imageUrl: form.imageUrl || undefined,
        variants: validVariants.length > 0 ? validVariants : undefined,
      });

      console.log('createProduct returned:', JSON.stringify(result));
      if (!result || !result.id) {
        throw new Error('createProduct returned no id: ' + JSON.stringify(result));
      }
      console.log('Product created, redirecting to:', result.id);
      await router.push(`/admin/productos/${result.id}`);
    } catch (err) {
      console.error('Error creating product:', err);
      setError(err instanceof Error ? err.message : 'Error al crear el producto');
      setLoading(false);
    }
  };

  const updateVariant = (index: number, field: 'name' | 'stock', value: string | number) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addVariant = () => {
    setVariants((prev) => [...prev, { name: '', stock: 0 }]);
  };

  const removeVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* Back link */}
      {error && (
        <div className="admin-error-box" style={{ marginBottom: '1rem', padding: '12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#dc2626', fontSize: '13px' }}>
          {error}
        </div>
      )}
      <div className="admin-edit-back">
        <Link href="/admin/productos" className="admin-edit-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Volver
        </Link>
      </div>

      {/* Header */}
      <div className="admin-edit-header">
        <div className="admin-edit-header-left">
          <h1 className="admin-page-title">Nuevo producto</h1>
        </div>
        <div className="admin-edit-header-actions">
          <button
            className="admin-btn admin-btn-primary admin-btn-sm"
            type="submit"
            form="new-product-form"
            disabled={loading}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {loading ? 'Guardando...' : 'Crear producto'}
          </button>
        </div>
      </div>

      {/* Form */}
      <form id="new-product-form" onSubmit={handleSubmit}>
        <div className="admin-edit-layout">
          {/* Left column */}
          <div className="admin-edit-main">
            {/* Name & Description */}
            <div className="admin-card">
              <h3 className="admin-card-title">Nombre y descripción</h3>

              <div className="admin-form-group">
                <label className="admin-form-label">Nombre *</label>
                <input
                  type="text"
                  className="admin-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nombre del producto"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Descripción</label>
                <textarea
                  className="admin-input"
                  rows={6}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción del producto"
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Photos */}
            <div className="admin-card">
              <h3 className="admin-card-title">Fotos y video</h3>
              <div className="admin-dropzone">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--nimbus-primary)" strokeWidth="1.5" className="admin-dropzone-icon">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <div className="admin-dropzone-text">
                  Arrastrá y soltá, o subí fotos del producto
                </div>
              </div>

              <div className="admin-form-group" style={{ marginTop: '1rem' }}>
                <label className="admin-form-label">URL de imagen</label>
                <input
                  type="url"
                  className="admin-input"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://dcdn-us.mitiendanube.com/stores/005/154/974/products/..."
                />
                <div className="admin-edit-image-hint">
                  Pegá la URL de la imagen del producto
                </div>
              </div>
            </div>

            {/* Variants */}
            <div className="admin-card">
              <div className="admin-card-title-row">
                <h3 className="admin-card-title">Variantes</h3>
                <button
                  type="button"
                  onClick={addVariant}
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                >
                  + Agregar variante
                </button>
              </div>
              <p className="admin-field-hint">
                Ejemplos: Talle S, Talle M, Talle L — Color Rojo, Color Azul
              </p>

              {variants.map((variant, index) => (
                <div key={index} className="admin-variant-row">
                  <div className="admin-form-group" style={{ flex: 2 }}>
                    <label className="admin-form-label">Nombre de variante</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={variant.name}
                      onChange={(e) => updateVariant(index, 'name', e.target.value)}
                      placeholder={'Ej: Talle M'}
                    />
                  </div>
                  <div className="admin-form-group" style={{ flex: 1 }}>
                    <label className="admin-form-label">Stock</label>
                    <input
                      type="number"
                      className="admin-input"
                      value={variant.stock}
                      onChange={(e) => updateVariant(index, 'stock', parseInt(e.target.value) || 0)}
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="admin-btn-remove"
                      title="Eliminar variante"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="admin-edit-sidebar">
            {/* Category */}
            <div className="admin-card">
              <h3 className="admin-card-title admin-card-title--sm">Categoría</h3>
              <div className="admin-form-group">
                <label className="admin-form-label">Categoría</label>
                <select
                  className="admin-input"
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price */}
            <div className="admin-card">
              <h3 className="admin-card-title admin-card-title--sm">Precio</h3>

              <div className="admin-form-group">
                <label className="admin-form-label">Precio *</label>
                <div className="admin-edit-price-row">
                  <span className="admin-edit-price-prefix">$</span>
                  <input
                    type="number"
                    className="admin-input"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Precio de oferta</label>
                <div className="admin-edit-price-row">
                  <span className="admin-edit-price-prefix">$</span>
                  <input
                    type="number"
                    className="admin-input"
                    value={form.priceOffer}
                    onChange={(e) => setForm({ ...form, priceOffer: e.target.value })}
                    placeholder="0"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <label className="admin-form-label">Precio transferencia</label>
                <div className="admin-edit-price-row">
                  <span className="admin-edit-price-prefix">$</span>
                  <input
                    type="number"
                    className="admin-input"
                    value={form.priceTransfer}
                    onChange={(e) => setForm({ ...form, priceTransfer: e.target.value })}
                    placeholder="0"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Other */}
            <div className="admin-card">
              <h3 className="admin-card-title admin-card-title--sm">Otros</h3>

              <div className="admin-form-group">
                <label className="admin-form-label">Badge</label>
                <input
                  type="text"
                  className="admin-input"
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  placeholder="Ej: Nuevo, Oferta, -20%"
                />
              </div>

              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <label className="admin-form-label">Descuento (%)</label>
                <input
                  type="text"
                  className="admin-input"
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.value })}
                  placeholder="Ej: 20"
                />
              </div>
            </div>

            {/* Visibility */}
            <div className="admin-card">
              <h3 className="admin-card-title admin-card-title--sm">Visibilidad</h3>
              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={form.isVisible}
                  onChange={(e) => setForm({ ...form, isVisible: e.target.checked })}
                />
                <span>Visible en la tienda</span>
              </label>
            </div>

            {/* Save/Cancel */}
            <div className="admin-edit-footer">
              <Link href="/admin/productos" className="admin-btn admin-btn-secondary admin-edit-footer-btn">
                Cancelar
              </Link>
              <button
                className="admin-btn admin-btn-primary admin-edit-footer-btn"
                type="submit"
                disabled={loading}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {loading ? 'Creando...' : 'Crear producto'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
