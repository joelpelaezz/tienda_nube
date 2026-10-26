'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type FooterSettings = {
  storePhone: string;
  storeEmail: string;
  storeAddress: string;
  whatsappNumber: string;
  footerCopyrightText: string;
  footerConsumerEnabled: boolean;
  footerConsumerText: string;
  footerConsumerUrl: string;
  footerMadeInEnabled: boolean;
  footerMadeWithText: string;
  footerMadeInText: string;
  paymentMethods: Array<{ id: string; name: string; logoUrl: string | null; position: number }>;
  shippingMethods: Array<{ id: number; code: string; name: string; carrier: string; estimatedDays: string | null; position: number }>;
};

const DEFAULT_SETTINGS: FooterSettings = {
  storePhone: '',
  storeEmail: '',
  storeAddress: '',
  whatsappNumber: '',
  footerCopyrightText: 'Copyright Tendencia Shop - 20323692352 - 2026.',
  footerConsumerEnabled: true,
  footerConsumerText: 'Defensa del consumidor',
  footerConsumerUrl: 'https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario',
  footerMadeInEnabled: true,
  footerMadeWithText: 'Hecho con',
  footerMadeInText: 'en Tucumán',
  paymentMethods: [],
  shippingMethods: [],
};

export default function Footer() {
  const [settings, setSettings] = useState<FooterSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    fetch('/api/store-settings')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('No se pudo cargar el footer')))
      .then((data) => setSettings({
        storePhone: typeof data.storePhone === 'string' ? data.storePhone : DEFAULT_SETTINGS.storePhone,
        storeEmail: typeof data.storeEmail === 'string' ? data.storeEmail : DEFAULT_SETTINGS.storeEmail,
        storeAddress: typeof data.storeAddress === 'string' ? data.storeAddress : DEFAULT_SETTINGS.storeAddress,
        whatsappNumber: typeof data.whatsappNumber === 'string' ? data.whatsappNumber : DEFAULT_SETTINGS.whatsappNumber,
        footerCopyrightText: typeof data.footerCopyrightText === 'string' ? data.footerCopyrightText : DEFAULT_SETTINGS.footerCopyrightText,
        footerConsumerEnabled: data.footerConsumerEnabled !== false,
        footerConsumerText: typeof data.footerConsumerText === 'string' ? data.footerConsumerText : DEFAULT_SETTINGS.footerConsumerText,
        footerConsumerUrl: typeof data.footerConsumerUrl === 'string' ? data.footerConsumerUrl : DEFAULT_SETTINGS.footerConsumerUrl,
        footerMadeInEnabled: data.footerMadeInEnabled !== false,
        footerMadeWithText: typeof data.footerMadeWithText === 'string' ? data.footerMadeWithText : DEFAULT_SETTINGS.footerMadeWithText,
        footerMadeInText: typeof data.footerMadeInText === 'string' ? data.footerMadeInText : DEFAULT_SETTINGS.footerMadeInText,
        paymentMethods: Array.isArray(data.paymentMethods) ? data.paymentMethods : [],
        shippingMethods: Array.isArray(data.shippingMethods) ? data.shippingMethods : [],
      }))
      .catch(() => undefined);
  }, []);

  // C4-TRACE: footer contact details come only from store settings, never personal hardcoded values.
  const footerPhone = settings.storePhone || settings.whatsappNumber;
  const footerPhoneHref = settings.storePhone
    ? `tel:${settings.storePhone.replace(/[^\d+]/g, '')}`
    : settings.whatsappNumber
      ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`
      : '';

  return (
    <>
      {/* Footer principal */}
      <footer className="footer">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Navegación */}
            <div>
              <h4 className="footer-title">Navegación</h4>
              <ul className="footer-list">
                <li>
                  <Link href="/" className="hover:text-primary">
                    Inicio
                  </Link>
                </li>
                <li>
                  <Link href="/productos/" className="hover:text-primary">
                    Productos
                  </Link>
                </li>
                <li>
                  <Link href="/contacto/" className="hover:text-primary">
                    Contacto
                  </Link>
                </li>
              </ul>
            </div>

            {/* Medios de pago y envío */}
            <div>
              {settings.paymentMethods.length > 0 && <>
                <h4 className="footer-title">Medios de pago</h4>
                <div className="footer-payment-icons">
                  {settings.paymentMethods.map((method) => method.logoUrl ? (
                    <Image
                      key={method.id}
                      src={method.logoUrl}
                      alt={method.name}
                      width={48}
                      height={30}
                      className="footer-payment-icon"
                    />
                  ) : (
                    <span key={method.id} className="footer-payment-icon">{method.name}</span>
                  ))}
                </div>
              </>}

              {settings.shippingMethods.length > 0 && (
                <>
                  <h4 className="footer-title">Formas de envío</h4>
                  <div className="footer-shipping-methods">
                    {settings.shippingMethods.map((method) => (
                      <span key={method.id} className="footer-shipping-method">
                        {method.name}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Contacto */}
            {(footerPhone || settings.storeEmail || settings.storeAddress) && <div>
              <h4 className="footer-title">Contactanos</h4>
              <ul className="footer-list">
                {footerPhone && (
                  <li className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                    <a href={footerPhoneHref} className="hover:text-primary">{footerPhone}</a>
                  </li>
                )}
                {settings.storeEmail && <li className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${settings.storeEmail}`} className="hover:text-primary">
                    {settings.storeEmail}
                  </a>
                </li>}
                {settings.storeAddress && <li className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {settings.storeAddress}
                </li>}
              </ul>
            </div>}
          </div>
        </div>
      </footer>

      {/* Footer legal */}
      <div className="footer-legal">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-500">{settings.footerCopyrightText}</p>
              {settings.footerConsumerEnabled && (
                <a href={settings.footerConsumerUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-primary transition-colors">
                  {settings.footerConsumerText}
                </a>
              )}
            </div>
            {settings.footerMadeInEnabled && <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{settings.footerMadeWithText}</span>
              <span>{settings.footerMadeInText}</span>
            </div>}
          </div>
        </div>
      </div>
    </>
  );
}
