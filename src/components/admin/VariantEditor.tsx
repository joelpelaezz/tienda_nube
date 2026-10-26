'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { saveProductVariants } from '@/app/admin/productos/actions';
import styles from './VariantEditor.module.css';

interface VariantType {
  id: number;
  name: string;
  presentation?: 'text' | 'color' | 'image';
  options: { id: number; value: string; colorHex?: string | null; imageUrl?: string | null }[];
}

interface ExistingVariant {
  id: number;
  name: string;
  stock: number | null;
  price: number | null;
  priceOffer: number | null;
  imageUrl: string | null;
  optionIds: string[];
  isVisible: boolean | null;
}

interface SelectedVariantType {
  variantTypeId: number;
  variantTypeName: string;
  optionIds: number[];
}

interface Combination {
  id?: number;
  optionIds: number[];
  optionNames: string;
  stock: number;
  price: string; // display in pesos
  priceOffer: string; // display in pesos
  imageUrl: string;
}

interface VariantEditorProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  existingVariants: ExistingVariant[];
  productImages: Array<{ id: number; url: string; alt: string | null }>;
}

// Cartesian product for generating combinations
function cartesian<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<T[][]>((acc, arr) => {
    const result: T[][] = [];
    for (const a of acc) {
      for (const b of arr) {
        result.push([...a, b]);
      }
    }
    return result;
  }, [[]]);
}

export default function VariantEditor({
  isOpen,
  onClose,
  productId,
  existingVariants,
  productImages,
}: VariantEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // All available variant types from DB
  const [variantTypes, setVariantTypes] = useState<VariantType[]>([]);
  // Variant types currently selected for this product
  const [selectedVariantTypes, setSelectedVariantTypes] = useState<SelectedVariantType[]>([]);
  // Show configured-property selector
  const [showAddProperty, setShowAddProperty] = useState(false);
  // Generated combinations
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkScope, setBulkScope] = useState<'all' | 'empty'>('empty');

  // Load variant types from API
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/variant-types')
      .then((r) => r.json())
      .then((data) => setVariantTypes(data))
      .catch(() => {});
  }, [isOpen]);

  // Pre-populate from existing variants when modal opens
  useEffect(() => {
    if (!isOpen || variantTypes.length === 0 || existingVariants.length === 0) return;

    // Group existing option_ids by variant_type_id
    const typeIdToOptionIds = new Map<number, number[]>();
    for (const v of existingVariants) {
      for (const optIdStr of v.optionIds) {
        const optId = parseInt(optIdStr);
        const vt = variantTypes.find((t) =>
          t.options.some((o) => o.id === optId)
        );
        if (vt) {
          if (!typeIdToOptionIds.has(vt.id)) typeIdToOptionIds.set(vt.id, []);
          const ids = typeIdToOptionIds.get(vt.id)!;
          if (!ids.includes(optId)) ids.push(optId);
        }
      }
    }

    // Build selectedVariantTypes from grouped data
    const preSelected: SelectedVariantType[] = [];
    typeIdToOptionIds.forEach((optionIds, typeId) => {
      const vt = variantTypes.find((t) => t.id === typeId);
      if (vt) {
        preSelected.push({ variantTypeId: vt.id, variantTypeName: vt.name, optionIds });
      }
    });
    setSelectedVariantTypes(preSelected);

    // Pre-populate combinations table from existing variants
    const existingCombos: Combination[] = existingVariants.map((v) => ({
      id: v.id,
      optionIds: v.optionIds.map(Number),
      optionNames: v.name,
      stock: v.stock ?? 0,
       price: v.price != null ? (v.price / 100).toString() : '0',
      priceOffer: v.priceOffer != null ? (v.priceOffer / 100).toString() : '',
      imageUrl: v.imageUrl ?? '',
    }));
    setCombinations(existingCombos);
  }, [isOpen, variantTypes, existingVariants]);

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
    const newCombos: Combination[] = combos.map((comboOptionIds) => {
      const optionNames = comboOptionIds
        .map((optId) => {
          for (const vt of variantTypes) {
            const opt = vt.options.find((o) => o.id === optId);
            if (opt) return opt.value;
          }
          return '';
        })
        .join(' / ');

      // Check if this combination already exists
      const existing = existingVariants.find((ev) =>
        ev.optionIds.length === comboOptionIds.length &&
        comboOptionIds.every((id) => ev.optionIds.includes(String(id)))
      );

      return {
        optionIds: comboOptionIds,
        optionNames,
        stock: existing?.stock ?? 0,
        price: existing?.price != null ? (existing.price / 100).toString() : '0',
        priceOffer: existing?.priceOffer != null ? (existing.priceOffer / 100).toString() : '',
        imageUrl: existing?.imageUrl ?? '',
      };
    });
    setCombinations(newCombos);
  };

  const updateCombination = (index: number, field: 'stock' | 'price' | 'priceOffer' | 'imageUrl', value: string) => {
    setCombinations((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeCombination = (index: number) => {
    setCombinations((prev) => prev.filter((_, i) => i !== index));
  };

  const applyBulkPrice = () => {
    const parsedPrice = Number(bulkPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      alert('Ingresá un precio válido mayor o igual a 0.');
      return;
    }
    if (bulkScope === 'all' && !window.confirm('Esto va a sobrescribir los precios de todas las variantes. ¿Continuar?')) {
      return;
    }

    setCombinations((prev) => prev.map((combination) => (
      bulkScope === 'all' || Number(combination.price || 0) === 0
        ? { ...combination, price: bulkPrice }
        : combination
    )));
  };

  const canGenerate =
    selectedVariantTypes.length > 0 &&
    selectedVariantTypes.every((s) => s.optionIds.length > 0);

  const handleSave = () => {
    if (combinations.some((combination) => combination.priceOffer && combination.price && Number(combination.priceOffer) >= Number(combination.price))) {
      alert('La oferta debe ser menor que el precio regular de cada variante.');
      return;
    }
    startTransition(async () => {
      const variantsToSave = combinations
        .filter((c) => c.optionIds.length > 0)
        .map((c) => ({
          id: c.id,
          optionIds: c.optionIds,
          stock: c.stock,
          price: c.price ? Math.round(parseFloat(c.price) * 100) : 0,
          priceOffer: c.priceOffer ? Math.round(parseFloat(c.priceOffer) * 100) : null,
          imageUrl: c.imageUrl || null,
          isVisible: true,
        }));

      await saveProductVariants(productId, variantsToSave);
      router.refresh();
      onClose();
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Editar variantes</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {/* Properties */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Propiedades</h3>
              {selectedVariantTypes.length < 3 && (
                <button
                  type="button"
                  className={styles.addPropBtn}
                  onClick={() => setShowAddProperty(true)}
                >
                  + Seleccionar propiedad
                </button>
              )}
            </div>

            {/* Active variant type chips */}
            {selectedVariantTypes.map((svt) => {
              const vt = variantTypes.find((v) => v.id === svt.variantTypeId);
              return (
                <div key={svt.variantTypeId} className={styles.propBlock}>
                  <div className={styles.propHeader}>
                    <span className={styles.propName}>{svt.variantTypeName}</span>
                    <button
                      type="button"
                      className={styles.propRemoveBtn}
                      onClick={() => removeVariantType(svt.variantTypeId)}
                      title="Eliminar propiedad"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div className={styles.propOptions}>
                    {vt?.options.map((opt) => (
                      <label key={opt.id} className={`${styles.optTag} ${svt.optionIds.includes(opt.id) ? styles.optTagSelected : ''}`}>
                        <input
                          type="checkbox"
                          checked={svt.optionIds.includes(opt.id)}
                          onChange={() => toggleOption(svt.variantTypeId, opt.id)}
                        />
                        {vt?.presentation === 'color' && <span className={styles.optionSwatch} style={{ backgroundColor: opt.colorHex || '#d8dce3' }} aria-hidden="true" />}
                        {vt?.presentation === 'image' && opt.imageUrl && <span className={styles.optionSwatch} style={{ backgroundImage: `url(${opt.imageUrl})` }} aria-hidden="true" />}
                        <span>{opt.value}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Configured property selector */}
            {showAddProperty && (
              <div className={styles.addPropModal}>
                <div className={styles.addPropModalInner}>
                  <p className={styles.addPropLabel}>Elegí una propiedad configurada</p>
                  <div className={styles.presetList}>
                    {variantTypes
                      .filter((vt) => !selectedVariantTypes.find((s) => s.variantTypeId === vt.id))
                      .map((vt) => (
                        <button
                          key={vt.id}
                          type="button"
                          className={styles.presetBtn}
                          onClick={() => addVariantType(vt)}
                        >
                         {vt.name}
                        </button>
                      ))}
                  </div>
                  {variantTypes.filter((vt) => !selectedVariantTypes.find((s) => s.variantTypeId === vt.id)).length === 0 && (
                    <p className={styles.addPropLabel}>
                      No hay propiedades disponibles.{' '}
                      <Link href="/admin/variaciones" target="_blank">Administrar propiedades</Link>
                    </p>
                  )}
                  <button type="button" className={styles.cancelBtnSm} onClick={() => setShowAddProperty(false)}>
                    Cerrar
                  </button>
                </div>
              </div>
            )}

            {/* Generate button */}
            {selectedVariantTypes.length > 0 && (
              <div className={styles.generateRow}>
                <button
                  type="button"
                  className={styles.generateBtn}
                  disabled={!canGenerate}
                  onClick={generateCombinations}
                >
                  Generar combinaciones
                </button>
                {!canGenerate && (
                  <p className={styles.generateHint}>
                    Seleccioná al menos un valor en cada propiedad
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Combinations table */}
          {combinations.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Combinaciones</h3>
              <p className={styles.generateHint}>
                Las variantes con precio 0 quedan sin precio y no se pueden vender desde la tienda.
              </p>
              <p className={styles.generateHint}>
                El stock de las variantes se administra en <Link href="/admin/inventario">Inventario</Link>.
              </p>
              <div className={styles.bulkPriceBar}>
                <label className={styles.bulkPriceLabel} htmlFor="bulk-variant-price">Aplicar precio</label>
                <input
                  id="bulk-variant-price"
                  type="number"
                  min="0"
                  step="0.01"
                  className={styles.priceInput}
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  placeholder="Ej: 12000"
                />
                <select
                  className={styles.priceInput}
                  value={bulkScope}
                  onChange={(e) => setBulkScope(e.target.value as 'all' | 'empty')}
                  aria-label="Alcance del precio masivo"
                >
                  <option value="empty">Solo variantes sin precio</option>
                  <option value="all">Todas las variantes</option>
                </select>
                <button type="button" className={styles.generateBtn} onClick={applyBulkPrice}>
                  Aplicar
                </button>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Variante</th>
                      <th className={styles.thRight}>Stock</th>
                      <th className={styles.thRight}>Precio</th>
                      <th className={styles.thRight}>Oferta</th>
                      <th className={styles.thRight}>Imagen</th>
                      <th className={styles.thRight}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinations.map((combo, i) => (
                      <tr key={i}>
                        <td className={styles.variantName}>{combo.optionNames}</td>
                          <td className={styles.thRight}>{combo.stock}</td>
                         <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className={styles.priceInput}
                            value={combo.price}
                            onChange={(e) => updateCombination(i, 'price', e.target.value)}
                             placeholder="0 = sin precio"
                          />
                        </td>
                         <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className={styles.priceInput}
                            value={combo.priceOffer}
                            onChange={(e) => updateCombination(i, 'priceOffer', e.target.value)}
                            placeholder="Opcional"
                          />
                        </td>
                        <td>
                          <select
                            className={styles.priceInput}
                            value={combo.imageUrl}
                            onChange={(e) => updateCombination(i, 'imageUrl', e.target.value)}
                          >
                            <option value="">Imagen general</option>
                            {productImages.map((image) => (
                              <option key={image.id} value={image.url}>{image.alt || `Imagen ${image.id}`}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.deleteRowBtn}
                            onClick={() => removeCombination(i)}
                            title="Eliminar"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
