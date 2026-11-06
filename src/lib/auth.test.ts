import { beforeEach, describe, expect, it, vi } from 'vitest';

// C4-TRACE: page authorization uses the same authenticated session as actions/APIs.
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));

import { auth } from '@/auth';
import { requireAdminPage } from './auth';

describe('admin page session guard', () => {
  beforeEach(() => vi.resetAllMocks());

  it('redirects missing sessions and customers to separate public routes', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    await expect(requireAdminPage()).rejects.toThrow('redirect:/ingresar');
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: '2', role: 'customer' } } as never);
    await expect(requireAdminPage()).rejects.toThrow('redirect:/');
  });

  it('accepts a verified admin session', async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: '1', role: 'admin' } } as never);
    await expect(requireAdminPage()).resolves.toEqual({ userId: '1', role: 'admin' });
  });
});
