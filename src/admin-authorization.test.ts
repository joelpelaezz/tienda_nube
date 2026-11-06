import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// C4-TRACE: invoke handlers and server actions directly, bypassing middleware.
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/db', () => {
  const query: Record<string, unknown> = {};
  for (const method of ['from', 'where', 'orderBy', 'innerJoin', 'limit', 'offset', 'values', 'set', 'onConflictDoNothing']) {
    query[method] = vi.fn(() => query);
  }
  query.then = (resolve: (rows: unknown[]) => unknown) => Promise.resolve([]).then(resolve);
  return { db: { select: vi.fn(() => query), selectDistinct: vi.fn(() => query), insert: vi.fn(() => query), update: vi.fn(() => query) } };
});

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { GET as inventory } from '@/app/api/inventory/route';
import { POST as stock } from '@/app/api/inventory/stock/route';
import { GET as productHistory } from '@/app/api/inventory/product-history/route';
import { GET as variantHistory } from '@/app/api/inventory/[variantId]/history/route';
import { POST as availability } from '@/app/api/inventory/availability/route';
import { GET as navigation } from '@/app/api/admin/navigation-stats/route';
import { getInventoryProducts } from '@/app/admin/inventario/actions';
import { createShippingMethod, getShippingConfiguration, saveShippingRule, updateShippingMethod } from '@/app/admin/envios/actions';
import { getContactMessages, updateContactMessageStatus } from '@/app/admin/clientes/mensajes/actions';
import { getNewsletterSubscribers, updateNewsletterSubscriberStatus } from '@/app/admin/suscripciones/actions';
import { middleware } from '@/middleware';

const request = (path: string, body?: unknown) => new NextRequest(`http://localhost${path}`, body === undefined ? undefined : {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});
const routes = [
  ['inventory', () => inventory(request('/api/inventory'))],
  ['product history', () => productHistory(request('/api/inventory/product-history?productId=1'))],
  ['variant history', () => variantHistory(request('/api/inventory/1/history'), { params: Promise.resolve({ variantId: '1' }) })],
  ['navigation stats', () => navigation()],
  ['stock mutation', () => stock(request('/api/inventory/stock', { variantId: 0, newStock: 1 }))],
] as const;

const form = () => {
  const data = new FormData();
  data.set('id', '1'); data.set('code', 'standard'); data.set('name', 'Standard'); data.set('shippingMethodId', '1');
  return data;
};
const actions = [
  ['inventory read', () => getInventoryProducts()],
  ['shipping read', () => getShippingConfiguration()],
  ['shipping create', () => createShippingMethod(form())],
  ['shipping update', () => updateShippingMethod(form())],
  ['shipping rule', () => saveShippingRule(form())],
  ['messages read', () => getContactMessages()],
  ['message update', () => updateContactMessageStatus(form())],
  ['subscriptions read', () => getNewsletterSubscribers()],
  ['subscription update', () => updateNewsletterSubscriberStatus(form())],
] as const;

function session(role: 'anonymous' | 'customer' | 'admin') {
  vi.mocked(auth).mockResolvedValue((role === 'anonymous' ? null : { user: { id: '1', role } }) as never);
}

describe('privileged request and action boundaries', () => {
  beforeEach(() => vi.clearAllMocks());
  for (const [name, invoke] of routes) {
    it(`${name} rejects anonymous and customer requests before database access and admits admins`, async () => {
      for (const [role, status] of [['anonymous', 401], ['customer', 403]] as const) {
        session(role);
        expect((await invoke()).status).toBe(status);
        expect(db.select).not.toHaveBeenCalled();
        expect(db.update).not.toHaveBeenCalled();
      }
      session('admin');
      expect((await invoke()).status).toBe(name === 'stock mutation' ? 400 : 200);
    });
  }
  for (const [name, invoke] of actions) {
    it(`${name} rejects anonymous and customer actions and admits admins`, async () => {
      for (const [role, status] of [['anonymous', 401], ['customer', 403]] as const) {
        session(role);
        await expect(invoke()).rejects.toMatchObject({ status });
        expect(db.select).not.toHaveBeenCalled();
        expect(db.insert).not.toHaveBeenCalled();
        expect(db.update).not.toHaveBeenCalled();
      }
      session('admin');
      await invoke();
      expect(vi.mocked(db.select).mock.calls.length + vi.mocked(db.insert).mock.calls.length + vi.mocked(db.update).mock.calls.length).toBeGreaterThan(0);
    });
  }
  it('allows anonymous availability through middleware and the handler', async () => {
    session('anonymous');
    const req = request('/api/inventory/availability', { items: [{ productId: 123 }] });
    expect((await middleware(req)).headers.get('x-middleware-next')).toBe('1');
    const response = await availability(req);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ availability: { '123:base': 0 } });
    expect(auth).not.toHaveBeenCalled();
  });
});
