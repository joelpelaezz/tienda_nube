import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
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

      // Update order status
      await db
        .update(orders)
        .set({
          status: orderStatus,
          mpPaymentId: String(paymentId),
        } as any)
        .where(eq(orders.id, parseInt(externalReference)));

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('MP webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
