'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createProduct, updateProductVariantImages, uploadProductImage } from '../actions';
import { validateImageUrl } from '@/lib/image-validation';
import ImageUploadAdvisor from '@/components/admin/ImageUploadAdvisor';
import { uploadFile } from '@/lib/storage';
import { getDiscountPercent } from '@/lib/products/pricing';

// ─── Types ────────────────────────────────────────────────
interface VariantTypeOption {
  id: number;
  value: string;
  colorHex?: string | null;
  imageUrl?: string | null;
  position: number;
}

interface VariantType {
  id: number;
  name: string;
  kind: 'system' | 'custom';
  presentation: 'text' | 'color' | 'image';
  isActive: boolean;
  position: number;
  options: VariantTypeOption[];
}

interface SelectedVariantType {
  variantTypeId: number;
  variantTypeName: string;
  optionIds: number[];
}

interface VariantCombination {
  optionIds: number[];
  optionNames: string;
  stock: number;
  priceOverride: string; // pesos (display)
  priceOffer: string; // pesos (display)
  imageIndex: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  position: number;
}

// ─── Props ────────────────────────────────────────────────
interface NewProductFormProps {
  categories: Category[];
}

// ─── Helpers ──────────────────────────────────────────────
function cartesian<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<T[][]>((acc, arr) => {
    const result: T[][] = [];
    for (const combo of acc) {
      for (const item of arr) {
        result.push([...combo, item]);
      }
    }
    return result;
  }, [[]]);
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

type CategoryTreeItem = Category & { depth: number };

// C4-TRACE: Present categories as a hierarchy while keeping the original IDs for selection.
function flattenCategoryTree(categories: Category[]): CategoryTreeItem[] {
  const childrenByParent = new Map<number | null, Category[]>();
  for (const category of categories) {
    const siblings = childrenByParent.get(category.parentId) || [];
    siblings.push(category);
    childrenByParent.set(category.parentId, siblings);
  }

  const sortCategories = (items: Category[]) => [...items].sort((a, b) => (
    a.position - b.position || a.name.localeCompare(b.name, 'es')
  ));
  const flattened: CategoryTreeItem[] = [];
  const visit = (parentId: number | null, depth: number, ancestors: Set<number>) => {
    for (const category of sortCategories(childrenByParent.get(parentId) || [])) {
      if (ancestors.has(category.id)) continue;
      flattened.push({ ...category, depth });
      const nextAncestors = new Set(ancestors).add(category.id);
      visit(category.id, depth + 1, nextAncestors);
    }
  };

  visit(null, 0, new Set());
  return flattened;
}

// ─── Component ─────────────────────────────────────────────
export default function NewProductForm({ categories }: NewProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrlError, setImageUrlError] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const categoryTree = flattenCategoryTree(categories);

  // Base product form
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    priceOffer: '',
    priceTransfer: '',
    stock: '0',
    badge: '',
    hasFreeShipping: false,
    imageUrl: '',
    categoryIds: [] as number[],
    isVisible: true,
    // Shipping
    weight: '',
    length: '',
    width: '',
    height: '',
    // Codes
    sku: '',
    barcode: '',
    // Type
    productType: 'physical',
    // SEO
    seoTitle: '',
    seoDescription: '',
  });

  // Variant builder
  const [variantTypes, setVariantTypes] = useState<VariantType[]>([]);
  const [selectedVariantTypes, setSelectedVariantTypes] = useState<SelectedVariantType[]>([]);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [combinations, setCombinations] = useState<VariantCombination[]>([]);
  const [bulkVariantPrice, setBulkVariantPrice] = useState('');
  const [bulkVariantPriceScope, setBulkVariantPriceScope] = useState<'all' | 'empty'>('all');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null);
  const [leaveBack, setLeaveBack] = useState(false);
  const allowNavigationRef = useRef(false);

  const isDirty = Object.entries(form).some(([key, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (key === 'isVisible') return value !== true;
    if (key === 'productType') return value !== 'physical';
    if (key === 'stock') return value !== '0';
    return Boolean(value);
  }) || imageFiles.length > 0 || selectedVariantTypes.length > 0 || combinations.length > 0;

  const requestNavigation = (target: string) => {
    if (!isDirty) {
      router.push(target);
      return;
    }
    setLeaveTarget(target);
    setLeaveBack(false);
    setShowLeaveDialog(true);
  };

  const confirmLeave = () => {
    allowNavigationRef.current = true;
    setShowLeaveDialog(false);
    if (leaveBack) {
      window.history.back();
      return;
    }
    if (leaveTarget) router.push(leaveTarget);
  };

  const cancelLeave = () => {
    setShowLeaveDialog(false);
    setLeaveTarget(null);
    if (leaveBack) window.history.pushState({ newProductGuard: true }, '', window.location.href);
    setLeaveBack(false);
  };

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const handlePopState = () => {
      if (allowNavigationRef.current) return;
      setLeaveTarget(null);
      setLeaveBack(true);
      setShowLeaveDialog(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.history.pushState({ newProductGuard: true }, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isDirty]);

  // Load variant types from DB
  useEffect(() => {
    fetch('/api/variant-types')
      .then((r) => r.json())
      .then((data) => setVariantTypes(data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasVariants = combinations.length > 0;
    if (!form.name || (!form.price && !hasVariants)) return;
    if (combinations.some((combination) => combination.priceOffer && Number(combination.priceOffer) >= Number(combination.priceOverride || 0))) {
      setError('La oferta de cada variante debe ser menor que su precio regular.');
      return;
    }

    if (form.imageUrl.trim()) {
      const validation = validateImageUrl(form.imageUrl.trim());
      if (!validation.valid) {
        setImageUrlError(validation.reason || 'URL no permitida');
        return;
      }
      setImageUrlError('');
    }

    setLoading(true);
    try {
      // Build variantCombinations from generated combos
      const variantCombinations = combinations.map((c) => ({
        optionIds: c.optionIds,
        stock: c.stock,
        price: c.priceOverride
          ? Math.round(parseFloat(c.priceOverride) * 100)
          : 0,
        priceOffer: c.priceOffer ? Math.round(parseFloat(c.priceOffer) * 100) : undefined,
        imageUrl: c.imageIndex.startsWith('url:') ? c.imageIndex.slice(4) : undefined,
      }));

      const imageUrls = form.imageUrl.trim() ? [form.imageUrl.trim()] : [];

      const result = await createProduct({
        name: form.name,
        description: form.description || undefined,
        price: form.price
          ? Math.round(parseFloat(form.price) * 100)
          : null,
        priceOffer: form.priceOffer ? Math.round(parseFloat(form.priceOffer) * 100) : undefined,
        priceTransfer: form.priceTransfer ? Math.round(parseFloat(form.priceTransfer) * 100) : undefined,
        badge: form.badge || undefined,
        hasFreeShipping: form.hasFreeShipping,
        categoryIds: form.categoryIds,
        isVisible: form.isVisible,
        imageUrls,
        weight: form.weight ? parseInt(form.weight) : undefined,
        length: form.length ? parseInt(form.length) : undefined,
        width: form.width ? parseInt(form.width) : undefined,
        height: form.height ? parseInt(form.height) : undefined,
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
        productType: form.productType,
        stock: form.stock ? parseInt(form.stock, 10) : 0,
        seoTitle: form.seoTitle || undefined,
        seoDescription: form.seoDescription || undefined,
        variantCombinations: variantCombinations.length > 0 ? variantCombinations : undefined,
      });

      if (!result || !result.id) {
        throw new Error('Error al crear el producto');
      }
      const uploadedUrls = [...imageUrls];
      for (const file of imageFiles) {
        const upload = await uploadFile(file, result.id);
        await uploadProductImage(result.id, upload.url, 'file', file.name);
        uploadedUrls.push(upload.url);
      }
      if (hasVariants && uploadedUrls.length > 0) {
        await updateProductVariantImages(result.id, variantCombinations.map((combination, index) => ({
          optionIds: combination.optionIds,
          imageUrl: combinations[index].imageIndex.startsWith('file:')
            ? uploadedUrls[Number(combinations[index].imageIndex.slice(5))] ?? null
            : combination.imageUrl ?? null,
        })));
      }
      await router.push(`/admin/productos/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el producto');
      setLoading(false);
    }
  };

  // ─── Variant type logic ────────────────────────────────

  const addVariantType = (vt: VariantType) => {
    if (selectedVariantTypes.find((s) => s.variantTypeId === vt.id)) return;
    if (selectedVariantTypes.length >= 3) return;
    setSelectedVariantTypes((prev) => [
      ...prev,
      { variantTypeId: vt.id, variantTypeName: vt.name, optionIds: [] },
    ]);
    setShowAddProperty(false);
  };

  const removeVariantType = (variantTypeId: number) => {
    setSelectedVariantTypes((prev) => prev.filter((s) => s.variantTypeId !== variantTypeId));
    setCombinations([]);
  };

  const toggleOption = (variantTypeId: number, optionId: number) => {
    setSelectedVariantTypes((prev) =>
      prev.map((s) => {
        if (s.variantTypeId !== variantTypeId) return s;
        const ids = s.optionIds.includes(optionId)
          ? s.optionIds.filter((id) => id !== optionId)
          : [...s.optionIds, optionId];
        return { ...s, optionIds: ids };
      })
    );
    setCombinations([]);
  };

  const generateCombinations = () => {
    const allOptionIds = selectedVariantTypes.map((s) => s.optionIds);
    if (allOptionIds.some((arr) => arr.length === 0)) return;

    const combos = cartesian(allOptionIds);
    const newCombinations: VariantCombination[] = combos.map((comboOptionIds) => {
      const optionNames = comboOptionIds
        .map((optId) => {
          for (const vt of variantTypes) {
            const opt = vt.options.find((o) => o.id === optId);
            if (opt) return opt.value;
          }
          return '';
        })
        .join(' / ');

      return {
        optionIds: comboOptionIds,
        optionNames,
        stock: 0,
        priceOverride: '0',
        priceOffer: '',
        imageIndex: '',
      };
    });
    setCombinations(newCombinations);
  };

  const updateCombination = (index: number, field: 'stock' | 'priceOverride' | 'priceOffer' | 'imageIndex', value: string) => {
    setCombinations((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const applyBulkVariantPrice = () => {
    const parsedPrice = Number(bulkVariantPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('Ingresá un precio válido mayor o igual a 0.');
      return;
    }

    const overwritesExisting = combinations.some((combination) => Number(combination.priceOverride || 0) > 0);
    if (bulkVariantPriceScope === 'all' && overwritesExisting && !window.confirm('Esto va a sobrescribir los precios cargados. ¿Continuar?')) {
      return;
    }

    setCombinations((prev) => prev.map((combination) => (
      bulkVariantPriceScope === 'all' || Number(combination.priceOverride || 0) === 0
        ? { ...combination, priceOverride: bulkVariantPrice }
        : combination
    )));
    setError('');
  };

  const canGenerate =
    selectedVariantTypes.length > 0 &&
    selectedVariantTypes.every((s) => s.optionIds.length > 0);

  return (
    <div>
      {error && (
        <div className="admin-error-box" style={{ marginBottom: '1rem', padding: '12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#dc2626', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <div className="admin-edit-back">
        <button type="button" className="admin-edit-back-link" onClick={() => requestNavigation('/admin/productos')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Volver
        </button>
      </div>

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

      <form id="new-product-form" onSubmit={handleSubmit}>
        <div className="admin-edit-layout">
          {/* ── Left column ─────────────────────────────── */}
          <div className="admin-edit-main">

            {/* Name & Description */}
            <div className="admin-card">
              <h3 className="admin-card-title">Nombre y descripción</h3>
              <div className="admin-form-group">
                <label className="admin-form-label">Nombre *</label>
                <input type="text" className="admin-input" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nombre del producto" required />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Descripción</label>
                <textarea className="admin-input" rows={6} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción del producto" style={{ resize: 'vertical' }} />
              </div>
            </div>

            {/* Photos */}
            <div className="admin-card">
              <h3 className="admin-card-title">Fotos y video</h3>
              <ImageUploadAdvisor onFilesReady={setImageFiles} id="new-product-images" />
              <div className="admin-form-group" style={{ marginTop: '1rem' }}>
                <label className="admin-form-label">URL de imagen</label>
                <input type="url" className={`admin-input ${imageUrlError ? 'admin-input--error' : ''}`}
                  value={form.imageUrl}
                  onChange={(e) => { setForm({ ...form, imageUrl: e.target.value }); if (imageUrlError) setImageUrlError(''); }}
                  placeholder="https://dcdn-us.mitiendanube.com/stores/..." />
                {imageUrlError && <span className="admin-field-error">{imageUrlError}</span>}
                <div className="admin-edit-image-hint">
                  Dominios: dcdn-us.mitiendanube.com, d26lpennugtm8s.cloudfront.net, images.pexels.com, picsum.photos
                </div>
              </div>
            </div>

            {/* ── Variant Builder (Tiendanube style) ── */}
            <div className="admin-card">
              <div className="admin-card-title-row">
                <h3 className="admin-card-title">Variantes</h3>
                {selectedVariantTypes.length < 3 && (
                  <button type="button" onClick={() => setShowAddProperty(true)}
                    className="admin-btn admin-btn-secondary admin-btn-sm">
                    + Seleccionar propiedad
                  </button>
                )}
              </div>

              <p className="admin-field-hint">
                 Seleccioná propiedades configuradas como Color, Talle o Estampa. Cada propiedad puede tener múltiples valores.
                Máximo 3 propiedades por producto.
              </p>

              {/* Active variant types */}
              {selectedVariantTypes.map((svt) => {
                const vt = variantTypes.find((v) => v.id === svt.variantTypeId);
                return (
                  <div key={svt.variantTypeId} className="admin-variant-type-block">
                    <div className="admin-variant-type-header">
                      <span className="admin-variant-type-name">{svt.variantTypeName}</span>
                      <button type="button" onClick={() => removeVariantType(svt.variantTypeId)}
                        className="admin-btn-remove" title="Eliminar propiedad">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                    <div className="admin-variant-options">
                      {vt?.options.map((opt) => (
                        <label key={opt.id} className={`admin-variant-option-tag ${svt.optionIds.includes(opt.id) ? 'selected' : ''}`}>
                          <input type="checkbox"
                            checked={svt.optionIds.includes(opt.id)}
                            onChange={() => toggleOption(svt.variantTypeId, opt.id)} />
                         {opt.colorHex && <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: opt.colorHex, border: '1px solid rgba(0,0,0,.2)', display: 'inline-block' }} />}
                         <span>{opt.value}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}

               {/* Configured property selector */}
               {showAddProperty && (
                 <div className="admin-variant-add-modal">
                   <div className="admin-variant-modal-inner">
                     <div className="admin-form-group">
                       <label className="admin-form-label">Elegí una propiedad configurada</label>
                       <div className="admin-variant-preset-list">
                        {variantTypes
                          .filter((vt) => !selectedVariantTypes.find((s) => s.variantTypeId === vt.id))
                          .map((vt) => (
                            <button type="button" key={vt.id}
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                              onClick={() => addVariantType(vt)}>
                              {vt.name}
                            </button>
                           ))}
                       </div>
                       {variantTypes.filter((vt) => !selectedVariantTypes.find((s) => s.variantTypeId === vt.id)).length === 0 && (
                         <p className="admin-field-hint">
                           No hay propiedades disponibles.{' '}
                           <Link href="/admin/variaciones" target="_blank">Administrar propiedades</Link>
                         </p>
                       )}
                       <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setShowAddProperty(false)}>
                         Cerrar
                       </button>
                     </div>
                   </div>
                 </div>
              )}

              {/* Generate button */}
              {selectedVariantTypes.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <button type="button" onClick={generateCombinations}
                    disabled={!canGenerate}
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                    style={{ marginBottom: canGenerate ? '12px' : 0 }}>
                    Generar combinaciones
                  </button>
                  {!canGenerate && (
                    <p className="admin-field-hint">
                      Seleccioná al menos un valor en cada propiedad para generar combinaciones.
                    </p>
                  )}
                  {canGenerate && (
                    <p className="admin-field-hint">
                      Se generarán {selectedVariantTypes.reduce((acc, s) => acc * s.optionIds.length, 1)} combinaciones.
                    </p>
                  )}
                </div>
              )}

               {/* Combinations table */}
               {combinations.length > 0 && (
                 <div className="admin-combinations-table" style={{ marginTop: '16px' }}>
                   <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', padding: '12px', marginBottom: '16px', background: 'var(--nimbus-bg-alt, #f8f9fa)', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                     <label htmlFor="bulk-new-variant-price" style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>Aplicar precio</label>
                     <input
                       id="bulk-new-variant-price"
                       type="number"
                       min="0"
                       step="0.01"
                       className="admin-input"
                       style={{ width: '120px' }}
                       value={bulkVariantPrice}
                       onChange={(e) => setBulkVariantPrice(e.target.value)}
                       placeholder="Ej: 12000"
                     />
                     <select
                       className="admin-input"
                       style={{ width: '220px' }}
                       value={bulkVariantPriceScope}
                       onChange={(e) => setBulkVariantPriceScope(e.target.value as 'all' | 'empty')}
                       aria-label="Alcance del precio masivo"
                     >
                       <option value="all">Todas las variantes</option>
                       <option value="empty">Solo variantes sin precio</option>
                     </select>
                     <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={applyBulkVariantPrice}>
                       Aplicar
                     </button>
                   </div>
                   <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--nimbus-bg-alt, #f8f9fa)' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Variante</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, width: '100px' }}>Stock</th>
                         <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, width: '120px' }}>Precio regular</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, width: '120px' }}>Oferta</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, width: '160px' }}>Imagen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {combinations.map((combo, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '8px 12px', fontSize: '13px' }}>{combo.optionNames}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <input type="number" min="0" className="admin-input" style={{ width: '80px', textAlign: 'right' }}
                              value={combo.stock}
                              onChange={(e) => updateCombination(i, 'stock', e.target.value)} />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <input type="number" min="0" step="0.01" className="admin-input" style={{ width: '100px', textAlign: 'right' }}
                              value={combo.priceOverride}
                              onChange={(e) => updateCombination(i, 'priceOverride', e.target.value)}
                               placeholder="0 = no disponible" />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <input type="number" min="0" step="0.01" className="admin-input" style={{ width: '100px', textAlign: 'right' }}
                              value={combo.priceOffer}
                              onChange={(e) => updateCombination(i, 'priceOffer', e.target.value)}
                              placeholder="Opcional" />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <select
                              className="admin-input"
                              value={combo.imageIndex}
                              onChange={(e) => updateCombination(i, 'imageIndex', e.target.value)}
                            >
                              <option value="">Imagen general</option>
                              {form.imageUrl && <option value={`url:${form.imageUrl}`}>URL del producto</option>}
                              {imageFiles.map((file, fileIndex) => (
                                <option key={`${file.name}-${fileIndex}`} value={`file:${(form.imageUrl ? 1 : 0) + fileIndex}`}>
                                  {file.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Tipo de producto */}
            <div className="admin-card">
              <h3 className="admin-card-title">Tipo de producto</h3>
              <div className="admin-radio-group">
                <label className="admin-radio-label">
                  <input type="radio" name="productType" value="physical"
                    checked={form.productType === 'physical'}
                    onChange={() => setForm({ ...form, productType: 'physical' })} />
                  <span>Físico</span>
                </label>
                <label className="admin-radio-label">
                  <input type="radio" name="productType" value="digital"
                    checked={form.productType === 'digital'}
                    onChange={() => setForm({ ...form, productType: 'digital' })} />
                  <span>Digital / servicio</span>
                </label>
              </div>
            </div>

            {/* Peso y dimensiones */}
            <div className="admin-card">
              <h3 className="admin-card-title">Peso y dimensiones</h3>
              <p className="admin-field-hint">Requeridos para calcular el costo de envío.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="admin-form-group">
                  <label className="admin-form-label">Peso (g)</label>
                  <input type="number" className="admin-input" min="0"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    placeholder="Ej: 500" />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Largo (cm)</label>
                  <input type="number" className="admin-input" min="0"
                    value={form.length}
                    onChange={(e) => setForm({ ...form, length: e.target.value })}
                    placeholder="Ej: 20" />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Ancho (cm)</label>
                  <input type="number" className="admin-input" min="0"
                    value={form.width}
                    onChange={(e) => setForm({ ...form, width: e.target.value })}
                    placeholder="Ej: 15" />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Alto (cm)</label>
                  <input type="number" className="admin-input" min="0"
                    value={form.height}
                    onChange={(e) => setForm({ ...form, height: e.target.value })}
                    placeholder="Ej: 10" />
                </div>
              </div>
            </div>

            {/* Códigos */}
            <div className="admin-card">
              <h3 className="admin-card-title">Códigos</h3>
              <div className="admin-form-group">
                <label className="admin-form-label">SKU</label>
                <input type="text" className="admin-input"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="Código interno" />
              </div>
              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <label className="admin-form-label">Código de barras</label>
                <input type="text" className="admin-input"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder="EAN, UPC, ISBN..." />
              </div>
            </div>

            {/* SEO */}
            <div className="admin-card">
              <h3 className="admin-card-title">SEO</h3>
              <div className="admin-form-group">
                <label className="admin-form-label">Título SEO</label>
                <input type="text" className="admin-input"
                  value={form.seoTitle}
                  onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                  placeholder="Título para buscadores (70 caracteres)" />
                <span className="admin-field-help">{form.seoTitle.length}/70 caracteres</span>
              </div>
              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <label className="admin-form-label">Descripción SEO</label>
                <textarea className="admin-input" rows={3}
                  value={form.seoDescription}
                  onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                  placeholder="Descripción para Google y redes sociales (160 caracteres)"
                  style={{ resize: 'vertical' }} />
                <span className="admin-field-help">{form.seoDescription.length}/160 caracteres</span>
              </div>
            </div>
          </div>

          {/* ── Right column ─────────────────────────────── */}
          <div className="admin-edit-sidebar">

            {/* Category */}
            <div className="admin-card">
              <h3 className="admin-card-title admin-card-title--sm">Categoría</h3>
              <div className="admin-form-group">
                <label className="admin-form-label">Categoría</label>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {categoryTree.map((cat) => (
                        <label key={cat.id} className="admin-checkbox-label">
                          <input
                            type="checkbox"
                            checked={form.categoryIds.includes(cat.id)}
                            onChange={() => setForm((previous) => ({
                              ...previous,
                              categoryIds: previous.categoryIds.includes(cat.id)
                                ? previous.categoryIds.filter((id) => id !== cat.id)
                                : [...previous.categoryIds, cat.id],
                            }))}
                          />
                          <span style={{
                            paddingLeft: `${cat.depth * 18}px`,
                            fontWeight: cat.depth === 0 ? 700 : 400,
                          }}>
                            {cat.depth > 0 && <span aria-hidden="true" style={{ marginRight: '6px', opacity: 0.55 }}>↳</span>}
                            {cat.name}
                          </span>
                        </label>
                      ))}
                    </div>
              </div>
            </div>

            {/* Price */}
            <div className="admin-card">
               <h3 className="admin-card-title admin-card-title--sm">Precios y disponibilidad</h3>
               {combinations.length > 0 && (
                 <div className="admin-form-hint" style={{ marginBottom: '16px' }}>
                   Cada variante tiene su propio precio. Las variantes con precio 0 quedan sin venta hasta que les asignes un precio.
                 </div>
               )}
               <div className="admin-form-group">
                    <label className="admin-form-label">Precio general {combinations.length === 0 ? '*' : '(no aplica con variantes)'}</label>
                <div className="admin-edit-price-row">
                  <span className="admin-edit-price-prefix">$</span>
                   <input type="number" className="admin-input" value={form.price}
                     onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder={combinations.length === 0 ? '0' : 'Se define por variante'} step="0.01" min="0" required={combinations.length === 0} disabled={combinations.length > 0} />
                 </div>
                </div>
                {combinations.length === 0 && form.productType === 'physical' && (
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="initial-product-stock">Stock inicial</label>
                    <input
                      id="initial-product-stock"
                      type="number"
                      className="admin-input"
                      min="0"
                      step="1"
                      value={form.stock}
                      onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))}
                      aria-describedby="initial-product-stock-hint"
                    />
                    <span id="initial-product-stock-hint" className="admin-form-hint">
                      Si queda en 0, el producto no se podrá comprar hasta cargar stock en Inventario.
                    </span>
                  </div>
                )}
                {combinations.length === 0 && <div className="admin-form-group">
                <label className="admin-form-label">Precio de oferta</label>
                <div className="admin-edit-price-row">
                  <span className="admin-edit-price-prefix">$</span>
                  <input type="number" className="admin-input" value={form.priceOffer}
                    onChange={(e) => setForm({ ...form, priceOffer: e.target.value })}
                    placeholder="0" step="0.01" min="0" />
                </div>
               </div>}
               {combinations.length === 0 && <div className="admin-form-group">
                <label className="admin-form-label">Descuento (%)</label>
                <div className="admin-edit-price-row">
                  <span className="admin-edit-price-prefix">%</span>
                  <input
                    type="text"
                    className="admin-input"
                    value={getDiscountPercent(
                      form.price ? Math.round(parseFloat(form.price) * 100) : null,
                      form.priceOffer ? Math.round(parseFloat(form.priceOffer) * 100) : null,
                    ) ?? ''}
                    readOnly
                    aria-readonly="true"
                    placeholder="Se calcula automáticamente"
                  />
                </div>
               </div>}
               {combinations.length === 0 && <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <label className="admin-form-label">Precio transferencia</label>
                <div className="admin-edit-price-row">
                  <span className="admin-edit-price-prefix">$</span>
                   <input type="number" className="admin-input" value={form.priceTransfer}
                     onChange={(e) => setForm({ ...form, priceTransfer: e.target.value })}
                     placeholder="0" step="0.01" min="0" />
                 </div>
               </div>}
               </div>

             {/* Other */}
            <div className="admin-card">
              <h3 className="admin-card-title admin-card-title--sm">Otros</h3>
              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <label className="admin-form-label">Badge</label>
                <input type="text" className="admin-input" value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  placeholder="Ej: Nuevo, Oferta, -20%" />
              </div>
            </div>

            {/* Visibility */}
            <div className="admin-card">
              <h3 className="admin-card-title admin-card-title--sm">Envío</h3>
              <label className="admin-checkbox-label">
                <input type="checkbox" checked={form.hasFreeShipping}
                  onChange={(e) => setForm({ ...form, hasFreeShipping: e.target.checked })} />
                <span>Este producto tiene envío gratis</span>
              </label>
            </div>

            {/* Visibility */}
            <div className="admin-card">
              <h3 className="admin-card-title admin-card-title--sm">Visibilidad</h3>
              <label className="admin-checkbox-label">
                <input type="checkbox" checked={form.isVisible}
                  onChange={(e) => setForm({ ...form, isVisible: e.target.checked })} />
                <span>Visible en la tienda</span>
              </label>
            </div>

            {/* Save/Cancel */}
            <div className="admin-edit-footer">
              <button type="button" className="admin-btn admin-btn-secondary admin-edit-footer-btn" onClick={() => requestNavigation('/admin/productos')}>Cancelar</button>
              <button className="admin-btn admin-btn-primary admin-edit-footer-btn" type="submit" disabled={loading}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {loading ? 'Creando...' : 'Crear producto'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {showLeaveDialog && (
        <div className="admin-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="new-product-leave-title">
          <div className="admin-confirm-dialog">
            <h2 id="new-product-leave-title" className="admin-confirm-title">¿Cancelar la creación?</h2>
            <p className="admin-confirm-message">Tenés cambios sin guardar. Si salís ahora, se perderá la información ingresada.</p>
            <div className="admin-confirm-actions">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={cancelLeave}>Seguir editando</button>
              <button type="button" className="admin-btn admin-btn-danger" onClick={confirmLeave}>Salir sin guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
