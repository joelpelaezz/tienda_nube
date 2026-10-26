'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/store';
import Image from 'next/image';
import Link from 'next/link';

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, updateAvailableStock, getTotal } = useCartStore();
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [transferConfig, setTransferConfig] = useState<{ active: boolean; discountPercent: number | null }>({
    active: false,
    discountPercent: null,
  });
  const itemIdentity = JSON.stringify(items.map((item) => ({ productId: item.id, variantId: item.variantId ?? null })));

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    fetch('/api/store-settings', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudo leer la configuración de pagos.');
        const settings = await response.json() as {
          paymentMethods?: Array<{ id: string; discountPercent?: number | null }>;
        };
        const transfer = settings.paymentMethods?.find((method) => method.id === 'transferencia');
        setTransferConfig({ active: Boolean(transfer), discountPercent: transfer?.discountPercent ?? null });
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setTransferConfig({ active: false, discountPercent: null });
        }
      });
    return () => controller.abort();
  }, [isOpen]);

  useEffect(() => {
    const requestedItems = JSON.parse(itemIdentity) as Array<{ productId: number; variantId: number | null }>;
    if (!isOpen || requestedItems.length === 0) {
      setAvailabilityLoading(false);
      setAvailabilityError(false);
      return;
    }

    const controller = new AbortController();
    setAvailabilityLoading(true);
    setAvailabilityError(false);
    fetch('/api/inventory/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: requestedItems }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudo actualizar el stock del carrito.');
        const data = await response.json() as { availability: Record<string, number | null> };
        for (const item of requestedItems) {
          const key = `${item.productId}:${item.variantId ?? 'base'}`;
          if (Object.prototype.hasOwnProperty.call(data.availability, key)) {
            updateAvailableStock(item.productId, item.variantId, data.availability[key]);
          }
        }
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setAvailabilityError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAvailabilityLoading(false);
      });

    return () => controller.abort();
  }, [isOpen, itemIdentity, updateAvailableStock]);

  const formatPrice = (amount: number) => {
    return `$${(amount / 100).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };
  const hasUnavailableItems = items.some((item) => (
    item.availableStock != null && (item.availableStock === 0 || item.quantity > item.availableStock)
  ));
  const transferTotal = items.reduce((sum, item) => {
    const unitPrice = item.transferPrice != null
      ? item.transferPrice
      : transferConfig.discountPercent != null
        ? Math.round(item.price * (1 - transferConfig.discountPercent / 100))
        : item.price;
    return sum + unitPrice * item.quantity;
  }, 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[101] transition-opacity"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[101] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold tracking-widest uppercase">Carrito de compras</h2>
          <button
            onClick={closeCart}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm">Tu carrito está vacío</p>
              <Link
                href="/productos/"
                className="btn btn-secondary text-xs"
                onClick={closeCart}
              >
                Ver productos
              </Link>
            </div>
          ) : (
            <>
              {/* Items */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {items.map((item) => {
                  const availableStock = item.availableStock;
                  const hasAvailability = availableStock !== null && availableStock !== undefined;
                  const exceedsAvailability = hasAvailability && item.quantity > availableStock;
                  const hasNoAvailability = hasAvailability && availableStock === 0;

                  return (
                    <div key={`${item.id}-${item.variantId ?? item.variant ?? 'base'}`} className="flex gap-4 pb-4 border-b border-gray-50">
                      <div className="relative w-20 h-20 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Sin foto</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold truncate">{item.name}</h3>
                        {item.variant && (
                          <p className="text-xs text-gray-400 mt-0.5">{item.variant}</p>
                        )}
                        <p className="text-sm font-bold mt-1 text-primary">
                          {formatPrice(item.price)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1, item.variantId ?? null)}
                            className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors text-sm font-bold"
                            aria-label="Disminuir cantidad"
                          >
                            −
                          </button>
                          <span className="text-sm font-bold min-w-[24px] text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.variantId ?? null)}
                            className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors text-sm font-bold"
                            aria-label="Aumentar cantidad"
                            disabled={availabilityLoading || (hasAvailability && item.quantity >= availableStock)}
                          >
                            +
                          </button>
                        </div>
                        {hasAvailability && (
                          <p className={`text-xs mt-1 ${hasNoAvailability || exceedsAvailability ? 'text-red-600' : 'text-gray-500'}`} role={hasNoAvailability || exceedsAvailability ? 'alert' : undefined}>
                            {hasNoAvailability
                              ? 'Sin stock disponible'
                              : exceedsAvailability
                                ? `Solo quedan ${availableStock} disponibles; reducí la cantidad para continuar.`
                                : `Disponibles: ${availableStock}`}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Subtotal:</span>
                  <span className="text-lg font-bold">{formatPrice(getTotal())}</span>
                </div>
                {transferConfig.active && (
                  <div className="text-xs text-gray-400 text-center" aria-live="polite">
                    Estimado por transferencia: {formatPrice(transferTotal)}
                  </div>
                )}
                {availabilityError && (
                  <p className="text-xs text-amber-700 text-center" role="status">
                    No pudimos actualizar el inventario. Se volverá a validar al iniciar la compra.
                  </p>
                )}
                {availabilityLoading || hasUnavailableItems ? (
                  <button type="button" className="add-to-cart-btn block text-center" disabled>
                    {availabilityLoading ? 'Actualizando stock…' : 'Revisá el stock y las cantidades'}
                  </button>
                ) : (
                  <Link
                    href="/checkout/"
                    className="add-to-cart-btn block text-center"
                    onClick={closeCart}
                  >
                    Iniciar Compra
                  </Link>
                )}
                <Link
                  href="/productos/"
                  className="btn btn-secondary w-full block text-center text-xs"
                  onClick={closeCart}
                >
                  Ver más productos
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
