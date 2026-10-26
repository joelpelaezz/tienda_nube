import { describe, expect, it } from 'vitest';
import { getEffectivePriceCents, getPricePresentation, isSellablePrice, normalizeSimpleProductPrices } from './pricing';

// C4-TRACE: regression tests for clearing special prices when simple-product base price is zero.

describe('product pricing', () => {
  it.each([null, undefined, 0])('treats %s as a price that requires consultation', (price) => {
    expect(isSellablePrice(price)).toBe(false);
  });

  it('treats a positive amount as sellable', () => {
    expect(isSellablePrice(1)).toBe(true);
  });

  it('clears offer and transfer overrides for a simple product priced at zero', () => {
    expect(normalizeSimpleProductPrices(0, 8000, 7000, false)).toEqual({
      offerPrice: null,
      transferPrice: null,
    });
  });

  it('preserves special prices when the base price is nonzero or the product has variants', () => {
    expect(normalizeSimpleProductPrices(10000, 8000, 7000, false)).toEqual({
      offerPrice: 8000,
      transferPrice: 7000,
    });
    expect(normalizeSimpleProductPrices(0, 8000, 7000, true)).toEqual({
      offerPrice: 8000,
      transferPrice: 7000,
    });
  });

  it('prioritizes a variant offer over the product offer', () => {
    expect(getEffectivePriceCents({
      regularPrice: 10000,
      offerPrice: 8000,
      variantRegularPrice: 12000,
      variantOfferPrice: 9000,
    })).toBe(9000);
  });

  it('falls back from product offer to variant regular price', () => {
    expect(getEffectivePriceCents({
      regularPrice: 10000,
      offerPrice: null,
      variantRegularPrice: 12000,
    })).toBe(12000);
  });

  it('uses the product offer before a variant regular price', () => {
    expect(getEffectivePriceCents({
      regularPrice: 10000,
      offerPrice: 8000,
      variantRegularPrice: 12000,
    })).toBe(8000);
  });

  it('marks an effective variant price as on sale against its regular price', () => {
    expect(getPricePresentation({
      regularPrice: 10000,
      offerPrice: 8000,
      variantRegularPrice: 12000,
      variantOfferPrice: 9000,
    })).toEqual({
      regularPrice: 12000,
      finalPrice: 9000,
      isOnSale: true,
    });
  });
});
