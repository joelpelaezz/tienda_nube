'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getPaymentMethods, savePaymentMethods } from '../actions';
import ConfigSectionShell from '../components/ConfigSectionShell';

type EditableMethod = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  discountPercent: number | null;
  position: number;
  logoUrl: string | null;
};

const DEFAULT_PAYMENT_METHODS: Omit<EditableMethod, 'isActive' | 'discountPercent' | 'position'>[] = [
  { id: 'visa', name: 'Visa', type: 'card', logoUrl: 'https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/visa@2x.png' },
  { id: 'mastercard', name: 'Mastercard', type: 'card', logoUrl: 'https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/mastercard@2x.png' },
  { id: 'amex', name: 'American Express', type: 'card', logoUrl: 'https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/amex@2x.png' },
  { id: 'diners', name: 'DINERS', type: 'card', logoUrl: 'https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/diners@2x.png' },
  { id: 'mercadopago', name: 'Mercado Pago', type: 'gateway', logoUrl: 'https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/mercadopago@2x.png' },
  { id: 'transferencia', name: 'Transferencia bancaria', type: 'bank_transfer', logoUrl: null },
  { id: 'pagofacil', name: 'Pago Fácil', type: 'cash', logoUrl: 'https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/pagofacil@2x.png' },
  { id: 'rapipago', name: 'RapiPago', type: 'cash', logoUrl: 'https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/rapipago@2x.png' },
];

const SECTIONS: { type: string; label: string }[] = [
  { type: 'card', label: 'Tarjetas de crédito y débito' },
  { type: 'gateway', label: 'Pago en línea' },
  { type: 'bank_transfer', label: 'Billetera' },
  { type: 'cash', label: 'Pago en efectivo' },
];

// C4-TRACE: payment methods section keeps its own save scope, isolated from other topics.
export default function MediosPagoPage() {
  const [methods, setMethods] = useState<EditableMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPaymentMethods().then((stored) => {
      setMethods(DEFAULT_PAYMENT_METHODS.map((fallback) => {
        const existing = stored.find((method) => method.id === fallback.id);
        return {
          id: fallback.id,
          name: fallback.name,
          type: fallback.type,
          logoUrl: fallback.logoUrl,
          isActive: existing?.isActive ?? false,
          discountPercent: existing?.discountPercent ?? null,
          position: existing?.position ?? DEFAULT_PAYMENT_METHODS.indexOf(fallback),
        };
      }));
      setLoading(false);
    });
  }, []);

  const toggleMethod = (id: string) => {
    setMethods((current) => current.map((method) => method.id === id ? { ...method, isActive: !method.isActive } : method));
  };

  const updateDiscount = (id: string, value: string) => {
    setMethods((current) => current.map((method) => method.id === id
      ? { ...method, discountPercent: value === '' ? null : Number(value) }
      : method));
  };

  const handleSave = async () => {
    await savePaymentMethods(methods.map((method) => ({
      id: method.id,
      name: method.name,
      type: method.type,
      isActive: method.isActive,
      discountPercent: method.discountPercent,
      position: method.position,
      logoUrl: method.logoUrl,
    })));
  };

  if (loading) {
    return <div className="admin-page-loading">Cargando...</div>;
  }

  return (
    <ConfigSectionShell
      title="Medios de pago"
      description="Las formas de pago disponibles en tu tienda."
      onSave={handleSave}
    >
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Métodos de pago</h2>
        </div>
        <div className="admin-card-body">
          {SECTIONS.map((section, sectionIndex) => {
            const sectionMethods = methods.filter((method) => method.type === section.type);
            if (sectionMethods.length === 0) return null;
            return (
              <div key={section.type}>
                {sectionIndex > 0 && <div className="admin-setting-divider" />}
                <div className="pm-admin-section-label">{section.label}</div>
                <div className="pm-admin-list">
                  {sectionMethods.map((method) => (
                    <div key={method.id} className="pm-admin-row">
                      <label className="admin-toggle">
                        <input
                          type="checkbox"
                          checked={method.isActive}
                          onChange={() => toggleMethod(method.id)}
                        />
                        <span className="admin-toggle-slider" />
                      </label>
                      {method.logoUrl ? (
                        <Image
                          src={method.logoUrl}
                          alt={method.name}
                          width={40}
                          height={25}
                          className="pm-admin-logo"
                          style={{ objectFit: 'contain' }}
                        />
                      ) : (
                        <div className="pm-admin-logo-placeholder" style={{ width: 40, height: 25 }} />
                      )}
                      <div className="pm-admin-info">
                        <span className="pm-admin-name">{method.name}</span>
                      </div>
                      {method.type === 'bank_transfer' && (
                        <div className="pm-admin-discount">
                          <label className="pm-admin-discount-label" htmlFor={`payment-discount-${method.id}`}>Descuento</label>
                          <input
                            id={`payment-discount-${method.id}`}
                            type="number"
                            className="admin-input"
                            min="0"
                            max="100"
                            step="1"
                            value={method.discountPercent ?? ''}
                            title="Se aplica como descuento general; si el producto tiene precio especial por transferencia, ese precio tiene prioridad."
                            onChange={(event) => updateDiscount(method.id, event.target.value)}
                            aria-label={`Descuento por ${method.name} en porcentaje`}
                          />
                          <span className="pm-admin-discount-label">%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ConfigSectionShell>
  );
}
