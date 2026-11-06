import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { classifyPayment, parsePositiveId, paymentMatchesOrder, refundAmountCents, verifyMercadoPagoSignature, parseExpiryAge } from './payment-security';

// C4-TRACE: security regressions for identity, signed notifications and exact persisted totals.
describe('payment security', () => {
  it('accepts only canonical positive database IDs', () => {
    expect(parsePositiveId('42')).toBe(42);
    for (const value of ['0', '1x', '-1', '01', '2147483648', undefined]) expect(parsePositiveId(value)).toBeNull();
  });

  it('validates the official signed manifest and rejects altered or incomplete signatures', () => {
    const hash = createHmac('sha256', 'secret').update('id:123;request-id:req;ts:123456;').digest('hex');
    const valid = { secret: 'secret', signature: `ts=123456,v1=${hash}`, requestId: 'req', dataId: '123' };
    expect(verifyMercadoPagoSignature(valid)).toBe(true);
    expect(verifyMercadoPagoSignature({ ...valid, dataId: '124' })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...valid, secret: '' })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...valid, signature: `ts=123456,v1=${hash},v1=${hash}` })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...valid, signature: 'ts=123456,v1=abcd' })).toBe(false);
  });

  it('requires an approved ARS payment with the exact persisted amount and reference', () => {
    const payment = { id: 123, status: 'approved', currency_id: 'ARS', transaction_amount: 10.29, external_reference: '42' };
    expect(paymentMatchesOrder(payment, '123', 42, 1029)).toBe(true);
    expect(paymentMatchesOrder({ ...payment, transaction_amount: 10.291 }, '123', 42, 1029)).toBe(false);
    expect(paymentMatchesOrder({ ...payment, currency_id: 'USD' }, '123', 42, 1029)).toBe(false);
    expect(paymentMatchesOrder({ ...payment, status: 'pending' }, '123', 42, 1029)).toBe(false);
    expect(paymentMatchesOrder({ ...payment, external_reference: '42x' }, '123', 42, 1029)).toBe(false);
    expect(paymentMatchesOrder(payment, '124', 42, 1029)).toBe(false);
    expect(paymentMatchesOrder(payment, '123', 42, 0)).toBe(false);
  });

  it('bounds cron expiry age and rejects partial numbers', () => {
    expect(parseExpiryAge(null)).toBe(30);
    expect(parseExpiryAge('30')).toBe(30);
    for (const value of ['0', '29', '-5', '30x', '10081']) expect(parseExpiryAge(value)).toBeNull();
  });

  it('verifies refunded payments and rejects malformed or excessive refund amounts', () => {
    const payment = { id: 123, status: 'refunded', currency_id: 'ARS', transaction_amount: 10.29, external_reference: '42' };
    expect(paymentMatchesOrder(payment, '123', 42, 1029)).toBe(true);
    expect(refundAmountCents(3.25, 1029)).toBe(325);
    expect(refundAmountCents(10.29, 1029)).toBe(1029);
    for (const value of [undefined, -1, 10.3, 0.001, '3.25', NaN]) {
      expect(refundAmountCents(value, 1029)).toBeNull();
    }
  });

  it('classifies late, additional, legacy replay and refunded payments conservatively', () => {
    expect(classifyPayment({ status: 'pending', mpPaymentId: null }, '123', 0)).toEqual({ reconciliationReason: null, mayFulfill: true });
    expect(classifyPayment({ status: 'cancelled', mpPaymentId: null }, '123', 0)).toEqual({ reconciliationReason: 'late_or_duplicate', mayFulfill: false });
    expect(classifyPayment({ status: 'confirmed', mpPaymentId: '122' }, '123', 0)).toEqual({ reconciliationReason: 'late_or_duplicate', mayFulfill: false });
    expect(classifyPayment({ status: 'confirmed', mpPaymentId: '123' }, '123', 0)).toEqual({ reconciliationReason: null, mayFulfill: false });
    expect(classifyPayment({ status: 'pending', mpPaymentId: null }, '123', 25)).toEqual({ reconciliationReason: 'refund', mayFulfill: false });
    expect(classifyPayment({ status: 'pending', mpPaymentId: null }, '123', 0, true)).toEqual({ reconciliationReason: 'late_or_duplicate', mayFulfill: false });
  });
});
