import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shippingMethods, shippingRules } from '@/drizzle/schema';

const { db } = vi.hoisted(() => ({ db: {
  select: vi.fn(),
} }));

vi.mock('@/lib/db', () => ({ db }));

import { getShippingQuotes, isValidPostalCode, normalizePostalCode, shippingProvider } from './shipping';

const method = {
  id: 1,
  code: 'standard',
  name: 'Envío estándar',
  carrier: 'Correo',
  baseCost: 1200,
  freeFrom: null,
  estimatedDays: '3 a 5 días',
  isActive: true,
  position: 0,
};

function mockDatabase(methods: typeof method[], rules: Array<Record<string, unknown>>) {
  db.select.mockImplementation(() => ({
    from: (table: unknown) => {
      if (table === shippingMethods) {
        return {
          where: () => ({ orderBy: async () => methods }),
        };
      }

      return { orderBy: async () => rules };
    },
  }));
}

describe('shipping helpers', () => {
  it('normalizes postal codes', () => {
    expect(normalizePostalCode('  a-4000 ')).toBe('A4000');
  });

  it('accepts Argentine numeric and CPA postal codes', () => {
    expect(isValidPostalCode('4000')).toBe(true);
    expect(isValidPostalCode('A4000')).toBe(true);
    expect(isValidPostalCode('400')).toBe(false);
  });
});

describe('RulesShippingProvider', () => {
  beforeEach(() => db.select.mockReset());

  it('uses the most specific active postal rule', async () => {
    mockDatabase([method], [
      { id: 1, shippingMethodId: 1, postalPrefix: '', cost: 1200, freeFrom: null, estimatedDays: '5 días', name: 'General', isActive: true, position: 0 },
      { id: 2, shippingMethodId: 1, postalPrefix: 'A4', cost: 800, freeFrom: null, estimatedDays: '3 días', name: 'Noroeste', isActive: true, position: 1 },
    ]);

    const quotes = await shippingProvider.quote('a-4000', 5000);

    expect(quotes).toEqual([expect.objectContaining({ cost: 800, ruleName: 'Noroeste', estimatedDays: '3 días' })]);
  });

  it('returns no quote when configured rules are all inactive', async () => {
    mockDatabase([method], [
      { id: 1, shippingMethodId: 1, postalPrefix: '', cost: 1200, freeFrom: null, estimatedDays: '5 días', name: 'General', isActive: false, position: 0 },
    ]);

    expect(await shippingProvider.quote('4000', 5000)).toEqual([]);
  });

  it('applies free shipping threshold from the matching rule', async () => {
    mockDatabase([method], [
      { id: 1, shippingMethodId: 1, postalPrefix: '', cost: 1200, freeFrom: 5000, estimatedDays: '5 días', name: 'General', isActive: true, position: 0 },
    ]);

    const quotes = await shippingProvider.quote('4000', 5000);

    expect(quotes[0].cost).toBe(0);
  });

  it('rejects invalid input before querying the provider', async () => {
    expect(await getShippingQuotes('12', 1000)).toEqual([]);
    expect(await getShippingQuotes('4000', -1)).toEqual([]);
    expect(db.select).not.toHaveBeenCalled();
  });
});
