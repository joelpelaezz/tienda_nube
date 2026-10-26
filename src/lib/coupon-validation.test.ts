import { describe, expect, it } from 'vitest';
import { isCouponExpired, requireSellableUnitPrice, validateCouponRecord } from './coupon-validation';

// C4-TRACE: regression coverage for inclusive expiry, locked-row validation inputs, and sellable prices.

const validCoupon = {
  code: 'VERANO10',
  type: 'percent',
  value: 10,
  minPurchase: null,
  maxUses: 10,
  usedCount: 0,
  validFrom: null,
  validUntil: null,
  isActive: true,
};

describe('validateCouponRecord', () => {
  it('keeps a date-only expiration valid through the entire UTC calendar day', () => {
    const validUntil = new Date('2026-10-24T00:00:00.000Z');

    expect(validateCouponRecord(
      { ...validCoupon, validUntil },
      'verano10',
      10000,
      new Date('2026-10-24T23:59:59.999Z'),
    ).valid).toBe(true);

    expect(validateCouponRecord(
      { ...validCoupon, validUntil },
      'verano10',
      10000,
      new Date('2026-10-25T00:00:00.000Z'),
    ).message).toBe('Este código venció');
  });

  it('uses the same inclusive expiration boundary for admin status and checkout validation', () => {
    const validUntil = new Date('2026-10-24T00:00:00.000Z');

    expect(isCouponExpired(validUntil, new Date('2026-10-24T23:59:59.999Z'))).toBe(false);
    expect(isCouponExpired(validUntil, new Date('2026-10-25T00:00:00.000Z'))).toBe(true);
  });

  it('rejects a coupon that became inactive in the freshly-read record', () => {
    const result = validateCouponRecord(
      { ...validCoupon, isActive: false },
      'VERANO10',
      10000,
    );

    expect(result).toMatchObject({ valid: false, message: 'Código inválido' });
  });

  it('rejects a coupon that became exhausted in the freshly-read record', () => {
    const result = validateCouponRecord(
      { ...validCoupon, usedCount: 10 },
      'VERANO10',
      10000,
    );

    expect(result.message).toBe('Este código ya no está disponible');
  });

  it('uses the value from the freshly-read coupon record', () => {
    const result = validateCouponRecord(
      { ...validCoupon, value: 25 },
      'VERANO10',
      10000,
    );

    expect(result).toMatchObject({ valid: true, discountValue: 25, discountLabel: '25%' });
  });
});

describe('requireSellableUnitPrice', () => {
  it.each([null, 0, -1, 1.5])('rejects non-sellable price %s', (price) => {
    expect(() => requireSellableUnitPrice(price, 'Termos')).toThrow('no tiene un precio válido');
  });

  it('accepts a positive integer price in cents', () => {
    expect(requireSellableUnitPrice(2500000, 'Termos')).toBe(2500000);
  });
});
