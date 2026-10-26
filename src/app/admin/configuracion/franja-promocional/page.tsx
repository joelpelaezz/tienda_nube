'use client';

import { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '../actions';
import ConfigSectionShell from '../components/ConfigSectionShell';
import { TextField, ToggleField } from '../components/fields';

type Franja = {
  promoBarEnabled: boolean;
  promoBarText: string;
  promoBarLink: string;
};

const EMPTY: Franja = {
  promoBarEnabled: true,
  promoBarText: 'Descuentos exclusivos para comprar al por mayor - ¡contactanos!',
  promoBarLink: '',
};

// C4-TRACE: promotional bar section saved independently from other topics.
export default function FranjaPromocionalPage() {
  const [values, setValues] = useState<Franja>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then((settings) => {
      setValues({
        promoBarEnabled: settings.promoBarEnabled,
        promoBarText: settings.promoBarText,
        promoBarLink: settings.promoBarLink,
      });
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    await saveSettings({
      promoBarEnabled: values.promoBarEnabled,
      promoBarText: values.promoBarText,
      promoBarLink: values.promoBarLink,
    });
  };

  if (loading) {
    return <div className="admin-page-loading">Cargando...</div>;
  }

  return (
    <ConfigSectionShell
      title="Franja promocional"
      description="El aviso rotativo que aparece arriba de todo en la tienda."
      onSave={handleSave}
    >
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Franja promocional</h2>
        </div>
        <div className="admin-card-body">
          <ToggleField
            label="Mostrar franja promocional"
            description="La franja aparece en la parte superior de la tienda, en computadora y en celular."
            checked={values.promoBarEnabled}
            onChange={(checked) => setValues((current) => ({ ...current, promoBarEnabled: checked }))}
          />
          <TextField
            id="config-promo-text"
            label="Texto de la franja"
            value={values.promoBarText}
            onChange={(value) => setValues((current) => ({ ...current, promoBarText: value }))}
            placeholder="Descuentos exclusivos para comprar al por mayor"
            style={{ marginTop: '16px' }}
          />
          <TextField
            id="config-promo-link"
            label="Link de destino (opcional)"
            type="url"
            value={values.promoBarLink}
            onChange={(value) => setValues((current) => ({ ...current, promoBarLink: value }))}
            placeholder="https://... o /productos"
            hint="Si lo completás, la franja se convierte en un link."
            style={{ marginTop: '12px' }}
          />
        </div>
      </div>
    </ConfigSectionShell>
  );
}
