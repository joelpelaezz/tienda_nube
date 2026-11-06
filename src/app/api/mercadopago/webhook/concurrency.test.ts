import { createHmac } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { orders, orderItems, orderPayments, paymentExceptions } from '@/drizzle/schema';

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: mocks }));
import { POST } from './route';

function request() {
  const hash = createHmac('sha256', 'secret').update('id:123;request-id:req;ts:1;').digest('hex');
  return new NextRequest('http://localhost/api/mercadopago/webhook?data.id=123', {
    method: 'POST', headers: { 'x-signature': `ts=1,v1=${hash}`, 'x-request-id': 'req' },
    body: JSON.stringify({ type: 'payment', data: { id: '123' } }),
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}

const approved = { id: 123, status: 'approved', external_reference: '42', currency_id: 'ARS', transaction_amount: 10 };
const refunded = { ...approved, status: 'refunded', transaction_amount_refunded: 10 };
const chargeback = { id: 123, status: 'charged_back' };

describe('provider payment serialization', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MERCADOPAGO_WEBHOOK_SECRET = 'secret';
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'token';
  });

  it.each([
    ['chargeback', chargeback, approved, 'pending', 'chargeback'],
    ['refund', refunded, approved, 'pending', 'refund'],
    ['approval', approved, chargeback, 'confirmed', 'chargeback'],
    ['approval followed by refund', approved, refunded, 'confirmed', 'refund'],
  ])('serializes %s before an overlapping notification', async (_name, first, second, status, reason) => {
    // Model the advisory lock and persistence independently of request execution.
    let lock = Promise.resolve();
    const state: { status: string; payment: any; exceptions: string[]; confirmations: number } = {
      status: 'pending', payment: null, exceptions: [], confirmations: 0,
    };
    mocks.transaction.mockImplementation(async (fn) => {
      let release = () => {};
      const tx: any = {
        execute: async () => {
          const previous = lock;
          lock = new Promise<void>(r => { release = r; });
          await previous;
        },
        select: () => ({ from: (table: unknown) => {
          const rows = () => table === orders ? [{ status: state.status, total: 1000, mpPaymentId: state.status === 'confirmed' ? '123' : null }]
            : table === orderPayments ? (state.payment ? [state.payment] : [])
            : table === paymentExceptions ? state.exceptions.map(() => ({ id: '123' })) : [];
          return { where: () => ({ limit: async () => rows(), for: async () => rows(), then: (resolve: (value: unknown) => void) => resolve(rows()) }),
            leftJoin: () => ({ where: async () => table === orderItems ? [] : rows() }) };
        } }),
        insert: (table: unknown) => ({ values: (value: any) => ({
          onConflictDoNothing: () => {
            if (table === paymentExceptions) { state.exceptions.push(value.reason); return Promise.resolve(); }
            const inserted = !state.payment;
            if (inserted) state.payment = { ...value, id: value.providerPaymentId };
            return { returning: async () => inserted ? [{ id: '123' }] : [] };
          },
        }) }),
        update: (table: unknown) => ({ set: (value: any) => ({ where: () => {
          if (table === orders) { state.status = value.status; state.confirmations++; }
          if (table === orderPayments) Object.assign(state.payment, value);
          return { returning: async () => [{ id: 42 }], then: (resolve: () => void) => resolve() };
        } }) }),
        transaction: async (nested: (tx: unknown) => Promise<void>) => nested(tx),
      };
      try { return await fn(tx); } finally { release(); }
    });

    const firstFetch = deferred<void>();
    const enteredFetch = deferred<void>();
    const fetchMock = vi.fn().mockImplementationOnce(async () => {
      enteredFetch.resolve();
      await firstFetch.promise;
      return { ok: true, json: async () => first };
    }).mockResolvedValueOnce({ ok: true, json: async () => second });
    vi.stubGlobal('fetch', fetchMock);
    const a = POST(request());
    await enteredFetch.promise;
    const b = POST(request());
    // Let the second transaction reach its lock while the first request is paused.
    await vi.waitFor(() => expect(mocks.transaction).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    firstFetch.resolve();
    expect((await a).status).toBe(200);
    expect((await b).status).toBe(200);
    expect(state.status).toBe(status);
    expect(state.confirmations).toBe(status === 'confirmed' ? 1 : 0);
    expect(reason === 'refund' ? state.payment?.reconciliationReason : state.exceptions).toContain(reason);
  });
});
