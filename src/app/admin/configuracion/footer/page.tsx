'use client';

import { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '../actions';
import ConfigSectionShell from '../components/ConfigSectionShell';
import { TextField, ToggleField } from '../components/fields';

type FooterSettings = {
  footerCopyrightText: string;
  footerConsumerEnabled: boolean;
  footerConsumerText: string;
  footerConsumerUrl: string;
  footerMadeInEnabled: boolean;
  footerMadeWithText: string;
  footerMadeInText: string;
};

const EMPTY: FooterSettings = {
  footerCopyrightText: 'Copyright Tendencia Shop - 20323692352 - 2026.',
  footerConsumerEnabled: true,
  footerConsumerText: 'Defensa del consumidor',
  footerConsumerUrl: 'https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario',
  footerMadeInEnabled: true,
  footerMadeWithText: 'Hecho con',
  footerMadeInText: 'en Tucumán',
};

// C4-TRACE: footer legal texts section.
export default function FooterPage() {
  const [values, setValues] = useState<FooterSettings>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then((settings) => {
      setValues({
        footerCopyrightText: settings.footerCopyrightText,
        footerConsumerEnabled: settings.footerConsumerEnabled,
        footerConsumerText: settings.footerConsumerText,
        footerConsumerUrl: settings.footerConsumerUrl,
        footerMadeInEnabled: settings.footerMadeInEnabled,
        footerMadeWithText: settings.footerMadeWithText,
        footerMadeInText: settings.footerMadeInText,
      });
      setLoading(false);
    });
  }, []);

  const update = <K extends keyof FooterSettings>(key: K, value: FooterSettings[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    await saveSettings({
      footerCopyrightText: values.footerCopyrightText,
      footerConsumerEnabled: values.footerConsumerEnabled,
      footerConsumerText: values.footerConsumerText,
      footerConsumerUrl: values.footerConsumerUrl,
      footerMadeInEnabled: values.footerMadeInEnabled,
      footerMadeWithText: values.footerMadeWithText,
      footerMadeInText: values.footerMadeInText,
    });
  };

  if (loading) {
    return <div className="admin-page-loading">Cargando...</div>;
  }

  return (
    <ConfigSectionShell
      title="Footer"
      description="Copyright, enlaces legales y textos del pie de la tienda."
      onSave={handleSave}
    >
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Información legal</h2>
        </div>
        <div className="admin-card-body">
          <TextField
            id="config-footer-copyright"
            label="Copyright"
            value={values.footerCopyrightText}
            onChange={(value) => update('footerCopyrightText', value)}
          />
          <ToggleField
            label="Mostrar Defensa del consumidor"
            checked={values.footerConsumerEnabled}
            onChange={(checked) => update('footerConsumerEnabled', checked)}
            style={{ marginTop: '16px' }}
          />
          {values.footerConsumerEnabled && (
            <>
              <TextField
                id="config-footer-consumer-text"
                label="Texto del enlace"
                value={values.footerConsumerText}
                onChange={(value) => update('footerConsumerText', value)}
                style={{ marginTop: '12px' }}
              />
              <TextField
                id="config-footer-consumer-url"
                label="URL del enlace"
                type="url"
                value={values.footerConsumerUrl}
                onChange={(value) => update('footerConsumerUrl', value)}
                style={{ marginTop: '12px' }}
              />
            </>
          )}
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: '16px' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">Leyenda de ubicación</h2>
        </div>
        <div className="admin-card-body">
          <ToggleField
            label="Mostrar leyenda de ubicación"
            checked={values.footerMadeInEnabled}
            onChange={(checked) => update('footerMadeInEnabled', checked)}
          />
          {values.footerMadeInEnabled && (
            <>
              <TextField
                id="config-footer-made-with"
                label="Texto previo"
                value={values.footerMadeWithText}
                onChange={(value) => update('footerMadeWithText', value)}
                style={{ marginTop: '12px' }}
              />
              <TextField
                id="config-footer-made-in"
                label="Texto de ubicación"
                value={values.footerMadeInText}
                onChange={(value) => update('footerMadeInText', value)}
                style={{ marginTop: '12px' }}
              />
            </>
          )}
        </div>
      </div>
    </ConfigSectionShell>
  );
}
