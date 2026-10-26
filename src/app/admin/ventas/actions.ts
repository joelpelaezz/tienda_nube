'use server';

import { db } from '@/lib/db';
import { orderItems, orders, productStockMovements, products, productVariants, stockMovements } from '@/drizzle/schema';
import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';

export async function updateOrderStatus(orderId: number, status: string) {
  await requireAdmin();
  const validStatuses = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
  if (!Number.isInteger(orderId) || orderId <= 0 || !validStatuses.includes(status)) {
    throw new Error('Pedido o estado inválido.');
  }

  await db.transaction(async (tx) => {
    const [order] = await tx.select({ id: orders.id, status: orders.status }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new Error('No encontramos el pedido.');
    if (order.status === status) return;
    if (status === 'pending' && order.status !== 'pending') {
      throw new Error('No se puede reabrir como pendiente un pedido que ya avanzó de estado.');
    }

    if (order.status === 'pending' && status !== 'pending') {
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

        if (status === 'cancelled') {
          if (item.variantId) {
            const [released] = await tx.update(productVariants)
              .set({ reservedStock: sql`${productVariants.reservedStock} - ${item.quantity}` })
              .where(and(eq(productVariants.id, item.variantId), sql`${productVariants.reservedStock} >= ${item.quantity}`))
              .returning({ id: productVariants.id });
            if (!released) throw new Error('No se pudo liberar el stock reservado de una variante.');
          } else {
            if (item.productId == null) throw new Error('El pedido contiene una línea sin producto asociado.');
            const [released] = await tx.update(products)
              .set({ reservedStock: sql`${products.reservedStock} - ${item.quantity}` })
              .where(and(eq(products.id, item.productId), sql`${products.reservedStock} >= ${item.quantity}`))
              .returning({ id: products.id });
            if (!released) throw new Error('No se pudo liberar el stock reservado del producto.');
          }
          continue;
        }

        if (item.variantId) {
          const [variant] = await tx.update(productVariants)
            .set({
              stock: sql`${productVariants.stock} - ${item.quantity}`,
              reservedStock: sql`${productVariants.reservedStock} - ${item.quantity}`,
            })
            .where(and(
              eq(productVariants.id, item.variantId),
              sql`${productVariants.stock} >= ${item.quantity}`,
              sql`${productVariants.reservedStock} >= ${item.quantity}`,
            ))
            .returning({ stock: productVariants.stock });
          if (!variant) throw new Error('No se pudo descontar el stock reservado de una variante.');
          await tx.insert(stockMovements).values({
            variantId: item.variantId,
            movementType: 'venta',
            quantity: -item.quantity,
            stockAfter: variant.stock ?? 0,
          });
        } else {
          if (item.productId == null) throw new Error('El pedido contiene una línea sin producto asociado.');
          const [product] = await tx.update(products)
            .set({
              stock: sql`${products.stock} - ${item.quantity}`,
              reservedStock: sql`${products.reservedStock} - ${item.quantity}`,
            })
            .where(and(
              eq(products.id, item.productId),
              sql`${products.stock} >= ${item.quantity}`,
              sql`${products.reservedStock} >= ${item.quantity}`,
            ))
            .returning({ stock: products.stock });
          if (!product) throw new Error('No se pudo descontar el stock reservado del producto.');
          await tx.insert(productStockMovements).values({
            productId: item.productId,
            movementType: 'venta',
            quantity: -item.quantity,
            stockAfter: product.stock,
          });
        }
      }

      await tx.update(orderItems).set({ stockReserved: false }).where(eq(orderItems.orderId, orderId));
    }

    await tx.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, orderId));
  });

  revalidatePath(`/admin/ventas`);
  revalidatePath(`/admin/ventas/${orderId}`);
  revalidatePath('/admin/inventario');
}
