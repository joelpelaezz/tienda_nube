'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { centsToPesos, getDiscountPercent } from '@/lib/products/pricing';

// C4-TRACE: confirm and remove special prices before submitting a zero-priced simple product.

interface PriceInputProps {
  defaultValue: number | null | undefined;
  name: string;
  label: string;
  required?: boolean;
  /** Show "optional" hint label */
  optional?: boolean;
  /** Allow empty (returns undefined instead of error) */
  allowEmpty?: boolean;
  /** Minimum value allowed */
  min?: number;
  /** Hint text shown below input */
  hint?: string;
}

function PriceInput({
  defaultValue,
  name,
  label,
  required = false,
  optional = false,
  allowEmpty = true,
  min = 0,
  hint,
}: PriceInputProps) {
  const [value, setValue] = useState<string>(
    defaultValue !== null && defaultValue !== undefined ? String(centsToPesos(defaultValue)) : ''
  );
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string>('');

  const validate = useCallback((val: string): string => {
    if (val.trim() === '') {
      if (required) return `${label} es obligatorio`;
      if (!allowEmpty) return `${label} es obligatorio`;
      return '';
    }
    const num = Number(val);
    if (!Number.isFinite(num)) return `${label} debe ser un número`;
    if (num < min) return `${label} debe ser mayor o igual a ${min}`;
    return '';
  }, [allowEmpty, label, min, required]);

  useEffect(() => {
    if (touched) {
      setError(validate(value));
    }
  }, [value, touched, validate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleBlur = () => {
    setTouched(true);
    setError(validate(value));
  };

  return (
    <div className="admin-form-group">
      <label className="admin-form-label">
        {label}
        {optional && <span className="admin-form-label-hint"> (opcional)</span>}
      </label>
      <div className="admin-edit-price-row">
        <span className="admin-edit-price-prefix">$</span>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={min}
          className={`admin-input ${error ? 'admin-input--error' : ''}`}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onInvalid={(e) => {
            e.preventDefault();
            setTouched(true);
            setError(validate((e.target as HTMLInputElement).value));
          }}
        />
      </div>
      {error && <span className="admin-field-error">{error}</span>}
      {hint && !error && <span className="admin-form-hint">{hint}</span>}
    </div>
  );
}

interface ProductPriceSectionProps {
  formId: string;
  price: number | null;
  priceOffer: number | null;
  priceTransfer: number | null;
  hasVariants?: boolean;
  inheritedVariantCount?: number;
  customVariantCount?: number;
  productType?: string | null;
  stock?: number | null;
  reservedStock?: number | null;
}

export default function ProductPriceSection({
  formId,
  price,
  priceOffer,
  priceTransfer,
  hasVariants = false,
  productType = 'physical',
  stock,
  reservedStock,
}: ProductPriceSectionProps) {
  const isPhysicalSimpleProduct = !hasVariants && productType !== 'digital';
  const clearSpecialPricesOnSubmit = useRef(false);

  useEffect(() => {
    if (hasVariants) return;
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;

    const handleSubmit = (event: Event) => {
      const basePrice = form.elements.namedItem('price');
      if (!(basePrice instanceof HTMLInputElement) || Number(basePrice.value) !== 0) return;

      const offerPrice = form.elements.namedItem('priceOffer');
      const transferPrice = form.elements.namedItem('priceTransfer');
      const hasSpecialPrice = [offerPrice, transferPrice].some(
        (field) => field instanceof HTMLInputElement && field.value.trim() !== '',
      );
      if (!hasSpecialPrice) return;

      const confirmed = window.confirm(
        'El precio base es $0. Los precios de oferta y transferencia configurados se eliminarán (quedarán vacíos). ¿Querés continuar?',
      );
      if (!confirmed) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      clearSpecialPricesOnSubmit.current = true;
    };

    const handleFormData = (event: Event) => {
      if (!clearSpecialPricesOnSubmit.current) return;
      const formData = (event as FormDataEvent).formData;
      formData.set('priceOffer', '');
      formData.set('priceTransfer', '');
      clearSpecialPricesOnSubmit.current = false;
    };

    form.addEventListener('submit', handleSubmit, true);
    form.addEventListener('formdata', handleFormData);
    return () => {
      form.removeEventListener('submit', handleSubmit, true);
      form.removeEventListener('formdata', handleFormData);
    };
  }, [formId, hasVariants]);

  if (hasVariants) {
    return (
      <div className="admin-form-hint" style={{ marginBottom: 0 }}>
        Cada variante tiene su propio precio. El precio general no aplica en este producto.
        Las variantes con precio 0 se muestran como no disponibles y no pueden venderse.
      </div>
    );
  }

  return (
    <>
      <PriceInput
        defaultValue={price}
        name="price"
         label="Precio"
         required
         min={0}
         hint="Precio de venta al público (en pesos)"
      />
      <PriceInput
        defaultValue={priceOffer}
        name="priceOffer"
        label="Precio de oferta"
        optional={true}
        min={0}
        hint="Dejar vacío si no hay oferta"
      />
      <div className="admin-form-group">
        <label className="admin-form-label">Descuento (%)</label>
        <div className="admin-edit-price-row">
          <span className="admin-edit-price-prefix">%</span>
          <input
            type="text"
            className="admin-input"
            value={getDiscountPercent(price, priceOffer) ?? ''}
            readOnly
            aria-readonly="true"
            placeholder="Se calcula automáticamente"
          />
        </div>
      </div>
      <PriceInput
        defaultValue={priceTransfer}
        name="priceTransfer"
        label="Precio transferencia"
        optional={true}
        min={0}
        hint="Descuento especial pagando por transferencia"
      />
      {isPhysicalSimpleProduct && (
        <div className="admin-form-group" style={{ marginBottom: 0 }}>
          <label className="admin-form-label" htmlFor="product-stock">Stock</label>
          <input
            id="product-stock"
            type="number"
            inputMode="numeric"
            className="admin-input"
            name="stock"
            min={0}
            step="1"
            defaultValue={stock ?? 0}
            aria-describedby="product-stock-hint"
          />
          <span id="product-stock-hint" className="admin-form-hint">
            Unidades disponibles para la venta.
            {(reservedStock ?? 0) > 0 && ` Hay ${reservedStock} reservadas por pedidos.`}
          </span>
        </div>
      )}
    </>
  );
}
