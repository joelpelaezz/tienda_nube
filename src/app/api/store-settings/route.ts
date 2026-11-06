import { NextResponse } from 'next/server';
import { getSettings } from '@/app/admin/configuracion/actions';
import { getPaymentMethods } from '@/app/admin/configuracion/actions';
import { getPublicShippingMethods } from '@/lib/public-shipping';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [settings, paymentMethods, shippingMethods] = await Promise.all([
      getSettings(),
      getPaymentMethods(),
      getPublicShippingMethods(),
    ]);
    return NextResponse.json({
      ...settings,
      paymentMethods: paymentMethods
        .filter((method) => method.isActive)
        .map(({ id, name, type, logoUrl, discountPercent, position }) => ({
          id, name, type, logoUrl, discountPercent, position,
        })),
      shippingMethods,
    });
  } catch {
    return NextResponse.json(
      {
        paymentMpEnabled: false,
        paymentWhatsappEnabled: false,
        paymentMethods: [],
        shippingMethods: [],
        whatsappNumber: '',
      },
      { status: 500 }
    );
  }
}
