'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils/format';
import type { PaymentMethodRow } from '@/app/admin/configuracion/actions';

interface PaymentMethodsModalProps {
  methods: PaymentMethodRow[];
  productPrice: number;
  productTransferPrice?: number | null;
}

export default function PaymentMethodsModal({ methods, productPrice, productTransferPrice = null }: PaymentMethodsModalProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => setOpen(false);
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, []);

  const activeMethods = methods.filter(m => m.isActive);
  const transferencia = activeMethods.find(m => m.id === 'transferencia');
  const mercadopago = activeMethods.find(m => m.id === 'mercadopago');
  const cashMethods = activeMethods.filter(m => m.type === 'cash');
  const creditCards = activeMethods.filter(m => m.type === 'card' || m.type === 'card_credit');
  const debitCards = activeMethods.filter(m => m.type === 'card_debit');

  const transferPrice = productTransferPrice != null
    ? productTransferPrice
    : transferencia?.discountPercent
      ? Math.round(productPrice * (1 - transferencia.discountPercent / 100))
      : productPrice;
  const transferDiscountPercent = productTransferPrice == null ? transferencia?.discountPercent ?? null : null;

  if (activeMethods.length === 0) return null;

  return (
    <>
      <button
        type="button"
        className="detalle-payment-link"
        onClick={() => setOpen(true)}
      >
        Ver medios de pago
      </button>

      <dialog
        ref={dialogRef}
        className="product-modal"
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false);
        }}
      >
        <div className="product-modal-content">
          <div className="product-modal-header">
            <h3>Medios de pago</h3>
            <button onClick={() => setOpen(false)} className="product-modal-close" aria-label="Cerrar">
              ✕
            </button>
          </div>
          <div className="product-modal-body">
            <div className="payment-methods-list">
              {/* Transferencia / Depósito */}
              {transferencia && (
                <div className="payment-method-item payment-method-transfer">
                  <div className="payment-method-name">
                    <span className="payment-method-icon">💵</span>
                    Transferencia o depósito
                  </div>
                  <div className="payment-method-detail">
                    {transferDiscountPercent || productTransferPrice != null ? (
                      <>
                        <strong>
                          {transferDiscountPercent ? `${transferDiscountPercent}% de descuento` : 'Precio especial por transferencia'}
                        </strong>
                        <div className="payment-method-prices">
                          <span className="payment-price-original">{formatPrice(productPrice)}</span>
                          <span className="payment-price-final">{formatPrice(transferPrice)}</span>
                        </div>
                        <p className="payment-method-note">
                          Estimación sobre el precio del producto, sin incluir el envío.
                        </p>
                      </>
                    ) : (
                      <p className="payment-method-note">Pago por transferencia bancaria</p>
                    )}
                  </div>
                </div>
              )}

              {/* Mercado Pago */}
              {mercadopago && (
                <div className="payment-method-item">
                  <div className="payment-method-name">
                    <span className="payment-method-icon">📱</span>
                    Mercado Pago
                  </div>
                  <div className="payment-method-detail">
                    <p className="payment-method-note">Pagá online con tu cuenta de Mercado Pago</p>
                  </div>
                </div>
              )}

              {/* Tarjetas de Crédito */}
              {creditCards.length > 0 && (
                <div className="payment-method-item">
                  <div className="payment-method-name">
                    <span className="payment-method-icon">💳</span>
                    Tarjetas de crédito
                  </div>
                  <div className="payment-method-cards">
                    {creditCards.map(card => (
                      <span key={card.id} className="payment-card-badge">
                        {card.logoUrl
                          ? <Image src={card.logoUrl} alt={card.name} width={40} height={24} />
                          : card.name}
                      </span>
                    ))}
                  </div>
                  <p className="payment-method-note">Hasta 12 cuotas fijas</p>
                </div>
              )}

              {/* Tarjetas de Débito */}
              {debitCards.length > 0 && (
                <div className="payment-method-item">
                  <div className="payment-method-name">
                    <span className="payment-method-icon">💳</span>
                    Tarjetas de débito
                  </div>
                  <div className="payment-method-cards">
                    {debitCards.map(card => (
                      <span key={card.id} className="payment-card-badge">
                        {card.logoUrl
                          ? <Image src={card.logoUrl} alt={card.name} width={40} height={24} />
                          : card.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Efectivo / Cash */}
              {cashMethods.length > 0 && (
                <div className="payment-method-item">
                  <div className="payment-method-name">
                    <span className="payment-method-icon">🏪</span>
                    Efectivo en puntos de pago
                  </div>
                  <div className="payment-method-cards">
                    {cashMethods.map(cash => (
                      <span key={cash.id} className="payment-card-badge">{cash.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="payment-methods-back"
            >
              Volver al producto
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
