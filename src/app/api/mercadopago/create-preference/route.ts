import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, customers } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const MERCADOPAGO_API = 'https://api.mercadopago.com';

export async function POST(req: NextRequest) {
  try {
    const { orderId, items } = await req.json();

    if (!orderId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: 'Mercado Pago no configurado' }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3090';

    // Build Mercado Pago items
    const mpItems = items.map((item: { name: string; price: number; quantity: number }) => ({
      id: String(item.name).slice(0, 50),
      title: item.name,
      quantity: item.quantity,
      unit_price: item.price / 100, // Convert from cents
      currency_id: 'ARS',
    }));

    // Create preference
    const preference = {
      items: mpItems,
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
