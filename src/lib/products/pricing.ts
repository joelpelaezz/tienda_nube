export type PaymentPriceMethod = 'regular' | 'transfer';

// C4-TRACE: a zero/null amount means price consultation, never a free storefront purchase.
export function isSellablePrice(price: number | null | undefined): price is number {
  return price != null && Number.isFinite(price) && price > 0;
}

// C4-TRACE: zero-priced simple products cannot retain stale special-price overrides.
export function normalizeSimpleProductPrices(
  regularPrice: number | null,
  offerPrice: number | null,
  transferPrice: number | null,
  hasVariants: boolean,
) {
  if (hasVariants || regularPrice !== 0) {
    return { offerPrice, transferPrice };
  }

  return { offerPrice: null, transferPrice: null };
}

export interface EffectivePriceInput {
  regularPrice: number | null | undefined;
  offerPrice?: number | null;
  transferPrice?: number | null;
  variantOverride?: number | null;
  variantRegularPrice?: number | null;
  variantOfferPrice?: number | null;
  paymentMethod?: PaymentPriceMethod;
}

/** Prices are stored in cents. Variant-specific prices take precedence over product defaults. */
export function getEffectivePriceCents({
  regularPrice,
  offerPrice,
  transferPrice,
  variantOverride,
  variantRegularPrice,
  variantOfferPrice,
  paymentMethod = 'regular',
}: EffectivePriceInput): number | null {
  const regularVariantPrice = variantRegularPrice ?? variantOverride;
  if (variantOfferPrice != null) return variantOfferPrice;
  if (offerPrice != null) return offerPrice;
  if (regularVariantPrice != null) return regularVariantPrice;
  if (paymentMethod === 'transfer' && transferPrice != null) return transferPrice;
  return regularPrice ?? null;
}

export function getPricePresentation(input: EffectivePriceInput) {
  const regularPrice = input.variantRegularPrice ?? input.variantOverride ?? input.regularPrice ?? null;
  const finalPrice = getEffectivePriceCents(input);
  return {
    regularPrice,
    finalPrice,
    isOnSale: finalPrice != null && regularPrice != null && finalPrice < regularPrice,
  };
}

export function pesosToCents(value: string | number | null | undefined): number | null {
  if (value == null || String(value).trim() === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

export function centsToPesos(value: number | null | undefined): number | null {
  return value == null ? null : value / 100;
}

/** Returns the whole-number discount percentage when an offer is below regular price. */
export function getDiscountPercent(
  regularPrice: number | null | undefined,
  offerPrice: number | null | undefined,
): number | null {
  if (regularPrice == null || offerPrice == null || regularPrice <= 0 || offerPrice >= regularPrice) {
    return null;
  }

  return Math.round(((regularPrice - offerPrice) / regularPrice) * 100);
}
