import { NextResponse } from 'next/server';
import { getSettings } from '@/app/admin/configuracion/actions';
import { getPaymentMethods } from '@/app/admin/configuracion/actions';
import { getShippingConfiguration } from '@/app/admin/envios/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [settings, paymentMethods, shippingConfiguration] = await Promise.all([
      getSettings(),
      getPaymentMethods(),
      getShippingConfiguration(),
    ]);
    return NextResponse.json({
      ...settings,
      paymentMethods: paymentMethods
        .filter((method) => method.isActive)
        .map(({ id, name, type, logoUrl, discountPercent, position }) => ({
          id, name, type, logoUrl, discountPercent, position,
        })),
      shippingMethods: shippingConfiguration.methods
        .filter((method) => method.isActive)
        .map(({ id, code, name, carrier, estimatedDays, position }) => ({
          id, code, name, carrier, estimatedDays, position,
        })),
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
