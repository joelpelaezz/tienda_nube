import 'server-only';

import { db } from '@/lib/db';
import { orders, orderItems, products, productVariants } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { parseExpiryAge } from '@/lib/payment-security';

/**
 * Expires pending orders older than `maxAgeMinutes` and releases their reserved stock.
 *
 * Safety: Only expires orders in 'pending' status.
 * Cancellation reason is appended to notes so admins can audit what happened.
 */
export async function expirePendingOrders(maxAgeMinutes = 30): Promise<{
  expired: number;
  releasedItems: number;
}> {
  // C4-TRACE: this server-only module is not a remotely callable server action.
  if (parseExpiryAge(String(maxAgeMinutes)) === null) throw new Error('Invalid expiry age');
  // Find pending orders older than cutoff
  const expiredOrders = await db
    .select({ id: orders.id, orderNumber: orders.orderNumber })
    .from(orders)
    .where(
      and(
        eq(orders.status, 'pending'),
        sql`${orders.createdAt} < NOW() - make_interval(secs => ${maxAgeMinutes} * 60)`
      )
    );

  if (expiredOrders.length === 0) {
    return { expired: 0, releasedItems: 0 };
  }

  let totalReleased = 0;

  let expired = 0;
  for (const orderId of expiredOrders.map((o) => o.id)) {
    const released = await db.transaction(async (tx) => {
      // Claim the pending state before releasing stock, serialized with payment confirmation.
      const [claimed] = await tx.update(orders).set({
        status: 'cancelled',
        // C4-TRACE: bind the age outside the SQL literal so PostgreSQL can type it.
        notes: sql`COALESCE(${orders.notes}, '') || ' [EXPIRED:auto-expired after ' || ${maxAgeMinutes}::text || ' min]'`,
      }).where(and(eq(orders.id, orderId), eq(orders.status, 'pending'),
        sql`${orders.createdAt} < NOW() - make_interval(secs => ${maxAgeMinutes} * 60)`)).returning({ id: orders.id });
      if (!claimed) return null;
      let releasedItems = 0;
      const items = await tx
        .select({
          variantId: orderItems.variantId,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          stockReserved: orderItems.stockReserved,
          productType: products.productType,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, orderId));

      for (const item of items) {
        if (!item.stockReserved || item.productType === 'digital' || !item.quantity) continue;
        if (item.variantId) {
          const [updated] = await tx
            .update(productVariants)
            .set({ reservedStock: sql`${productVariants.reservedStock} - ${item.quantity}` })
            .where(and(
              eq(productVariants.id, item.variantId),
              sql`${productVariants.reservedStock} >= ${item.quantity}`
            )).returning({ id: productVariants.id });
          if (!updated) throw new Error('Failed to release variant reservation');
          releasedItems++;
        } else {
          if (item.productId == null) throw new Error('Missing reserved product');
          const [updated] = await tx
            .update(products)
            .set({ reservedStock: sql`${products.reservedStock} - ${item.quantity}` })
            .where(and(
              eq(products.id, item.productId),
              sql`${products.reservedStock} >= ${item.quantity}`,
            )).returning({ id: products.id });
          if (!updated) throw new Error('Failed to release product reservation');
          releasedItems++;
        }
      }

      await tx.update(orderItems).set({ stockReserved: false }).where(eq(orderItems.orderId, orderId));
      return releasedItems;
    });
    if (released !== null) { expired++; totalReleased += released; }
  }

  return { expired, releasedItems: totalReleased };
}
