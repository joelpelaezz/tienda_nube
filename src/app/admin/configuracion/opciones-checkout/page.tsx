'use client';

import { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '../actions';
import ConfigSectionShell from '../components/ConfigSectionShell';
import { TextAreaField, TextField, ToggleField } from '../components/fields';

type CheckoutOptions = {
  checkoutRequirePhone: boolean;
  checkoutNoteEnabled: boolean;
  checkoutNoteLabel: string;
  checkoutNoteRequired: boolean;
  checkoutTrackingMessage: string;
};

const EMPTY: CheckoutOptions = {
  checkoutRequirePhone: false,
  checkoutNoteEnabled: true,
  checkoutNoteLabel: 'Notas del pedido',
  checkoutNoteRequired: false,
  checkoutTrackingMessage: 'Te enviamos la confirmación a tu email. Preparamos tu pedido y te notificaremos cuando esté listo para enviar.',
};

// C4-TRACE: checkout options section controls what the buyer must provide.
export default function OpcionesCheckoutPage() {
  const [values, setValues] = useState<CheckoutOptions>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then((settings) => {
      setValues({
        checkoutRequirePhone: settings.checkoutRequirePhone,
        checkoutNoteEnabled: settings.checkoutNoteEnabled,
        checkoutNoteLabel: settings.checkoutNoteLabel,
        checkoutNoteRequired: settings.checkoutNoteRequired,
        checkoutTrackingMessage: settings.checkoutTrackingMessage,
      });
      setLoading(false);
    });
  }, []);

  const update = <K extends keyof CheckoutOptions>(key: K, value: CheckoutOptions[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    await saveSettings({
      checkoutRequirePhone: values.checkoutRequirePhone,
      checkoutNoteEnabled: values.checkoutNoteEnabled,
      checkoutNoteLabel: values.checkoutNoteLabel,
      checkoutNoteRequired: values.checkoutNoteRequired,
      checkoutTrackingMessage: values.checkoutTrackingMessage,
    });
  };

  if (loading) {
    return <div className="admin-page-loading">Cargando...</div>;
  }

  return (
    <ConfigSectionShell
      title="Opciones del checkout"
      description="Qué información le pedís a tu cliente durante la compra."
      onSave={handleSave}
    >
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Información del cliente</h2>
        </div>
        <div className="admin-card-body">
          <ToggleField
            label="Pedir teléfono de contacto"
            description="El teléfono se vuelve obligatorio para completar el pedido."
            checked={values.checkoutRequirePhone}
            onChange={(checked) => update('checkoutRequirePhone', checked)}
          />
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: '16px' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">Nota del cliente</h2>
        </div>
        <div className="admin-card-body">
          <ToggleField
            label="Mostrar el campo de notas"
            description="Tu cliente puede dejar indicaciones sobre el pedido."
            checked={values.checkoutNoteEnabled}
            onChange={(checked) => update('checkoutNoteEnabled', checked)}
          />
          {values.checkoutNoteEnabled && (
            <>
              <TextField
                id="config-checkout-note-label"
                label="Nombre del campo"
                value={values.checkoutNoteLabel}
                onChange={(value) => update('checkoutNoteLabel', value)}
                placeholder="Notas del pedido"
                style={{ marginTop: '16px' }}
              />
              <label className="admin-checkbox-label" style={{ marginTop: '12px' }}>
                <input
                  type="checkbox"
                  checked={values.checkoutNoteRequired}
                  onChange={(event) => update('checkoutNoteRequired', event.target.checked)}
                />
                <span>Marcar el campo como obligatorio</span>
              </label>
            </>
          )}
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: '16px' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">Mensaje en la página de seguimiento</h2>
        </div>
        <div className="admin-card-body">
          <TextAreaField
            id="config-checkout-tracking-message"
            label="Mensaje para tus clientes"
            value={values.checkoutTrackingMessage}
            onChange={(value) => update('checkoutTrackingMessage', value)}
            placeholder="¡Gracias por tu compra! Enviaremos tu pedido a la brevedad."
            rows={3}
            hint="Esta página permite a tu cliente saber el estado del envío."
          />
        </div>
      </div>
    </ConfigSectionShell>
  );
}
