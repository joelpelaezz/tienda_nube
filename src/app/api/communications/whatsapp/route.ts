import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { communicationEvents } from '@/drizzle/schema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const source = typeof body.source === 'string' ? body.source.slice(0, 80) : 'unknown';
    const href = typeof body.href === 'string' ? body.href.slice(0, 2000) : null;
    const name = typeof body.name === 'string' ? body.name.slice(0, 120) : null;
    const phone = typeof body.phone === 'string' ? body.phone.slice(0, 40) : null;
    const productId = Number.isInteger(body.productId) ? body.productId : null;
    const orderId = Number.isInteger(body.orderId) ? body.orderId : null;

    await db.insert(communicationEvents).values({
      channel: 'whatsapp',
      eventType: 'click',
      source,
      href,
      name,
      phone,
      productId,
      orderId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/communications/whatsapp]', error);
    return NextResponse.json({ error: 'No pudimos registrar el contacto.' }, { status: 500 });
  }
}
