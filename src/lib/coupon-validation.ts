export interface CouponValidationRecord {
  code: string;
  type: string;
  value: number;
  minPurchase: number | null;
  maxUses: number | null;
  usedCount: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean | null;
}

// C4-TRACE: centralized coupon date boundaries and sellable-price validation.

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  type: 'percent' | 'fixed';
  discountValue: number;
  discountLabel: string;
  message: string;
}

function utcDayStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function utcDayEnd(date: Date): number {
  return utcDayStart(date) + 24 * 60 * 60 * 1000 - 1;
}

export function isCouponExpired(validUntil: Date | null, now = new Date()): boolean {
  return validUntil !== null && now.getTime() > utcDayEnd(validUntil);
}

export function isCouponNotStarted(validFrom: Date | null, now = new Date()): boolean {
  return validFrom !== null && now.getTime() < utcDayStart(validFrom);
}

export function validateCouponRecord(
  coupon: CouponValidationRecord | undefined,
  inputCode: string,
  cartTotal: number,
  now = new Date(),
): CouponValidationResult {
  const normalizedCode = inputCode.trim().toUpperCase();
  const invalid = (message: string): CouponValidationResult => ({
    valid: false,
    code: normalizedCode,
    type: 'percent',
    discountValue: 0,
    discountLabel: '',
    message,
  });

  if (!normalizedCode) return invalid('Ingresá un código');
  if (!coupon || !coupon.isActive) return invalid('Código inválido');

  if (coupon.maxUses !== null && (coupon.usedCount ?? 0) >= coupon.maxUses) {
    return invalid('Este código ya no está disponible');
  }

  if (isCouponNotStarted(coupon.validFrom, now)) {
    return invalid('Este código aún no está vigente');
  }
  if (isCouponExpired(coupon.validUntil, now)) {
    return invalid('Este código venció');
  }

  if (coupon.minPurchase !== null && cartTotal < coupon.minPurchase) {
    const minPurchaseLabel = `$${(coupon.minPurchase / 100).toLocaleString('es-AR')}`;
    return invalid(`Necesitás gastar al menos ${minPurchaseLabel} para usar este código`);
  }

  const type = coupon.type === 'fixed' ? 'fixed' : 'percent';
  const discountLabel = type === 'percent'
    ? `${coupon.value}%`
    : `$${(coupon.value / 100).toLocaleString('es-AR')}`;

  return {
    valid: true,
    code: normalizedCode,
    type,
    discountValue: coupon.value,
    discountLabel,
    message: `Descuento de ${discountLabel} aplicado`,
  };
}

export function requireSellableUnitPrice(price: number | null, productName: string): number {
  if (price === null || !Number.isInteger(price) || price <= 0) {
    throw new Error(`El producto "${productName}" no tiene un precio válido para la venta`);
  }

  return price;
}
