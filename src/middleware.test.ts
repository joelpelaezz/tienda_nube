import { afterEach, describe, expect, it, vi } from 'vitest';
import { encode } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import { config, middleware } from './middleware';

// C4-TRACE: exercise real Auth.js encrypted sessions at the admin request boundary.
const secret = 'test-only-secret-with-sufficient-length';
const cookieName = 'authjs.session-token';

async function request(path: string, cookie?: string) {
  return middleware(new NextRequest(`http://localhost${path}`, {
    headers: cookie ? { cookie } : {},
  }));
}

async function session(role: string, options: { secret?: string; maxAge?: number; name?: string } = {}) {
  const name = options.name ?? cookieName;
  const token = await encode({ token: { id: '1', role }, secret: options.secret ?? secret, salt: name, maxAge: options.maxAge });
  return `${name}=${token}`;
}

describe('admin page authorization', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('covers nested admin routes without intercepting the login page', () => {
    expect(config.matcher).toContain('/admin/:path*');
    expect(config.matcher).not.toContain('/ingresar');
  });

  it('redirects anonymous, forged, wrong-secret and expired sessions to login', async () => {
    vi.stubEnv('AUTH_SECRET', secret);
    for (const cookie of [undefined, `${cookieName}=forged`, await session('admin', { secret: 'wrong-secret' }), await session('admin', { maxAge: -60 })]) {
      const response = await request('/admin/clientes/123', cookie);
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost/ingresar?callbackUrl=%2Fadmin%2Fclientes%2F123');
    }
  });

  it('redirects customers to the public home and admits valid admins', async () => {
    vi.stubEnv('AUTH_SECRET', secret);
    const customer = await request('/admin/ventas', await session('customer'));
    expect(customer.headers.get('location')).toBe('http://localhost/');
    const admin = await request('/admin/ventas', await session('admin'));
    expect(admin.headers.get('x-middleware-next')).toBe('1');
  });

  it('accepts secure and chunked admin cookies and fails closed without a secret', async () => {
    vi.stubEnv('AUTH_SECRET', secret);
    const secureName = '__Secure-authjs.session-token';
    expect((await request('/admin', await session('admin', { name: secureName }))).headers.get('x-middleware-next')).toBe('1');
    const cookie = await session('admin');
    const value = cookie.slice(cookieName.length + 1);
    const chunked = `${cookieName}.0=${value.slice(0, 50)}; ${cookieName}.1=${value.slice(50)}`;
    expect((await request('/admin', chunked)).headers.get('x-middleware-next')).toBe('1');
    vi.stubEnv('AUTH_SECRET', '');
    vi.stubEnv('NEXTAUTH_SECRET', '');
    expect((await request('/admin', cookie)).headers.get('location')).toContain('/ingresar');
  });

  it('does not lock the login page even with a forged cookie', async () => {
    expect((await request('/ingresar', `${cookieName}=forged`)).headers.get('x-middleware-next')).toBe('1');
  });
});
