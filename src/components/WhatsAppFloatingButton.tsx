'use client';

import { useEffect, useState } from 'react';
import TrackedWhatsAppLink from './TrackedWhatsAppLink';

type WhatsAppSettings = {
  paymentWhatsappEnabled: boolean;
  whatsappFloatingEnabled: boolean;
  whatsappNumber: string;
  whatsappMessageTemplate: string;
};

export default function WhatsAppFloatingButton() {
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);

  useEffect(() => {
    fetch('/api/store-settings')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('No se pudo cargar WhatsApp')))
      .then((data) => setSettings(data))
      .catch(() => setSettings(null));
  }, []);

  if (!settings?.paymentWhatsappEnabled || !settings.whatsappFloatingEnabled || !settings.whatsappNumber) {
    return null;
  }

  const number = settings.whatsappNumber.replace(/\D/g, '');
  const url = `https://wa.me/${number}?text=${encodeURIComponent(settings.whatsappMessageTemplate)}`;

  return (
    <TrackedWhatsAppLink
      href={url}
      source="floating-button"
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-floating-button"
      aria-label="Contactar por WhatsApp"
    >
      <span aria-hidden="true">⌕</span>
      <span>WhatsApp</span>
    </TrackedWhatsAppLink>
  );
}
