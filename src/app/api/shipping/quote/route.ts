import { NextRequest, NextResponse } from 'next/server';
import { getShippingQuotes, isValidPostalCode, normalizePostalCode } from '@/lib/shipping';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const postalCode = typeof body.postalCode === 'string' ? body.postalCode : '';
    const subtotal = Number(body.subtotal);

    if (!isValidPostalCode(postalCode)) {
      return NextResponse.json({ error: 'Ingresá un código postal válido.' }, { status: 400 });
    }
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      return NextResponse.json({ error: 'El subtotal no es válido.' }, { status: 400 });
    }

    return NextResponse.json({
      postalCode: normalizePostalCode(postalCode),
      quotes: await getShippingQuotes(postalCode, subtotal),
    });
  } catch (error) {
    console.error('[POST /api/shipping/quote]', error);
    return NextResponse.json({ error: 'No pudimos calcular el envío.' }, { status: 500 });
  }
}
