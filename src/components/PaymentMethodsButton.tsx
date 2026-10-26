'use client';

import PaymentMethodsModal from './PaymentMethodsModal';
import type { PaymentMethodRow } from '@/app/admin/configuracion/actions';

export default function PaymentMethodsButton({ methods, productPrice }: { methods: PaymentMethodRow[]; productPrice: number }) {
  return <PaymentMethodsModal methods={methods} productPrice={productPrice} />;
}
