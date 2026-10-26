'use client';

import { useState, useEffect } from 'react';
import { getVariantColor } from '@/lib/colors';

interface VariantOption {
  id: number;
  variantTypeId: number;
  value: string;
  colorHex?: string | null;
  imageUrl?: string | null;
  position: number;
}

interface VariantType {
  id: number;
  name: string;
  presentation?: 'text' | 'color' | 'image';
  position: number;
  options: VariantOption[];
}

interface Variant {
  id: number;
  name: string;
  price?: number | null;
  stock?: number | null;
  optionIds?: string[];
  variantTypeId?: number | null;
}

interface VariantSelectorProps {
  variants: Variant[];
  selectedVariantId?: number;
  onSelect: (variant: Variant | null) => void;
  onPriceChange?: (price: number) => void;
  stockMap?: Record<number, number>;  // NEW: variantId -> stock
}

function isColorPresentation(type?: VariantType): boolean {
  return type?.presentation === 'color' || (!!type?.name && ['color', 'colour'].includes(type.name.toLowerCase()));
}

export default function VariantSelector({
  variants,
  selectedVariantId,
  onSelect,
  onPriceChange,
  stockMap = {},
}: VariantSelectorProps) {
  const [variantTypes, setVariantTypes] = useState<VariantType[]>([]);
  const [loading, setLoading] = useState(true);
  // selectedOptions[variantTypeId] = selected optionId
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number | null>>({});

  useEffect(() => {
    fetch('/api/variant-types')
      .then((r) => r.json())
      .then((data: VariantType[]) => {
        setVariantTypes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // A combination can contain options from multiple types (e.g. Color + Talle).
  // The relation attached to the first option is not enough to classify it.
  const getVariantTypeIds = (variant: Variant) => {
    const derivedIds = (variant.optionIds || [])
      .map((optionId) => variantTypeIdsByOption.get(Number(optionId)))
      .filter((id): id is number => Boolean(id));
    return Array.from(new Set(derivedIds.length > 0
      ? derivedIds
      : variant.variantTypeId ? [variant.variantTypeId] : []));
  };
  const variantTypeIdsByOption = new Map(
    variantTypes.flatMap((type) => type.options.map((option) => [option.id, option.variantTypeId] as const))
  );
  const variantTypeIds = new Set(variants.flatMap(getVariantTypeIds));
  const hasMultipleTypes = variantTypeIds.size > 1;

  // When all options selected, find matching variant
  const findMatchingVariant = (opts: Record<number, number | null>): Variant | null => {
    const selectedIds = Object.values(opts).filter(Boolean) as number[];
    if (selectedIds.length !== variants[0]?.optionIds?.length) return null;
    return variants.find((v) => {
      if (!v.optionIds || v.optionIds.length === 0) return false;
      return v.optionIds.every((oid) => selectedIds.includes(parseInt(oid)));
    }) || null;
  };

  const handleOptionSelect = (variantTypeId: number, optionId: number) => {
    const updated = { ...selectedOptions, [variantTypeId]: optionId };
    setSelectedOptions(updated);
    const match = findMatchingVariant(updated);
    onSelect(match);
    if (match && onPriceChange && match.price != null) {
      onPriceChange(match.price);
    }
  };

  const isSelectionOutOfStock = (options: Record<number, number | null>) => {
    const selectedIds = Object.values(options).filter((id): id is number => id != null);
    if (selectedIds.length === 0) return false;

    const matchingVariants = variants.filter((variant) =>
      selectedIds.every((selectedId) => variant.optionIds?.map(Number).includes(selectedId))
    );
    return matchingVariants.length > 0 && matchingVariants.every(isVariantOutOfStock);
  };

  const isOptionOutOfStock = (typeId: number, optionId: number) =>
    isSelectionOutOfStock({ ...selectedOptions, [typeId]: optionId });

  const isVariantOutOfStock = (variant: Variant) => (stockMap[variant.id] ?? variant.stock) === 0;
  const stockLabel = (name: string, outOfStock: boolean) => outOfStock ? `${name} · Sin stock` : name;
  const optionAriaLabel = (name: string, outOfStock: boolean) =>
    outOfStock ? `${name}, sin stock para la combinación seleccionada` : name;
  const setSingleVariant = (variant: Variant) => {
    onSelect(variant);
    if (onPriceChange && variant.price != null) onPriceChange(variant.price);
  };

  // Init: pre-select first variant's options if available
  useEffect(() => {
    if (variants.length > 0 && variants[0].optionIds && variants[0].optionIds.length > 0 && !loading) {
      const init: Record<number, number | null> = {};
      variants[0].optionIds.forEach((oid) => {
        const option = variantTypes
          .flatMap((vt) => vt.options)
          .find((o) => o.id === parseInt(oid));
        if (option) {
          init[option.variantTypeId] = option.id;
        }
      });
      if (Object.keys(init).length > 0) {
        setSelectedOptions(init);
        onSelect(variants[0]);
        if (onPriceChange && variants[0].price != null) {
          onPriceChange(variants[0].price);
        }
      }
    }
  }, [variants, loading, variantTypes, onPriceChange, onSelect]);

  if (loading) return null;

  if (!hasMultipleTypes) {
    // ── Single type: show color swatches or text buttons ──────────
    const typeId = variants[0] ? getVariantTypeIds(variants[0])[0] : undefined;
    const type = variantTypes.find((t) => t.id === typeId);
    const isColor = isColorPresentation(type);
    const isImage = type?.presentation === 'image';

    const selectedVariant = variants.find((v) => v.id === selectedVariantId);

    if (isColor) {
      return (
        <div className="detalle-variants">
          <h3 className="detalle-variant-label">
            {type?.name?.toUpperCase() || 'COLOR'}: <span className="font-normal">{selectedVariant?.name || 'Seleccionar'}</span>
          </h3>
          <div className="detalle-variant-options">
            {variants.map((variant) => {
              const outOfStock = isVariantOutOfStock(variant);
              const option = type?.options.find((candidate) => candidate.id === Number(variant.optionIds?.[0]));
              return (
                <button
                  key={variant.id}
                  className={`detalle-variant-btn ${selectedVariantId === variant.id ? 'detalle-variant-btn-active' : ''} ${outOfStock ? 'detalle-variant-btn-agotado' : ''}`}
                  title={stockLabel(variant.name, outOfStock)}
                   style={{
                     backgroundColor: option?.colorHex || getVariantColor(variant.name),
                     ...(isImage && option?.imageUrl ? { backgroundImage: `url(${option.imageUrl})`, backgroundSize: 'cover' } : {}),
                   }}
                  onClick={() => setSingleVariant(variant)}
                  aria-label={optionAriaLabel(variant.name, outOfStock)}
                />
              );
            })}
          </div>
        </div>
      );
    }

    // Text-based selector (talle, etc.)
    return (
      <div className="detalle-variants">
        <h3 className="detalle-variant-label">
          {type?.name?.toUpperCase() || 'TALLE'}: <span className="font-normal">{selectedVariant?.name || 'Seleccionar'}</span>
        </h3>
        <div className="detalle-variant-options" style={{ gap: '6px' }}>
          {variants.map((variant) => {
            const outOfStock = isVariantOutOfStock(variant);
            return (
              <button
                key={variant.id}
                className={`detalle-variant-text-btn ${selectedVariantId === variant.id ? 'active' : ''} ${outOfStock ? 'detalle-variant-text-btn-agotado' : ''}`}
                onClick={() => setSingleVariant(variant)}
                title={stockLabel(variant.name, outOfStock)}
                aria-label={optionAriaLabel(variant.name, outOfStock)}
              >
                {stockLabel(variant.name, outOfStock)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Multiple types: show selectors per type ─────────────────────
  const typesUsed = Array.from(variantTypeIds)
    .map((id) => variantTypes.find((t) => t.id === id))
    .filter(Boolean) as VariantType[];

  return (
    <div className="detalle-variants-multi">
      {typesUsed.map((type) => {
        const isColor = isColorPresentation(type);
        const isImage = type.presentation === 'image';
        // Get options that exist in this product's variants
        const optionIdsUsed = new Set(
          variants.flatMap((v) => v.optionIds || []).map((oid) => parseInt(oid))
        );
        const typeOptions = type.options.filter((o) => optionIdsUsed.has(o.id));

        return (
          <div key={type.id} className="detalle-variant-type-row detalle-variant-selector-card">
            <h3 className="detalle-variant-label">
              {type.name.toUpperCase()}:{' '}
              <span className="font-normal">
                {selectedOptions[type.id]
                  ? typeOptions.find((o) => o.id === selectedOptions[type.id])?.value
                  : `Elegí ${type.name}`}
              </span>
            </h3>
            {isColor || isImage ? (
              <div className="detalle-variant-options detalle-variant-color-options" style={{ gap: '8px' }}>
                {typeOptions.map((opt) => {
                  const isSelected = selectedOptions[type.id] === opt.id;
                  const outOfStock = isOptionOutOfStock(type.id, opt.id);
                  return (
                    <button
                      key={opt.id}
                      className={`detalle-variant-btn ${isSelected ? 'detalle-variant-btn-active' : ''} ${outOfStock ? 'detalle-variant-btn-agotado' : ''}`}
                      title={stockLabel(opt.value, outOfStock)}
                      style={{
                        backgroundColor: opt.colorHex || getVariantColor(opt.value),
                        ...(isImage && opt.imageUrl ? { backgroundImage: `url(${opt.imageUrl})`, backgroundSize: 'cover' } : {}),
                      }}
                      onClick={() => handleOptionSelect(type.id, opt.id)}
                      aria-label={optionAriaLabel(opt.value, outOfStock)}
                    />
                  );
                })}
              </div>
            ) : (
              <select
                className="detalle-variant-select"
                value={selectedOptions[type.id] ?? ''}
                onChange={(event) => {
                  const optionId = Number(event.target.value);
                  const option = typeOptions.find((candidate) => candidate.id === optionId);
                  if (option) handleOptionSelect(type.id, option.id);
                }}
                aria-label={`Elegir ${type.name}`}
              >
                <option value="">Elegí {type.name.toLowerCase()}</option>
                {typeOptions.map((opt) => {
                  const outOfStock = isOptionOutOfStock(type.id, opt.id);
                  return (
                    <option key={opt.id} value={opt.id}>
                      {stockLabel(opt.value, outOfStock)}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}
