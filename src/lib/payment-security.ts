import { createHmac, timingSafeEqual } from 'crypto';

// C4-TRACE: shared fail-closed primitives for payment identity, amounts and cron bounds.
export function parsePositiveId(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value);
  if (!/^[1-9]\d*$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

export function verifyMercadoPagoSignature({ secret, signature, requestId, dataId }: {
  secret: string | undefined; signature: string | null; requestId: string | null; dataId: string | null;
}): boolean {
  if (!secret?.trim() || !signature || !requestId || !dataId || !/^[a-zA-Z0-9]+$/.test(dataId)) return false;
  const fields = new Map<string, string>();
  for (const part of signature.split(',')) {
    const match = /^\s*(ts|v1)\s*=\s*([^\s,]+)\s*$/.exec(part);
    if (!match || fields.has(match[1])) return false;
    fields.set(match[1], match[2]);
  }
  const ts = fields.get('ts');
  const hash = fields.get('v1');
  if (!ts || !/^\d+$/.test(ts) || !hash || !/^[a-fA-F0-9]{64}$/.test(hash)) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest();
  return timingSafeEqual(expected, Buffer.from(hash, 'hex'));
}

export function paymentMatchesOrder(payment: Record<string, unknown>, paymentId: string, orderId: number, total: number): boolean {
  if (String(payment.id) !== paymentId || !['approved', 'refunded'].includes(String(payment.status)) || payment.currency_id !== 'ARS' ||
      payment.external_reference !== String(orderId) || !Number.isSafeInteger(total) || total <= 0 ||
      typeof payment.transaction_amount !== 'number' || !Number.isFinite(payment.transaction_amount)) return false;
  const amount = String(payment.transaction_amount);
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) return false;
  const cents = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents === total;
}

// Only known non-financial states can be acknowledged without reconciliation.
export function providerStatusDisposition(status: unknown): 'process' | 'ignore' | 'chargeback' | 'review' {
  if (status === 'approved' || status === 'refunded') return 'process';
  if (['pending', 'in_process', 'in_mediation', 'authorized', 'rejected', 'cancelled'].includes(String(status))) {
    // Mediation may result in a financial reversal and warrants review.
    return status === 'in_mediation' ? 'review' : 'ignore';
  }
  return status === 'charged_back' ? 'chargeback' : 'review';
}

// C4-TRACE: never round provider money; incomplete or impossible refund data is retried.
export function refundAmountCents(value: unknown, total: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents <= total ? cents : null;
}

// C4-TRACE: fulfillment is only attempted once, for a new unrefunded payment on an unpaid pending order.
export function classifyPayment(order: { status: string; mpPaymentId: string | null }, paymentId: string, refundedAmount: number, hasOtherPayment = false) {
  const legacyReplay = order.mpPaymentId === paymentId;
  const exception = order.status !== 'pending' || !!order.mpPaymentId || hasOtherPayment;
  return {
    reconciliationReason: refundedAmount > 0 ? 'refund' : exception && !legacyReplay ? 'late_or_duplicate' : null,
    mayFulfill: refundedAmount === 0 && !exception,
  };
}

export function parseExpiryAge(value: string | null): number | null {
  if (value === null) return 30;
  if (!/^[1-9]\d*$/.test(value)) return null;
  const age = Number(value);
  return Number.isSafeInteger(age) && age >= 30 && age <= 10080 ? age : null;
}
