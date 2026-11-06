import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { shippingMethods } from '@/drizzle/schema';

// C4-TRACE: storefronts need active display fields, never the admin rules/configuration.
export async function getPublicShippingMethods() {
  return db.select({
    id: shippingMethods.id,
    code: shippingMethods.code,
    name: shippingMethods.name,
    carrier: shippingMethods.carrier,
    estimatedDays: shippingMethods.estimatedDays,
    position: shippingMethods.position,
  }).from(shippingMethods).where(eq(shippingMethods.isActive, true)).orderBy(asc(shippingMethods.position));
}
