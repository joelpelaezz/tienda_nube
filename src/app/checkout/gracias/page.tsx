import '../checkout.css';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { formatPrice } from '@/lib/utils/format';
import { db } from '@/lib/db';
import { orders } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { getSettings } from '@/app/admin/configuracion/actions';

export default async function CheckoutGraciasPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; status?: string; payment_id?: string }>;
}) {
  const params = await searchParams;
  const paymentStatus = params.status;
  const isApproved = paymentStatus === 'approved';
  // C4-TRACE: follow-up message is configurable from the checkout options section.
  const storeSettings = await getSettings();
  const trackingMessage = storeSettings.checkoutTrackingMessage;

  // Look up the real order total from DB using external_reference (orderId)
  let orderNumber = '';
  let total = 0;
  if (params.order) {
    const orderId = parseInt(params.order);
    if (!isNaN(orderId)) {
      const [order] = await db
        .select({ orderNumber: orders.orderNumber, total: orders.total })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      if (order) {
        orderNumber = order.orderNumber;
        total = order.total;
      }
    }
  }

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="container py-16 text-center">
        {isApproved ? (
          <>
            <div className="checkout-gracias-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>

            <h1 className="checkout-gracias-title">¡Pago confirmado!</h1>

            <p className="checkout-gracias-subtitle">
              Tu pedido <strong>#{orderNumber}</strong> fue pagado exitosamente.
            </p>

            <div className="checkout-gracias-details">
              {total > 0 && (
                <div className="checkout-gracias-total">
                  Total pagado: <strong>{formatPrice(total)}</strong>
                </div>
              )}
              <p className="checkout-gracias-text">
                {trackingMessage || 'Te enviamos la confirmación a tu email.'}
              </p>
            </div>
          </>
        ) : (
          <>
            <div
              className="checkout-gracias-icon"
              style={{ background: '#fff7ed', color: '#ea580c' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>

            <h1 className="checkout-gracias-title">Pedido registrado</h1>

            <p className="checkout-gracias-subtitle">
              Tu pedido <strong>#{orderNumber}</strong> fue registrado.
            </p>

            <div className="checkout-gracias-details">
              {total > 0 && (
                <div className="checkout-gracias-total">
                  Total: <strong>{formatPrice(total)}</strong>
                </div>
              )}
              <p className="checkout-gracias-text">
                Completá el pago para confirmar tu pedido.
                <br />
                Tarjeta de prueba: <strong>4074 0959 0139 1213</strong>,
                cualquier CVV, vencimiento futuro.
              </p>
            </div>
          </>
        )}

        <div className="checkout-gracias-actions">
          <Link href="/productos/" className="ch-btn ch-btn-primary">
            Seguir comprando
          </Link>
          <Link href="/" className="ch-btn ch-btn-secondary">
            Volver al inicio
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
