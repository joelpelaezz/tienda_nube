'use client';

import './checkout.css';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useCartStore } from '@/lib/store';
import { createOrder, validateCoupon, type CouponValidation } from './actions';
import { formatPrice } from '@/lib/utils/format';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import TrackedWhatsAppLink from '@/components/TrackedWhatsAppLink';

const STEPS = [
  { id: 'cart', label: 'Carrito' },
  { id: 'data', label: 'Datos' },
  { id: 'payment', label: 'Pago' },
];

type ShippingQuote = {
  methodCode: string;
  methodName: string;
  cost: number;
  estimatedDays: string | null;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [orderTotal, setOrderTotal] = useState<number>(0);
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [preferenceId, setPreferenceId] = useState('');
  const [coupon, setCoupon] = useState<CouponValidation | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponExpanded, setCouponExpanded] = useState(false);
  const [shippingQuotes, setShippingQuotes] = useState<ShippingQuote[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [selectedShippingMethod, setSelectedShippingMethod] = useState('');
  const [storeSettings, setStoreSettings] = useState<{
    paymentMpEnabled: boolean;
    paymentWhatsappEnabled: boolean;
    whatsappFloatingEnabled: boolean;
    whatsappCheckoutEnabled: boolean;
    whatsappOrderMode: 'quick' | 'formal' | 'both';
    whatsappButtonText: string;
    whatsappNumber: string;
    storeEmail: string;
    checkoutRequirePhone: boolean;
    checkoutNoteEnabled: boolean;
    checkoutNoteLabel: string;
    checkoutNoteRequired: boolean;
    checkoutTrackingMessage: string;
    whatsappMessageTemplate: string;
    paymentMethods: Array<{ id: string; name: string; type: string }>;
  }>({
    paymentMpEnabled: false,
    paymentWhatsappEnabled: false,
    whatsappFloatingEnabled: false,
    whatsappCheckoutEnabled: false,
    whatsappOrderMode: 'quick',
    whatsappButtonText: 'Consultar por WhatsApp',
    whatsappNumber: '',
    storeEmail: '',
    checkoutRequirePhone: false,
    checkoutNoteEnabled: true,
    checkoutNoteLabel: 'Notas del pedido',
    checkoutNoteRequired: false,
    checkoutTrackingMessage: '',
    whatsappMessageTemplate: '¡Hola! Quiero consultar sobre mi pedido:',
    paymentMethods: [],
  });
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    postalCode: '',
  });

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = coupon?.valid && coupon.type === 'percent'
    ? Math.round(subtotal * (coupon.discountValue / 100))
    : coupon?.valid && coupon.type === 'fixed'
    ? Math.min(coupon.discountValue, subtotal)
    : 0;
  const total = subtotal - discount;
  const selectedShippingQuote = shippingQuotes.find((quote) => quote.methodCode === selectedShippingMethod);
  const totalWithShipping = total + (selectedShippingQuote?.cost || 0);

  // Initialize Mercado Pago + load store settings
  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
    if (publicKey && publicKey !== 'TEST-xxxxxxxxxxxxxxxxxxxx') {
      initMercadoPago(publicKey);
    }
    fetch('/api/store-settings')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('No se pudo cargar la configuración')))
      .then((settings) => setStoreSettings({
        paymentMpEnabled: Array.isArray(settings.paymentMethods)
          ? settings.paymentMethods.some((method: { id?: string }) => method.id === 'mercadopago')
          : false,
        paymentWhatsappEnabled: settings.paymentWhatsappEnabled === true,
        whatsappFloatingEnabled: settings.whatsappFloatingEnabled === true,
        whatsappCheckoutEnabled: settings.whatsappCheckoutEnabled === true,
        whatsappOrderMode: settings.whatsappOrderMode === 'formal' || settings.whatsappOrderMode === 'both' ? settings.whatsappOrderMode : 'quick',
        whatsappButtonText: typeof settings.whatsappButtonText === 'string' ? settings.whatsappButtonText : 'Consultar por WhatsApp',
        whatsappNumber: typeof settings.whatsappNumber === 'string' ? settings.whatsappNumber : '',
        // C4-TRACE: checkout help uses the admin-configured store email, never a personal fallback.
        storeEmail: typeof settings.storeEmail === 'string' ? settings.storeEmail : '',
        // C4-TRACE: checkout options are driven by the admin configuration section.
        checkoutRequirePhone: settings.checkoutRequirePhone === true,
        checkoutNoteEnabled: settings.checkoutNoteEnabled !== false,
        checkoutNoteLabel: typeof settings.checkoutNoteLabel === 'string' ? settings.checkoutNoteLabel : 'Notas del pedido',
        checkoutNoteRequired: settings.checkoutNoteRequired === true,
        checkoutTrackingMessage: typeof settings.checkoutTrackingMessage === 'string' ? settings.checkoutTrackingMessage : '',
        whatsappMessageTemplate: typeof settings.whatsappMessageTemplate === 'string'
          ? settings.whatsappMessageTemplate
          : '¡Hola! Quiero consultar sobre mi pedido:',
        paymentMethods: Array.isArray(settings.paymentMethods) ? settings.paymentMethods : [],
      }))
      .catch(() => setStoreSettings((current) => ({ ...current, paymentMpEnabled: false, paymentWhatsappEnabled: false })));
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const result = await validateCoupon(couponInput.trim(), subtotal);
      setCoupon(result);
      if (result.valid) {
        setCouponExpanded(false);
      }
    } catch {
      setCoupon({ valid: false, code: couponInput, type: 'percent', discountValue: 0, discountLabel: '', message: 'Error al validar' });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon(null);
    setCouponInput('');
  };

  const calculateShipping = async () => {
    setShippingLoading(true);
    setShippingError('');
    setShippingQuotes([]);
    setSelectedShippingMethod('');
    try {
      const response = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postalCode: form.postalCode, subtotal: total }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No pudimos calcular el envío.');
      if (!result.quotes.length) throw new Error('No hay medios de envío disponibles para este código postal.');
      setShippingQuotes(result.quotes);
      setSelectedShippingMethod(result.quotes[0].methodCode);
    } catch (shippingError) {
      setShippingError(shippingError instanceof Error ? shippingError.message : 'No pudimos calcular el envío.');
    } finally {
      setShippingLoading(false);
    }
  };

  const buildWhatsAppUrl = (reference?: string, referenceTotal = totalWithShipping) => {
    const number = storeSettings.whatsappNumber.replace(/\D/g, '');
    if (!number) return '';
    const itemsSummary = items
      .map((item) => `• ${item.name}${item.variant ? ` (${item.variant})` : ''} x${item.quantity} — ${formatPrice(item.price * item.quantity)}`)
      .join('\n');
    const message = [
      storeSettings.whatsappMessageTemplate,
      '',
      reference ? `Pedido: #${reference}` : 'Consulta de producto',
      `Nombre: ${form.firstName || 'Pendiente'} ${form.lastName || ''}`.trim(),
      form.email ? `Email: ${form.email}` : '',
      form.phone ? `Tel: ${form.phone}` : '',
      form.address ? `Dirección: ${form.address}` : '',
      '',
      'Productos:',
      itemsSummary,
      '',
      `Total: ${formatPrice(referenceTotal)}`,
    ].filter(Boolean).join('\n');
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  };

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
      const hasWhatsappCheckout = storeSettings.paymentWhatsappEnabled &&
        storeSettings.whatsappCheckoutEnabled &&
        Boolean(storeSettings.whatsappNumber) &&
        storeSettings.whatsappOrderMode !== 'quick';
      if (!storeSettings.paymentMpEnabled && !hasWhatsappCheckout) {
        setError('No hay medios de pago habilitados. Comunicate con la tienda.');
        setLoading(false);
        return;
      }

      const result = await createOrder(
        { ...form, shippingMethod: selectedShippingMethod },
        items,
        coupon?.valid ? coupon.code : null,
      );
      setOrderId(result.orderId);
      setOrderNumber(result.orderNumber);
      setOrderTotal(result.total);
      setOrderDiscount(result.discount ?? 0);

      // ── Mercado Pago preference (only if MP payments are enabled) ──
      const mpEnabled = storeSettings.paymentMpEnabled &&
        process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY !== 'TEST-xxxxxxxxxxxxxxxxxxxx';
      if (mpEnabled) {
        const discount = result.discount ?? 0;
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const mpItems = discount > 0 && subtotal > 0
          ? items.map((item) => {
              const itemShare = (item.price * item.quantity) / subtotal;
              const itemDiscount = Math.round(discount * itemShare);
              const discountedPrice = item.price - Math.round(itemDiscount / item.quantity);
              return { ...item, price: discountedPrice };
            })
          : items;

        const prefRes = await fetch('/api/mercadopago/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: result.orderId, items: mpItems }),
        });

        if (!prefRes.ok) {
          const err = await prefRes.json();
          throw new Error(err.error || 'Error al iniciar pago');
        }

        const prefData = await prefRes.json();
        setPreferenceId(prefData.preferenceId);
      }

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
              <Image
                src="https://dcdn-us.mitiendanube.com/stores/005/154/974/themes/common/logo-1470273192-1725027146-d4ccbc266b0dfc03cd9ab1fea319470f1725027146-480-0.webp"
                alt="Tendencia Shop"
                width={240}
                height={64}
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

                  {/* Mercado Pago payment box (only if enabled) */}
                  {storeSettings.paymentMpEnabled && (
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
                  )}

                  {/* WhatsApp alternative (only if enabled) */}
                  {storeSettings.paymentWhatsappEnabled && storeSettings.whatsappCheckoutEnabled && storeSettings.whatsappOrderMode !== 'quick' && storeSettings.whatsappNumber && (
                    (() => {
                      const whatsappUrl = buildWhatsAppUrl(orderNumber, orderTotal);
                      return (
                        <TrackedWhatsAppLink
                          source="checkout-formal"
                          orderId={orderNumber ? Number(orderNumber) || undefined : undefined}
                          name={`${form.firstName} ${form.lastName}`.trim() || undefined}
                          phone={form.phone || undefined}
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ch-whatsapp-btn"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          {storeSettings.whatsappButtonText}
                        </TrackedWhatsAppLink>
                      );
                    })()
                  )}
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
                      required={storeSettings.checkoutRequirePhone}
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
                    <label className="ch-label">Código postal</label>
                    <div className="ch-shipping-quote-form">
                      <input
                        type="text"
                        className="ch-input"
                        value={form.postalCode}
                        onChange={(e) => {
                          updateForm('postalCode', e.target.value);
                          setShippingQuotes([]);
                          setSelectedShippingMethod('');
                        }}
                        placeholder="A4000 o 4000"
                      />
                      <button type="button" className="ch-btn ch-btn-secondary" onClick={calculateShipping} disabled={shippingLoading}>
                        {shippingLoading ? 'Calculando...' : 'Calcular envío'}
                      </button>
                    </div>
                    {shippingError && <div className="ch-error">{shippingError}</div>}
                    {shippingQuotes.length > 0 && (
                      <div className="ch-shipping-options">
                        {shippingQuotes.map((quote) => (
                          <label key={quote.methodCode} className="ch-shipping-option">
                            <input
                              type="radio"
                              name="shippingMethod"
                              checked={selectedShippingMethod === quote.methodCode}
                              onChange={() => setSelectedShippingMethod(quote.methodCode)}
                            />
                            <span>{quote.methodName}{quote.estimatedDays ? ` · ${quote.estimatedDays}` : ''}</span>
                            <strong>{quote.cost === 0 ? 'Gratis' : formatPrice(quote.cost)}</strong>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {storeSettings.checkoutNoteEnabled && (
                    <div className="ch-field-group">
                      <label className="ch-label">{storeSettings.checkoutNoteLabel}</label>
                      <textarea
                        className="ch-input ch-textarea"
                        rows={2}
                        value={form.notes}
                        onChange={(e) => updateForm('notes', e.target.value)}
                        placeholder="Indicaciones para el delivery..."
                        required={storeSettings.checkoutNoteRequired}
                      />
                    </div>
                  )}

                  {error && <div className="ch-error">{error}</div>}

                  {!(storeSettings.paymentWhatsappEnabled && storeSettings.whatsappCheckoutEnabled &&
                    storeSettings.whatsappOrderMode === 'quick' && storeSettings.whatsappNumber) && (
                    <button type="submit" className="ch-btn ch-btn-primary ch-btn-full" disabled={loading}>
                      {loading ? 'Procesando...' : 'Continuar'}
                    </button>
                  )}
                  {storeSettings.paymentWhatsappEnabled && storeSettings.whatsappCheckoutEnabled &&
                    (storeSettings.whatsappOrderMode === 'quick' || storeSettings.whatsappOrderMode === 'both') &&
                    storeSettings.whatsappNumber && (
                    <TrackedWhatsAppLink
                      source="checkout-quick"
                      name={`${form.firstName} ${form.lastName}`.trim() || undefined}
                      phone={form.phone || undefined}
                      href={buildWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ch-whatsapp-btn"
                      style={{ marginTop: '10px' }}
                    >
                      {storeSettings.whatsappButtonText}
                    </TrackedWhatsAppLink>
                  )}
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
                          <Image src={item.imageUrl} alt={item.name} width={64} height={64} />
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
                  <span>{formatPrice(subtotal)}</span>
                </div>

                {coupon?.valid && (
                  <>
                    <div className="ch-summary-row" style={{ color: 'var(--color-success)' }}>
                      <span>Descuento ({coupon.code})</span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  </>
                )}

                {selectedShippingQuote && (
                  <div className="ch-summary-row">
                    <span>Envío ({selectedShippingQuote.methodName})</span>
                    <span>{selectedShippingQuote.cost === 0 ? 'Gratis' : formatPrice(selectedShippingQuote.cost)}</span>
                  </div>
                )}

                <div className="ch-summary-divider" />

                <div className="ch-summary-total">
                  <span>Total</span>
                  <span>{formatPrice(totalWithShipping)}</span>
                </div>

                {!coupon?.valid ? (
                  couponExpanded ? (
                    <div className="ch-coupon-form">
                      <input
                        type="text"
                        className="ch-input"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Código de cupón"
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                        autoFocus
                      />
                      {coupon && !coupon.valid && (
                        <span className="ch-coupon-error">{coupon.message}</span>
                      )}
                      <div className="ch-coupon-actions">
                        <button
                          type="button"
                          className="ch-btn ch-btn-secondary"
                          onClick={() => { setCouponExpanded(false); setCouponInput(''); setCoupon(null); }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="ch-btn ch-btn-primary"
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                        >
                          {couponLoading ? 'Validando...' : 'Aplicar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="ch-coupon-btn"
                      onClick={() => setCouponExpanded(true)}
                    >
                      ¿Tenés un cupón de descuento?
                    </button>
                  )
                ) : (
                  <div className="ch-coupon-applied">
                    <span className="ch-coupon-applied-code">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {coupon.code} — {coupon.discountLabel}
                    </span>
                    <button
                      type="button"
                      className="ch-coupon-remove"
                      onClick={handleRemoveCoupon}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* Footer help */}
              <div className="ch-help-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                  <span>¿Necesitás ayuda? {storeSettings.storeEmail
                    ? <a href={`mailto:${storeSettings.storeEmail}`}>Contactanos</a>
                    : <Link href="/contacto">Contactanos</Link>}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
