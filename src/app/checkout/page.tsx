'use client';

import './checkout.css';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useCartStore } from '@/lib/store';
import { createOrder } from './actions';
import { formatPrice } from '@/lib/utils/format';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

const STEPS = [
  { id: 'cart', label: 'Carrito' },
  { id: 'data', label: 'Datos' },
  { id: 'payment', label: 'Pago' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [preferenceId, setPreferenceId] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Initialize Mercado Pago
  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
    if (publicKey && publicKey !== 'TEST-xxxxxxxxxxxxxxxxxxxx') {
      initMercadoPago(publicKey);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError('El carrito está vacío');
      return;
    }
    if (!form.firstName || !form.lastName || !form.email) {
      setError('Por favor completá los campos obligatorios');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await createOrder(form, items);
      setOrderId(result.orderId);
      setOrderNumber(result.orderNumber);

      const prefRes = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: result.orderId, items }),
      });

      if (!prefRes.ok) {
        const err = await prefRes.json();
        throw new Error(err.error || 'Error al iniciar pago');
      }

      const prefData = await prefRes.json();
      setPreferenceId(prefData.preferenceId);
      setStep('payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la orden');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (items.length === 0) {
    return (
      <>
        <Header />
        <CartDrawer />
        <main className="container py-16 text-center">
          <h1 className="ch-title">Tu carrito está vacío</h1>
          <p className="ch-empty-sub">Agregá productos antes de ir al checkout.</p>
          <Link href="/productos/" className="ch-btn ch-btn-primary">
            Ver productos
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const currentStepIndex = step === 'form' ? 1 : 2;

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="ch-main">
        {/* Breadcrumb */}
        <div className="ch-breadcrumb">
          <div className="container">
            <Link href="/" className="ch-logo-link">
              <img
                src="https://static-c4-1.s3.amazonaws.com/assets/img/logos/elcuatro-dark-297x48.png"
                alt="Mi Tienda"
                className="ch-logo"
              />
            </Link>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="ch-steps-bar">
          <div className="container">
            <div className="ch-steps">
              {STEPS.map((s, i) => {
                const stepNum = i + 1;
                const isDone = stepNum < currentStepIndex;
                const isActive = stepNum === currentStepIndex;
                return (
                  <div key={s.id} className="ch-step">
                    <div className={`ch-step-circle ${isDone ? 'ch-step-done' : ''} ${isActive ? 'ch-step-active' : ''}`}>
                      {isDone ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span>{stepNum}</span>
                      )}
                    </div>
                    <span className={`ch-step-label ${isActive ? 'ch-step-label-active' : ''}`}>{s.label}</span>
                    {i < STEPS.length - 1 && <div className={`ch-step-line ${isDone ? 'ch-step-line-done' : ''}`} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="container">
          <div className="ch-layout">
            {/* ─── Left: Form ─── */}
            <div className="ch-form-col">
              {step === 'payment' ? (
                <div className="ch-section">
                  <div className="ch-section-header">
                    <h1 className="ch-title">Método de pago</h1>
                    <p className="ch-order-ref">Pedido <strong>#{orderNumber}</strong></p>
                  </div>

                  {/* Comprador info */}
                  <div className="ch-info-card">
                    <div className="ch-info-row">
                      <span className="ch-info-label">Comprador</span>
                      <span className="ch-info-value">{form.firstName} {form.lastName}</span>
                    </div>
                    <div className="ch-info-row">
                      <span className="ch-info-label">Email</span>
                      <span className="ch-info-value">{form.email}</span>
                    </div>
                    {form.phone && (
                      <div className="ch-info-row">
                        <span className="ch-info-label">Teléfono</span>
                        <span className="ch-info-value">{form.phone}</span>
                      </div>
                    )}
                    {form.address && (
                      <div className="ch-info-row">
                        <span className="ch-info-label">Dirección</span>
                        <span className="ch-info-value">{form.address}</span>
                      </div>
                    )}
                    <button onClick={() => setStep('form')} className="ch-edit-btn">
                      Editar datos
                    </button>
                  </div>

                  {/* Payment */}
                  <div className="ch-payment-box">
                    {preferenceId ? (
                      <Wallet initialization={{ preferenceId }} />
                    ) : (
                      <div className="ch-loading">Cargando método de pago...</div>
                    )}
                    <p className="ch-mp-note">
                      Pagá de forma segura con Mercado Pago.
                      <br />
                      Tarjeta de prueba: <strong>4074 0959 0139 1213</strong>, cualquier CVV, vencimiento futuro.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="ch-section">
                  <div className="ch-section-header">
                    <h1 className="ch-title">Datos de contacto</h1>
                  </div>

                  {/* Contact fields */}
                  <div className="ch-field-group">
                    <label className="ch-label">Nombre *</label>
                    <input
                      type="text"
                      className="ch-input"
                      value={form.firstName}
                      onChange={(e) => updateForm('firstName', e.target.value)}
                      required
                      placeholder="Juan"
                    />
                  </div>

                  <div className="ch-field-group">
                    <label className="ch-label">Apellido *</label>
                    <input
                      type="text"
                      className="ch-input"
                      value={form.lastName}
                      onChange={(e) => updateForm('lastName', e.target.value)}
                      required
                      placeholder="Pérez"
                    />
                  </div>

                  <div className="ch-field-group">
                    <label className="ch-label">Email *</label>
                    <input
                      type="email"
                      className="ch-input"
                      value={form.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                      required
                      placeholder="juan@ejemplo.com"
                    />
                  </div>

                  <div className="ch-field-group">
                    <label className="ch-label">Teléfono</label>
                    <input
                      type="tel"
                      className="ch-input"
                      value={form.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                      placeholder="3812345678"
                    />
                  </div>

                  <div className="ch-divider" />

                  <h2 className="ch-subtitle">Entrega</h2>

                  <div className="ch-field-group">
                    <label className="ch-label">Dirección / CP</label>
                    <input
                      type="text"
                      className="ch-input"
                      value={form.address}
                      onChange={(e) => updateForm('address', e.target.value)}
                      placeholder="Av. Mitre 500, San Miguel de Tucumán"
                    />
                  </div>

                  <div className="ch-field-group">
                    <label className="ch-label">Notas del pedido</label>
                    <textarea
                      className="ch-input ch-textarea"
                      rows={2}
                      value={form.notes}
                      onChange={(e) => updateForm('notes', e.target.value)}
                      placeholder="Indicaciones para el delivery..."
                    />
                  </div>

                  {error && <div className="ch-error">{error}</div>}

                  <button type="submit" className="ch-btn ch-btn-primary ch-btn-full" disabled={loading}>
                    {loading ? 'Procesando...' : 'Continuar'}
                  </button>
                </form>
              )}
            </div>

            {/* ─── Right: Order Summary ─── */}
            <div className="ch-summary-col">
              <div className="ch-summary-card">
                <h2 className="ch-summary-title">Tu pedido</h2>
                <div className="ch-summary-items">
                  {items.map((item) => (
                    <div key={`${item.id}-${item.variant}`} className="ch-summary-item">
                      <div className="ch-summary-item-img">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} />
                        ) : (
                          <div className="ch-summary-item-img-placeholder">📷</div>
                        )}
                      </div>
                      <div className="ch-summary-item-info">
                        <span className="ch-summary-item-name">{item.name}</span>
                        {item.variant && (
                          <span className="ch-summary-item-variant">{item.variant}</span>
                        )}
                        <span className="ch-summary-item-qty">x{item.quantity}</span>
                      </div>
                      <span className="ch-summary-item-price">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="ch-summary-divider" />

                <div className="ch-summary-row">
                  <span>Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>

                <div className="ch-summary-divider" />

                <div className="ch-summary-total">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>

                <button
                  type="button"
                  className="ch-coupon-btn"
                  onClick={() => {}}
                >
                  ¿Tenés un cupón de descuento?
                </button>
              </div>

              {/* Footer help */}
              <div className="ch-help-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>¿Necesitás ayuda? <a href="mailto:soporte@mitienda.com">Contactanos</a></span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
