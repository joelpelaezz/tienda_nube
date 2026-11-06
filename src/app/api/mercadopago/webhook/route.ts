import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderPayments, paymentExceptions, orderItems, products, productStockMovements, productVariants, stockMovements } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { classifyPayment, parsePositiveId, paymentMatchesOrder, providerStatusDisposition, refundAmountCents, verifyMercadoPagoSignature } from '@/lib/payment-security';

class ReservationError extends Error {}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    // C4-TRACE: authenticate the official manifest before trusting any notification data.
    const ids = req.nextUrl.searchParams.getAll('data.id');
    const queryId = ids.length === 1 ? ids[0] : null;
    if (!verifyMercadoPagoSignature({
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
      signature: req.headers.get('x-signature'),
      requestId: req.headers.get('x-request-id'),
      dataId: queryId,
    })) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

    let data;
    try { data = JSON.parse(body); } catch {
      return NextResponse.json({ error: 'Invalid notification' }, { status: 400 });
    }
    if (!data?.data?.id || String(data.data.id) !== queryId) {
      return NextResponse.json({ error: 'Invalid notification' }, { status: 400 });
    }

    // Handle different event types
    if (data.type === 'payment') {
      const paymentId = queryId!;

      if (!paymentId) {
        return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
      }

      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!accessToken) {
        return NextResponse.json({ error: 'MP not configured' }, { status: 500 });
      }

      return await db.transaction(async (tx) => {
      // Serialize all observations of this provider payment, including exceptions.
      // Fetch only after acquiring the lock so a delayed older response cannot overtake
      // a newer one. Hash collisions merely serialize unrelated payments.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'mercadopago:payment:' + paymentId}, 0))`);
      // Bound the time a stalled provider request holds a database connection and lock.
      const paymentRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!paymentRes.ok) {
        return NextResponse.json({ error: 'Failed to get payment' }, { status: 500 });
      }

      const paymentData = await paymentRes.json();
      const externalReference = paymentData.external_reference;
      // Persist only the signed ID and fixed reason codes, never raw provider data.
      const recordException = async (reason: string, orderId: number | null = null) => {
        await tx.insert(paymentExceptions).values({ providerPaymentId: paymentId, reason, orderId }).onConflictDoNothing();
      };
      if (String(paymentData.id) !== paymentId) {
        await recordException('provider_id_mismatch');
        return NextResponse.json({ received: true });
      }
      const disposition = providerStatusDisposition(paymentData.status);
      if (disposition === 'ignore') return NextResponse.json({ received: true });
      if (disposition !== 'process') {
        await recordException(disposition === 'chargeback' ? 'chargeback' : 'provider_state');
        return NextResponse.json({ received: true });
      }

      if (!externalReference) {
        await recordException('invalid_reference');
        return NextResponse.json({ received: true });
      }

      const orderId = parsePositiveId(externalReference);
      if (!orderId || typeof externalReference !== 'string') {
        await recordException('invalid_reference');
        return NextResponse.json({ received: true });
      }

      // Get current order status before updating
      const [currentOrder] = await tx
        .select({ status: orders.status, total: orders.total })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!currentOrder) {
        await recordException('unknown_order');
        return NextResponse.json({ received: true });
      }

      if (!paymentMatchesOrder(paymentData, paymentId, orderId, currentOrder.total)) {
        await recordException('payment_mismatch', orderId);
        return NextResponse.json({ received: true });
      }
      const refundedAmount = refundAmountCents(paymentData.transaction_amount_refunded ?? (paymentData.status === 'approved' ? 0 : undefined), currentOrder.total);
      if (refundedAmount === null || (paymentData.status === 'refunded' && refundedAmount === 0)) {
        await recordException('invalid_refund', orderId);
        return NextResponse.json({ received: true });
      }

        // C4-TRACE: lock the same order row used by expiry before classifying a payment.
        const [locked] = await tx.select({ status: orders.status, total: orders.total, mpPaymentId: orders.mpPaymentId })
          .from(orders).where(eq(orders.id, orderId)).for('update');
        if (!locked || locked.total !== currentOrder.total) throw new Error('Order changed during payment verification');

        const previousPayments = await tx.select({ id: orderPayments.providerPaymentId }).from(orderPayments)
          .where(eq(orderPayments.orderId, orderId));
        const priorExceptions = await tx.select({ id: paymentExceptions.providerPaymentId }).from(paymentExceptions)
          .where(eq(paymentExceptions.providerPaymentId, paymentId)).limit(1);
        // A prior payment requiring review must not permit a second automatic fulfillment.
        const decision = classifyPayment(locked, paymentId, refundedAmount,
          previousPayments.some(payment => payment.id !== paymentId) || priorExceptions.length > 0);
        const [inserted] = await tx.insert(orderPayments).values({
          providerPaymentId: paymentId, orderId, amount: locked.total,
          refundedAmount, providerStatus: paymentData.status,
          reconciliationReason: decision.reconciliationReason,
        }).onConflictDoNothing().returning({ id: orderPayments.providerPaymentId });

        const [record] = await tx.select().from(orderPayments)
          .where(eq(orderPayments.providerPaymentId, paymentId)).for('update');
        if (!record || record.orderId !== orderId || record.amount !== locked.total) {
          throw new Error('Provider payment ID already belongs to another order');
        }
        // Replayed older provider responses cannot erase a previously observed refund.
        if (refundedAmount > record.refundedAmount || (paymentData.status === 'refunded' && record.providerStatus !== 'refunded')) {
          await tx.update(orderPayments).set({
            refundedAmount: Math.max(refundedAmount, record.refundedAmount),
            providerStatus: paymentData.status === 'refunded' ? 'refunded' : record.providerStatus,
            reconciliationReason: 'refund', updatedAt: new Date(),
          }).where(eq(orderPayments.providerPaymentId, paymentId));
        }
        if (!inserted || !decision.mayFulfill || paymentData.status === 'refunded') return NextResponse.json({ received: true });

        // C4-TRACE: roll back fulfillment only when the reservation is inconsistent.
        try {
        await tx.transaction(async (tx) => {
        const [claimedOrder] = await tx.update(orders)
          .set({ status: 'confirmed', mpPaymentId: String(paymentId) })
          .where(and(eq(orders.id, orderId), eq(orders.status, 'pending'), eq(orders.total, currentOrder.total)))
          .returning({ id: orders.id });

        if (!claimedOrder) return;

        const items = await tx
          .select({
            variantId: orderItems.variantId,
            productId: orderItems.productId,
            quantity: orderItems.quantity,
            stockReserved: orderItems.stockReserved,
            productType: products.productType,
          })
          .from(orderItems)
          .leftJoin(products, eq(orderItems.productId, products.id))
          .where(eq(orderItems.orderId, orderId));

        {
          for (const item of items) {
            if (!item.stockReserved || item.productType === 'digital') continue;
            if (item.productType === null || !item.quantity || item.quantity < 0) throw new ReservationError('Línea con reserva inválida.');
            if (item.variantId) {
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
                if (!updatedVariant) throw new ReservationError(`No se pudo completar la reserva de la variante ${item.variantId}.`);
                await tx.insert(stockMovements).values({
                  variantId: item.variantId,
                  movementType: 'venta',
                  quantity: -item.quantity,
                  stockAfter: updatedVariant.stock ?? 0,
                });
            } else {
              if (item.productId == null) throw new ReservationError('El pedido contiene una línea sin producto asociado.');
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
              if (!updatedProduct) throw new ReservationError(`No se pudo completar la reserva del producto ${item.productId}.`);
              await tx.insert(productStockMovements).values({
                productId: item.productId,
                movementType: 'venta',
                quantity: -item.quantity,
                stockAfter: updatedProduct.stock,
              });
            }
          }
          await tx.update(orderItems).set({ stockReserved: false }).where(eq(orderItems.orderId, orderId));
        }
        });
        } catch (error) {
          if (!(error instanceof ReservationError)) throw error;
          await tx.update(orderPayments).set({ reconciliationReason: 'reservation_error', updatedAt: new Date() })
            .where(eq(orderPayments.providerPaymentId, paymentId));
        }
      return NextResponse.json({ received: true });
      });
    }

    return NextResponse.json({ received: true });
  } catch {
    console.error('MP webhook processing failed');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
