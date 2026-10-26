'use client';

import { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '../actions';
import ConfigSectionShell from '../components/ConfigSectionShell';
import { SelectField, TextField, TextAreaField, ToggleField } from '../components/fields';

type WhatsAppSettings = {
  paymentWhatsappEnabled: boolean;
  whatsappFloatingEnabled: boolean;
  whatsappCheckoutEnabled: boolean;
  whatsappOrderMode: 'quick' | 'formal' | 'both';
  whatsappButtonText: string;
  whatsappNumber: string;
  whatsappMessageTemplate: string;
};

const EMPTY: WhatsAppSettings = {
  paymentWhatsappEnabled: true,
  whatsappFloatingEnabled: false,
  whatsappCheckoutEnabled: true,
  whatsappOrderMode: 'quick',
  whatsappButtonText: 'Consultar por WhatsApp',
  whatsappNumber: '',
  whatsappMessageTemplate: '¡Hola! Quiero consultar sobre mi pedido:',
};

// C4-TRACE: WhatsApp settings live in their own section, matching the reference admin.
export default function WhatsAppPage() {
  const [values, setValues] = useState<WhatsAppSettings>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then((settings) => {
      setValues({
        paymentWhatsappEnabled: settings.paymentWhatsappEnabled,
        whatsappFloatingEnabled: settings.whatsappFloatingEnabled,
        whatsappCheckoutEnabled: settings.whatsappCheckoutEnabled,
        whatsappOrderMode: settings.whatsappOrderMode,
        whatsappButtonText: settings.whatsappButtonText,
        whatsappNumber: settings.whatsappNumber,
        whatsappMessageTemplate: settings.whatsappMessageTemplate,
      });
      setLoading(false);
    });
  }, []);

  const update = <K extends keyof WhatsAppSettings>(key: K, value: WhatsAppSettings[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    await saveSettings({
      paymentWhatsappEnabled: values.paymentWhatsappEnabled,
      whatsappFloatingEnabled: values.whatsappFloatingEnabled,
      whatsappCheckoutEnabled: values.whatsappCheckoutEnabled,
      whatsappOrderMode: values.whatsappOrderMode,
      whatsappButtonText: values.whatsappButtonText,
      whatsappNumber: values.whatsappNumber,
      whatsappMessageTemplate: values.whatsappMessageTemplate,
    });
  };

  if (loading) {
    return <div className="admin-page-loading">Cargando...</div>;
  }

  return (
    <ConfigSectionShell
      title="Botón de WhatsApp"
      description="El número de WhatsApp y dónde se muestra en tu tienda."
      onSave={handleSave}
      helpText="¿Cómo agregar el botón de WhatsApp en mi tienda?"
      helpHref="https://ayuda.tiendanube.com/es_ES/comunicacion/como-configurar-el-boton-de-whatsapp-en-mis-productos"
    >
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Botón de WhatsApp</h2>
        </div>
        <div className="admin-card-body">
          <TextField
            id="config-whatsapp-number"
            label="Número de teléfono"
            type="tel"
            value={values.whatsappNumber}
            onChange={(value) => update('whatsappNumber', value)}
            placeholder="+54 9 11 1234 5678"
            hint="Escribí el número con prefijo internacional, sin espacios ni símbolos."
          />
          <ToggleField
            label="Mostrar un botón en la tienda para que puedan escribirte por WhatsApp"
            checked={values.paymentWhatsappEnabled}
            onChange={(checked) => update('paymentWhatsappEnabled', checked)}
            style={{ marginTop: '16px' }}
          />
        </div>
      </div>

      {values.paymentWhatsappEnabled && (
        <>
          <div className="admin-card" style={{ marginTop: '16px' }}>
            <div className="admin-card-header">
              <h2 className="admin-card-title">Dónde mostrarlo</h2>
            </div>
            <div className="admin-card-body">
              <ToggleField
                label="Botón flotante"
                description="Mostrar WhatsApp en toda la tienda."
                checked={values.whatsappFloatingEnabled}
                onChange={(checked) => update('whatsappFloatingEnabled', checked)}
              />
              <ToggleField
                label="WhatsApp en el checkout"
                description="Mostrar WhatsApp como alternativa de compra."
                checked={values.whatsappCheckoutEnabled}
                onChange={(checked) => update('whatsappCheckoutEnabled', checked)}
                style={{ marginTop: '12px' }}
              />
              <SelectField
                id="config-whatsapp-order-mode"
                label="Modo de checkout"
                value={values.whatsappOrderMode}
                onChange={(value) => update('whatsappOrderMode', value as WhatsAppSettings['whatsappOrderMode'])}
                options={[
                  { value: 'quick', label: 'Consulta rápida' },
                  { value: 'formal', label: 'Pedido formal con reserva' },
                  { value: 'both', label: 'Consulta rápida y pedido formal' },
                ]}
                style={{ marginTop: '16px' }}
              />
              <TextField
                id="config-whatsapp-button-text"
                label="Texto del botón"
                value={values.whatsappButtonText}
                onChange={(value) => update('whatsappButtonText', value)}
                placeholder="Consultar por WhatsApp"
                style={{ marginTop: '12px' }}
              />
              <TextAreaField
                id="config-whatsapp-template"
                label="Mensaje predefinido"
                value={values.whatsappMessageTemplate}
                onChange={(value) => update('whatsappMessageTemplate', value)}
                placeholder="¡Hola! Quiero consultar sobre mi pedido:"
                rows={3}
                style={{ marginTop: '12px' }}
              />
            </div>
          </div>
        </>
      )}
    </ConfigSectionShell>
  );
}
