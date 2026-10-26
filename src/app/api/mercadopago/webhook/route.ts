import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, products, productStockMovements, productVariants, stockMovements } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headers = req.headers;

    // Verify webhook signature (optional but recommended)
    const signature = headers.get('x-signature');
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const [ts, hash] = signature.split(',');
      const expectedHash = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');
      if (hash !== expectedHash) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const data = JSON.parse(body);

    // Handle different event types
    if (data.type === 'payment') {
      const paymentId = data.data?.id;

      if (!paymentId) {
        return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
      }

      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!accessToken) {
        return NextResponse.json({ error: 'MP not configured' }, { status: 500 });
      }

      // Get payment details from Mercado Pago
      const paymentRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!paymentRes.ok) {
        return NextResponse.json({ error: 'Failed to get payment' }, { status: 500 });
      }

      const paymentData = await paymentRes.json();
      const externalReference = paymentData.external_reference;
      const status = paymentData.status; // approved, pending, rejected, etc.

      if (!externalReference) {
        return NextResponse.json({ error: 'Missing external reference' }, { status: 400 });
      }

      const orderId = parseInt(externalReference);
      if (isNaN(orderId)) {
        return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
      }

      // Get current order status before updating
      const [currentOrder] = await db
        .select({ status: orders.status })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!currentOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // Map MP status to our order status
      let orderStatus: string;
      switch (status) {
        case 'approved':
          orderStatus = 'confirmed';
          break;
        case 'pending':
        case 'in_process':
          orderStatus = 'pending';
          break;
        case 'rejected':
        case 'cancelled':
        case 'refunded':
          orderStatus = 'cancelled';
          break;
        default:
          orderStatus = 'pending';
      }

      await db.transaction(async (tx) => {
        // Claim the pending transition atomically so duplicate provider webhooks
        // cannot decrement stock more than once.
        const [claimedOrder] = await tx.update(orders)
          .set({ status: orderStatus, mpPaymentId: String(paymentId) })
          .where(and(eq(orders.id, orderId), eq(orders.status, 'pending')))
          .returning({ id: orders.id });

        if (!claimedOrder) {
          await tx.update(orders)
            .set({ status: orderStatus, mpPaymentId: String(paymentId) })
            .where(eq(orders.id, orderId));
          return;
        }

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

        if (orderStatus === 'confirmed' || orderStatus === 'cancelled') {
          for (const item of items) {
            if (!item.stockReserved || item.productType === 'digital' || !item.quantity) continue;
            if (item.variantId) {
              if (orderStatus === 'confirmed') {
                const [updatedVariant] = await tx.update(productVariants)
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
                if (!updatedVariant) throw new Error(`No se pudo completar la reserva de la variante ${item.variantId}.`);
                await tx.insert(stockMovements).values({
                  variantId: item.variantId,
                  movementType: 'venta',
                  quantity: -item.quantity,
                  stockAfter: updatedVariant.stock ?? 0,
                });
              } else {
                const [released] = await tx.update(productVariants)
                  .set({ reservedStock: sql`${productVariants.reservedStock} - ${item.quantity}` })
                  .where(and(
                    eq(productVariants.id, item.variantId),
                    sql`${productVariants.reservedStock} >= ${item.quantity}`,
                  ))
                  .returning({ id: productVariants.id });
                if (!released) throw new Error(`No se pudo liberar la reserva de la variante ${item.variantId}.`);
              }
            } else if (orderStatus === 'confirmed') {
              if (item.productId == null) throw new Error('El pedido contiene una línea sin producto asociado.');
              const [updatedProduct] = await tx.update(products)
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
              if (!updatedProduct) throw new Error(`No se pudo completar la reserva del producto ${item.productId}.`);
              await tx.insert(productStockMovements).values({
                productId: item.productId,
                movementType: 'venta',
                quantity: -item.quantity,
                stockAfter: updatedProduct.stock,
              });
            } else {
              if (item.productId == null) throw new Error('El pedido contiene una línea sin producto asociado.');
              const [released] = await tx.update(products)
                .set({ reservedStock: sql`${products.reservedStock} - ${item.quantity}` })
                .where(and(
                  eq(products.id, item.productId),
                  sql`${products.reservedStock} >= ${item.quantity}`,
                ))
                .returning({ id: products.id });
              if (!released) throw new Error(`No se pudo liberar la reserva del producto ${item.productId}.`);
            }
          }
          await tx.update(orderItems).set({ stockReserved: false }).where(eq(orderItems.orderId, orderId));
        }
      });

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('MP webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
