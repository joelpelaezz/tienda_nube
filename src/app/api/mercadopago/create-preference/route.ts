import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/drizzle/schema';
import { and, eq } from 'drizzle-orm';
import { getCurrentSession } from '@/lib/auth';
import { parsePositiveId } from '@/lib/payment-security';

const MERCADOPAGO_API = 'https://api.mercadopago.com';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const userId = parsePositiveId(session?.userId);
    if (!userId) return NextResponse.json({ error: 'Iniciá sesión' }, { status: 401 });
    const { orderId: inputOrderId } = await req.json();
    const orderId = parsePositiveId(inputOrderId);

    if (!orderId) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    // C4-TRACE: one indistinguishable response for absent, unowned, legacy and non-pending orders.
    const [order] = await db.select({ total: orders.total }).from(orders).where(and(
      eq(orders.id, orderId), eq(orders.userId, userId), eq(orders.status, 'pending')
    )).limit(1);
    if (!order || !Number.isSafeInteger(order.total) || order.total <= 0) {
      return NextResponse.json({ error: 'Pedido no disponible' }, { status: 404 });
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: 'Mercado Pago no configurado' }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3090';

    // Create preference
    const preference = {
      items: [{ id: String(orderId), title: 'Pedido', quantity: 1, unit_price: order.total / 100, currency_id: 'ARS' }],
      external_reference: String(orderId),
      notification_url: `${siteUrl}/api/mercadopago/webhook`,
      back_urls: {
        success: `${siteUrl}/checkout/gracias`,
        failure: `${siteUrl}/checkout`,
        pending: `${siteUrl}/checkout/gracias`,
      },
      auto_return: 'approved',
    };

    const response = await fetch(`${MERCADOPAGO_API}/checkout/preferences`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('MP API error:', errorData);
      return NextResponse.json({ error: 'Error al crear preferencia de pago' }, { status: 500 });
    }

    const preferenceData = await response.json();

    return NextResponse.json({
      preferenceId: preferenceData.id,
      initPoint: preferenceData.init_point,
      sandboxInitPoint: preferenceData.sandbox_init_point,
    });
  } catch (error) {
    console.error('Error creating MP preference:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
