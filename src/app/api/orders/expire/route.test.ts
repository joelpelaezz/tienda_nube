import { beforeEach, describe, expect, it, vi } from 'vitest';

// C4-TRACE: the externally reachable cron endpoint never runs without authorization and bounded age.
vi.mock('./actions', () => ({ expirePendingOrders: vi.fn().mockResolvedValue({ expired: 0, releasedItems: 0 }) }));
import { expirePendingOrders } from './actions';
import { POST } from './route';

describe('order expiry endpoint', () => {
  beforeEach(() => { vi.clearAllMocks(); delete process.env.CRON_SECRET; });

  it('fails closed when the secret is absent or incorrect', async () => {
    expect((await POST(new Request('http://localhost/api/orders/expire'))).status).toBe(401);
    process.env.CRON_SECRET = 'secret';
    expect((await POST(new Request('http://localhost/api/orders/expire', { headers: { authorization: 'Bearer wrong' } }))).status).toBe(401);
    expect(expirePendingOrders).not.toHaveBeenCalled();
  });

  it('rejects unsafe ages before invoking expiry', async () => {
    process.env.CRON_SECRET = 'secret';
    const request = new Request('http://localhost/api/orders/expire?maxAgeMinutes=0', { headers: { authorization: 'Bearer secret' } });
    expect((await POST(request)).status).toBe(400);
    expect(expirePendingOrders).not.toHaveBeenCalled();
  });
});
