import { describe, expect, it } from 'vitest';
import { getDatabaseUrl } from './db-config';

describe('database connection configuration', () => {
  it('requires POSTGRES_URL in a production runtime', () => {
    expect(() => getDatabaseUrl({ NODE_ENV: 'production', VERCEL_ENV: 'production' }))
      .toThrow('POSTGRES_URL is required for deployed and production runtimes.');
  });

  it('requires POSTGRES_URL in a Preview deployment too', () => {
    expect(() => getDatabaseUrl({ VERCEL_ENV: 'preview' }))
      .toThrow('POSTGRES_URL is required for deployed and production runtimes.');
  });

  it('uses the configured POSTGRES_URL in production', () => {
    expect(getDatabaseUrl({
      NODE_ENV: 'production',
      VERCEL_ENV: 'production',
      POSTGRES_URL: 'postgresql://db.example.com/store',
    })).toBe('postgresql://db.example.com/store');
  });

  it('does not treat a blank production URL as configured', () => {
    expect(() => getDatabaseUrl({
      NODE_ENV: 'production',
      VERCEL_ENV: 'production',
      POSTGRES_URL: '   ',
    })).toThrow('POSTGRES_URL is required for deployed and production runtimes.');
  });

  it('keeps the local default available outside production', () => {
    expect(getDatabaseUrl({ NODE_ENV: 'development' }))
      .toBe('postgresql://postgres:postgres@localhost:5434/tienda_nube');
  });
});
