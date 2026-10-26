'use server';

import { db } from '@/lib/db';
import { orders, orderItems, products, productVariants } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

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

  for (const orderId of expiredOrders.map((o) => o.id)) {
    // Get items with variant reservations
    const items = await db
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

    // Release reservedStock
    for (const item of items) {
      if (!item.stockReserved || item.productType === 'digital' || !item.quantity) continue;
      if (item.variantId) {
        await db
          .update(productVariants)
          .set({ reservedStock: sql`${productVariants.reservedStock} - ${item.quantity}` })
          .where(
            and(
              eq(productVariants.id, item.variantId),
              sql`${productVariants.reservedStock} >= ${item.quantity}`
            )
          );
        totalReleased++;
      } else {
        if (item.productId == null) continue;
        await db
          .update(products)
          .set({ reservedStock: sql`${products.reservedStock} - ${item.quantity}` })
          .where(and(
            eq(products.id, item.productId),
            sql`${products.reservedStock} >= ${item.quantity}`,
          ));
        totalReleased++;
      }
    }

    await db.update(orderItems).set({ stockReserved: false }).where(eq(orderItems.orderId, orderId));

    // Mark order as cancelled with audit trail
    await db
      .update(orders)
      .set({
        status: 'cancelled',
        notes: sql`COALESCE(${orders.notes}, '') || ' [EXPIRED:auto-expired after ${maxAgeMinutes} min]'`,
      })
      .where(eq(orders.id, orderId));
  }

  return { expired: expiredOrders.length, releasedItems: totalReleased };
}
