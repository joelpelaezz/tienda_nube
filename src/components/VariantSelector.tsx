'use client';

import { useState, useEffect } from 'react';
import { VARIANT_COLORS, getVariantColor } from '@/lib/colors';

interface VariantOption {
  id: number;
  variantTypeId: number;
  value: string;
  position: number;
}

interface VariantType {
  id: number;
  name: string;
  position: number;
  options: VariantOption[];
}

interface Variant {
  id: number;
  name: string;
  price?: number | null;
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

function isColorType(typeName: string): boolean {
  return typeName.toLowerCase() === 'color' || typeName.toLowerCase() === 'colour';
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

  // Older variants may not have variantTypeId persisted; derive it from their option.
  const getVariantTypeId = (variant: Variant) => {
    if (variant.variantTypeId) return variant.variantTypeId;
    const optionId = variant.optionIds?.[0];
    return variantTypeIdsByOption.get(Number(optionId));
  };
  const variantTypeIdsByOption = new Map(
    variantTypes.flatMap((type) => type.options.map((option) => [option.id, option.variantTypeId] as const))
  );
  const variantTypeIds = new Set(variants.map(getVariantTypeId).filter(Boolean));
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

  const handleOptionSelect = (variantTypeId: number, optionId: number, optionValue: string) => {
    setSelectedOptions((prev) => {
      const updated = { ...prev, [variantTypeId]: optionId };
      const match = findMatchingVariant(updated);
      if (match) {
        onSelect(match);
        if (onPriceChange && match.price != null) {
          onPriceChange(match.price);
        }
      }
      return updated;
    });
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
    const typeId = variants[0] ? getVariantTypeId(variants[0]) : undefined;
    const type = variantTypes.find((t) => t.id === typeId);
    const isColor = type ? isColorType(type.name) : false;

    const selectedVariant = variants.find((v) => v.id === selectedVariantId);

    if (isColor) {
      return (
        <div className="detalle-variants">
          <h3 className="detalle-variant-label">
            {type?.name?.toUpperCase() || 'COLOR'}: <span className="font-normal">{selectedVariant?.name || 'Seleccionar'}</span>
          </h3>
          <div className="detalle-variant-options">
            {variants.map((variant) => {
              const outOfStock = (stockMap[variant.id] ?? -1) === 0;
              return (
                <button
                  key={variant.id}
                  className={`detalle-variant-btn ${selectedVariantId === variant.id ? 'detalle-variant-btn-active' : ''}`}
                  title={outOfStock ? 'Sin stock' : variant.name}
                  style={{ backgroundColor: getVariantColor(variant.name) }}
                  onClick={() => {
                    if (outOfStock) return;
                    onSelect(variant);
                    if (onPriceChange && variant.price != null) onPriceChange(variant.price);
                  }}
                  aria-label={variant.name}
                  disabled={outOfStock}
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
            const outOfStock = (stockMap[variant.id] ?? -1) === 0;
            return (
              <button
                key={variant.id}
                className={`detalle-variant-text-btn ${selectedVariantId === variant.id ? 'active' : ''} ${outOfStock ? 'detalle-variant-text-btn-agotado' : ''}`}
                onClick={() => {
                  if (outOfStock) return;
                  onSelect(variant);
                  if (onPriceChange && variant.price != null) onPriceChange(variant.price);
                }}
                disabled={outOfStock}
                title={outOfStock ? 'Sin stock' : variant.name}
              >
                {variant.name}
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
        const isColor = isColorType(type.name);
        // Get options that exist in this product's variants
        const optionIdsUsed = new Set(
          variants.flatMap((v) => v.optionIds || []).map((oid) => parseInt(oid))
        );
        const typeOptions = type.options.filter((o) => optionIdsUsed.has(o.id));

        return (
          <div key={type.id} className="detalle-variant-type-row">
            <h3 className="detalle-variant-label">
              {type.name.toUpperCase()}:{' '}
              <span className="font-normal">
                {selectedOptions[type.id]
                  ? typeOptions.find((o) => o.id === selectedOptions[type.id])?.value
                  : `Elegí ${type.name}`}
              </span>
            </h3>
            <div className="detalle-variant-options" style={{ gap: isColor ? '8px' : '6px' }}>
              {typeOptions.map((opt) => {
                const isSelected = selectedOptions[type.id] === opt.id;
                // For multi-type: option is out of stock if all variants with that option are out
                const variantsWithOption = variants.filter((v) =>
                  v.optionIds?.map((oid) => parseInt(oid)).includes(opt.id)
                );
                const allOutOfStock = variantsWithOption.length > 0 &&
                  variantsWithOption.every((v) => (stockMap[v.id] ?? -1) === 0);
                if (isColor) {
                  return (
                    <button
                      key={opt.id}
                      className={`detalle-variant-btn ${isSelected ? 'detalle-variant-btn-active' : ''}`}
                      title={allOutOfStock ? 'Sin stock' : opt.value}
                      style={{ backgroundColor: getVariantColor(opt.value) }}
                      onClick={() => {
                        if (allOutOfStock) return;
                        handleOptionSelect(type.id, opt.id, opt.value);
                      }}
                      aria-label={opt.value}
                      disabled={allOutOfStock}
                    />
                  );
                }
                return (
                  <button
                    key={opt.id}
                    className={`detalle-variant-text-btn ${isSelected ? 'active' : ''} ${allOutOfStock ? 'detalle-variant-text-btn-agotado' : ''}`}
                    onClick={() => {
                      if (allOutOfStock) return;
                      handleOptionSelect(type.id, opt.id, opt.value);
                    }}
                    disabled={allOutOfStock}
                    title={allOutOfStock ? 'Sin stock' : opt.value}
                  >
                    {opt.value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
