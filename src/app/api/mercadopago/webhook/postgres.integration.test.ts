// Opt-in disposable-container audit. This synthetic subset is NOT migration validation.
// Nothing is dropped: each invocation leaves a uniquely named schema for inspection.
import { execFileSync } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const mocked = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('@/lib/db', () => ({ get db() { return mocked.db; } }));
vi.mock('server-only', () => ({}));
import { POST } from './route';
import { expirePendingOrders } from '../../orders/expire/actions';

const enabled = process.env.PAYMENT_AUDIT_RUN === '1';
const schema = `payment_audit_${randomBytes(8).toString('hex')}`;
let client: ReturnType<typeof postgres>;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(r => { resolve = r; });
  return { promise, resolve };
}

function request(id: string) {
  const hash = createHmac('sha256', 'audit-secret').update(`id:${id};request-id:req;ts:1;`).digest('hex');
  return new NextRequest(`http://localhost/api/mercadopago/webhook?data.id=${id}`, {
    method: 'POST', headers: { 'x-signature': `ts=1,v1=${hash}`, 'x-request-id': 'req' },
    body: JSON.stringify({ type: 'payment', data: { id } }),
  });
}

async function seed(total = 1000) {
  const [order] = await client`insert into orders (order_number, total, created_at) values (${randomBytes(8).toString('hex')}, ${total}, now()) returning id`;
  const [product] = await client`insert into products (stock, reserved_stock, product_type) values (10, 2, 'physical') returning id`;
  await client`insert into order_items (order_id, product_id, quantity, stock_reserved) values (${order.id}, ${product.id}, 2, true)`;
  return { orderId: order.id as number, productId: product.id as number };
}

function payment(id: string, orderId: number, status = 'approved', total = 10) {
  return { id, status, external_reference: String(orderId), currency_id: 'ARS', transaction_amount: total,
    ...(status === 'refunded' ? { transaction_amount_refunded: total } : {}) };
}

async function snapshot(orderId: number, productId: number) {
  const [order] = await client`select status, mp_payment_id from orders where id = ${orderId}`;
  const [product] = await client`select stock, reserved_stock from products where id = ${productId}`;
  const payments = await client`select provider_payment_id, refunded_amount, provider_status, reconciliation_reason from order_payments where order_id = ${orderId}`;
  const movements = await client`select * from product_stock_movements where product_id = ${productId}`;
  return { order, product, payments, movements };
}

describe.skipIf(!enabled)('disposable PostgreSQL payment audit', () => {
  beforeAll(async () => {
    // Fail closed: verify the named Docker container and exact port mapping before connecting.
    const inspection = JSON.parse(execFileSync('docker', ['inspect', 'tienda-nube-payment-audit-20261031'], { encoding: 'utf8' }))[0];
    const ports = inspection?.NetworkSettings?.Ports?.['5432/tcp'];
    if (inspection?.Name !== '/tienda-nube-payment-audit-20261031' || !inspection?.State?.Running ||
        inspection?.Config?.Labels?.purpose !== 'tienda-nube-payment-audit' || ports?.length !== 1 ||
        ports[0].HostIp !== '127.0.0.1' || ports[0].HostPort !== '32768') throw new Error('Unauthorized PostgreSQL target');
    const admin = postgres({ host: '127.0.0.1', port: 32768, database: 'payment_audit', username: 'audit_user', password: 'audit_local_only', max: 1, ssl: false });
    try {
      const [identity] = await admin`select current_database() as db, current_user as usr, inet_server_port() as port`;
      if (identity.db !== 'payment_audit' || identity.usr !== 'audit_user' || identity.port !== 5432) throw new Error('Unexpected database identity');
      await admin.unsafe(`create schema "${schema}"`);
    } finally { await admin.end(); }
    client = postgres({ host: '127.0.0.1', port: 32768, database: 'payment_audit', username: 'audit_user', password: 'audit_local_only', max: 10, ssl: false, connection: { search_path: schema, application_name: schema } });
    // Deliberately minimal; no historical migration, production schema, or cleanup is run.
    await client.unsafe(`
      create table orders (id serial primary key, order_number text not null unique, status text not null default 'pending', total integer not null, mp_payment_id text, notes text, created_at timestamp default now());
      create table products (id serial primary key, stock integer not null, reserved_stock integer not null, product_type text);
      create table product_variants (id serial primary key, stock integer, reserved_stock integer);
      create table order_items (id serial primary key, order_id integer not null, product_id integer, variant_id integer, quantity integer not null, stock_reserved boolean not null);
      create table order_payments (provider_payment_id text primary key, order_id integer not null references orders(id), amount integer not null, refunded_amount integer not null default 0, provider_status text not null, reconciliation_reason text, created_at timestamp not null default now(), updated_at timestamp not null default now());
      create table payment_exceptions (provider_payment_id text not null, reason text not null, order_id integer references orders(id), created_at timestamp not null default now(), primary key(provider_payment_id, reason));
      create table product_stock_movements (id serial primary key, product_id integer not null, movement_type text not null, quantity integer not null, stock_after integer not null, created_at timestamp default now(), created_by integer);
      create table stock_movements (id serial primary key, variant_id integer not null, movement_type text not null, quantity integer not null, stock_after integer not null, created_at timestamp default now(), created_by integer);
    `);
    mocked.db = drizzle(client);
    vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', 'audit-secret');
    vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', 'audit-token');
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected provider request'); }));
    console.info(`Synthetic PostgreSQL audit schema: ${schema}`);
  }, 20000);

  afterAll(async () => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); if (client) await client.end(); });

  it.each([
    ['duplicate approval', 'approved', 'approved', 'confirmed', null],
    ['refund then approval', 'refunded', 'approved', 'pending', 'refund'],
    ['approval then refund', 'approved', 'refunded', 'confirmed', 'refund'],
    ['chargeback then approval', 'charged_back', 'approved', 'pending', 'chargeback'],
    ['approval then chargeback', 'approved', 'charged_back', 'confirmed', 'chargeback'],
  ])('serializes %s using a real advisory lock', async (_name, first, second, expectedStatus, reason) => {
    const { orderId, productId } = await seed();
    const id = String(100000 + orderId);
    const entered = deferred(); const release = deferred();
    const fetchMock = vi.fn().mockImplementationOnce(async () => { entered.resolve(); await release.promise; return { ok: true, json: async () => payment(id, orderId, first) }; })
      .mockImplementationOnce(async () => ({ ok: true, json: async () => payment(id, orderId, second) }));
    vi.stubGlobal('fetch', fetchMock);
    const a = POST(request(id));
    await entered.promise;
    const b = POST(request(id));
    try {
      await vi.waitFor(async () => {
        const [row] = await client`select count(*)::int as n from pg_locks l join pg_stat_activity a on a.pid = l.pid where a.application_name = ${schema} and l.locktype = 'advisory' and not l.granted`;
        expect(row.n).toBeGreaterThan(0);
      }, { timeout: 5000 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally { release.resolve(); }
    expect((await a).status).toBe(200); expect((await b).status).toBe(200);
    const state = await snapshot(orderId, productId);
    expect(state.order.status).toBe(expectedStatus);
    expect(state.movements).toHaveLength(expectedStatus === 'confirmed' ? 1 : 0);
    expect(state.product).toMatchObject(expectedStatus === 'confirmed' ? { stock: 8, reserved_stock: 0 } : { stock: 10, reserved_stock: 2 });
    if (reason === 'refund') expect(state.payments[0]).toMatchObject({ refunded_amount: 1000, provider_status: 'refunded', reconciliation_reason: 'refund' });
    if (reason === 'chargeback') expect(await client`select reason from payment_exceptions where provider_payment_id = ${id}`).toHaveLength(1);
    if (!reason) expect(state.payments).toHaveLength(1);
  }, 15000);

  it('serializes different payment IDs on the same order row', async () => {
    const { orderId, productId } = await seed();
    const ids = [String(200000 + orderId * 2), String(200001 + orderId * 2)];
    const locked = deferred(); const release = deferred();
    const holder = client.begin(async tx => { await tx`select id from orders where id = ${orderId} for update`; locked.resolve(); await release.promise; });
    await locked.promise;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => payment(url.split('/').pop()!, orderId) })));
    const requests = ids.map(id => POST(request(id)));
    try {
      await vi.waitFor(async () => {
        const [row] = await client`select count(*)::int as n from pg_stat_activity where application_name = ${schema} and wait_event_type = 'Lock'`;
        expect(row.n).toBeGreaterThanOrEqual(2);
      }, { timeout: 5000 });
    } finally { release.resolve(); await holder; }
    expect((await Promise.all(requests)).map(response => response.status)).toEqual([200, 200]);
    const state = await snapshot(orderId, productId);
    expect(state.order.status).toBe('confirmed');
    expect(state.product).toMatchObject({ stock: 8, reserved_stock: 0 });
    expect(state.movements).toHaveLength(1);
    expect(state.payments).toHaveLength(2);
    expect(state.payments.filter(p => p.reconciliation_reason === 'late_or_duplicate')).toHaveLength(1);
  }, 15000);

  it('serializes expiry and a late approval on the order row', async () => {
    const { orderId, productId } = await seed();
    await client`update orders set created_at = now() - interval '1 hour' where id = ${orderId}`;
    const id = String(100000 + orderId);
    // Hold the order lock, forcing both real handlers to contend for the same row.
    const locked = deferred(); const release = deferred();
    const holder = client.begin(async tx => { await tx`select id from orders where id = ${orderId} for update`; locked.resolve(); await release.promise; });
    await locked.promise;
    const expiry = expirePendingOrders().then(value => ({ value, error: null }), error => ({ value: null, error }));
    let webhook: Promise<Response> | undefined;
    try {
      await vi.waitFor(async () => {
        const [row] = await client`select count(*)::int as n from pg_stat_activity where application_name = ${schema} and wait_event_type = 'Lock'`;
        const result = await Promise.race([expiry, Promise.resolve(null)]);
        if (result?.error) throw result.error;
        expect(row.n).toBeGreaterThan(0);
      }, { timeout: 5000 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payment(id, orderId) }));
      webhook = POST(request(id));
    } finally { release.resolve(); await holder; }
    const result = await expiry;
    if (result.error) throw result.error;
    expect(result.value!.expired).toBe(1);
    expect((await webhook!).status).toBe(200);
    const state = await snapshot(orderId, productId);
    expect(state.order.status).toBe('cancelled');
    const [expiredOrder] = await client`select notes from orders where id = ${orderId}`;
    expect(expiredOrder.notes).toBe(' [EXPIRED:auto-expired after 30 min]');
    expect(state.product).toMatchObject({ stock: 10, reserved_stock: 0 });
    expect(state.movements).toHaveLength(0);
    expect(state.payments[0].reconciliation_reason).toBe('late_or_duplicate');
  }, 15000);

  it('records an approval arriving after cancellation without consuming stock', async () => {
    const { orderId, productId } = await seed(); const id = String(100000 + orderId);
    await client`update orders set status = 'cancelled' where id = ${orderId}`;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payment(id, orderId) }));
    expect((await POST(request(id))).status).toBe(200);
    const state = await snapshot(orderId, productId);
    expect(state.order.status).toBe('cancelled');
    expect(state.product).toMatchObject({ stock: 10, reserved_stock: 2 });
    expect(state.movements).toHaveLength(0);
    expect(state.payments[0].reconciliation_reason).toBe('late_or_duplicate');
  });

  it('rejects a zero-total provider payment without fulfilling', async () => {
    const { orderId, productId } = await seed(0); const id = String(100000 + orderId);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payment(id, orderId, 'approved', 0) }));
    expect((await POST(request(id))).status).toBe(200);
    const state = await snapshot(orderId, productId);
    expect(state.order.status).toBe('pending'); expect(state.movements).toHaveLength(0);
    expect(await client`select reason from payment_exceptions where provider_payment_id = ${id}`).toMatchObject([{ reason: 'payment_mismatch' }]);
  });
});
