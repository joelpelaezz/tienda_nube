import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/shipping', () => ({
  getShippingQuotes: vi.fn(async () => [{ methodCode: 'standard', cost: 1200 }]),
  isValidPostalCode: (value: string) => /^[A-Z]?\d{4}$/.test(value.trim().toUpperCase().replace(/[\s-]/g, '')),
  normalizePostalCode: (value: string) => value.trim().toUpperCase().replace(/[\s-]/g, ''),
}));

import { POST } from './route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/shipping/quote', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/shipping/quote', () => {
  it('normalizes the postal code and returns quotes', async () => {
    const response = await POST(request({ postalCode: ' a-4000 ', subtotal: 5000 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      postalCode: 'A4000',
      quotes: [{ methodCode: 'standard', cost: 1200 }],
    });
  });

  it('returns 400 for an invalid postal code', async () => {
    const response = await POST(request({ postalCode: '12', subtotal: 5000 }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Ingresá un código postal válido.' });
  });

  it('returns 400 for a negative subtotal', async () => {
    const response = await POST(request({ postalCode: '4000', subtotal: -1 }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'El subtotal no es válido.' });
  });
});
