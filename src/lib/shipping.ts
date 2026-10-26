import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { shippingMethods, shippingRules } from '@/drizzle/schema';

export type ShippingQuote = {
  methodCode: string;
  methodName: string;
  carrier: string;
  cost: number;
  estimatedDays: string | null;
  ruleName: string | null;
};

export function normalizePostalCode(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]/g, '');
}

export function isValidPostalCode(value: string) {
  const normalized = normalizePostalCode(value);
  return /^[A-Z]?\d{4}$/.test(normalized);
}

export interface ShippingProvider {
  quote(postalCode: string, subtotal: number): Promise<ShippingQuote[]>;
}

class RulesShippingProvider implements ShippingProvider {
  async quote(postalCode: string, subtotal: number) {
    const normalizedPostalCode = normalizePostalCode(postalCode);
    const methods = await db
      .select()
      .from(shippingMethods)
      .where(eq(shippingMethods.isActive, true))
      .orderBy(asc(shippingMethods.position));
    const rules = await db
      .select()
      .from(shippingRules)
      .orderBy(asc(shippingRules.position));

    return methods.flatMap((method) => {
      const configuredRules = rules.filter((rule) => rule.shippingMethodId === method.id);
      const methodRules = configuredRules
        .filter((rule) => rule.isActive)
        .filter((rule) => !rule.postalPrefix || normalizedPostalCode.startsWith(normalizePostalCode(rule.postalPrefix)))
        .sort((a, b) => normalizePostalCode(b.postalPrefix).length - normalizePostalCode(a.postalPrefix).length);
      const rule = methodRules[0];
      if (configuredRules.length > 0 && !rule) return [];
      const cost = rule?.cost ?? method.baseCost;
      const freeFrom = rule?.freeFrom ?? method.freeFrom;

      return [{
        methodCode: method.code,
        methodName: method.name,
        carrier: method.carrier,
        cost: freeFrom !== null && freeFrom !== undefined && subtotal >= freeFrom ? 0 : cost,
        estimatedDays: rule?.estimatedDays ?? method.estimatedDays,
        ruleName: rule?.name ?? null,
      }];
    });
  }
}

export const shippingProvider: ShippingProvider = new RulesShippingProvider();

export async function getShippingQuotes(postalCode: string, subtotal: number) {
  if (!isValidPostalCode(postalCode) || !Number.isFinite(subtotal) || subtotal < 0) return [];
  return shippingProvider.quote(postalCode, subtotal);
}
