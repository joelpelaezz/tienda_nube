import { createHmac } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ insert: vi.fn(), select: vi.fn(), transaction: vi.fn(), execute: vi.fn(), values: vi.fn(), conflict: vi.fn(), limit: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { insert: mocks.insert, select: mocks.select, transaction: mocks.transaction } }));
import { POST } from './route';

function request() {
  const hash = createHmac('sha256', 'secret').update('id:123;request-id:req;ts:1;').digest('hex');
  return new NextRequest('http://localhost/api/mercadopago/webhook?data.id=123', {
    method: 'POST', headers: { 'x-signature': `ts=1,v1=${hash}`, 'x-request-id': 'req' },
    body: JSON.stringify({ type: 'payment', data: { id: '123' } }),
  });
}

describe('payment webhook reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCADOPAGO_WEBHOOK_SECRET = 'secret';
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'token';
    mocks.conflict.mockResolvedValue(undefined);
    mocks.insert.mockReturnValue({ values: mocks.values });
    mocks.values.mockReturnValue({ onConflictDoNothing: mocks.conflict });
    mocks.select.mockReturnValue({ from: () => ({ where: () => ({ limit: mocks.limit }) }) });
    mocks.limit.mockResolvedValue([{ status: 'pending', total: 1000 }]);
    mocks.execute.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(async (fn) => fn(mocks));
  });

  async function send(payment: object) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payment }));
    return POST(request());
  }

  it.each([
    [{ id: 123, status: 'charged_back', secret: 'do-not-store' }, 'chargeback', null],
    [{ id: 123, status: 'unrecognized', secret: 'do-not-store' }, 'provider_state', null],
    [{ id: 123, status: 'approved', external_reference: 'secret!' }, 'invalid_reference', null],
    [{ id: 123, status: 'approved', external_reference: '42', currency_id: 'USD', transaction_amount: 10 }, 'payment_mismatch', 42],
    [{ id: 123, status: 'refunded', external_reference: '42', currency_id: 'ARS', transaction_amount: 10, transaction_amount_refunded: 0 }, 'invalid_refund', 42],
  ])('persists sanitized exception without fulfillment', async (payment, reason, orderId) => {
    expect((await send(payment)).status).toBe(200);
    expect(mocks.values).toHaveBeenCalledWith({ providerPaymentId: '123', reason, orderId });
    expect(mocks.execute).toHaveBeenCalledOnce();
  });

  it('records an unknown order independently of the order table', async () => {
    mocks.limit.mockResolvedValue([]);
    expect((await send({ id: 123, status: 'approved', external_reference: '42' })).status).toBe(200);
    expect(mocks.values).toHaveBeenCalledWith({ providerPaymentId: '123', reason: 'unknown_order', orderId: null });
  });

  it('returns an error for retry if exception persistence fails, without logging details', async () => {
    mocks.conflict.mockRejectedValue(new Error('secret provider payload'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await send({ id: 123, status: 'charged_back' })).status).toBe(500);
    expect(log).toHaveBeenCalledWith('MP webhook processing failed');
    log.mockRestore();
  });
});
