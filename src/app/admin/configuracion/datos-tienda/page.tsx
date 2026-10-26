'use client';

import { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '../actions';
import ConfigSectionShell from '../components/ConfigSectionShell';
import { TextField, ToggleField } from '../components/fields';

type DatosTienda = {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  showPhoneInHeader: boolean;
};

const EMPTY: DatosTienda = {
  storeName: '',
  storeEmail: '',
  storePhone: '',
  storeAddress: '',
  showPhoneInHeader: false,
};

// C4-TRACE: contact data section saves only the store identity fields.
export default function DatosTiendaPage() {
  const [values, setValues] = useState<DatosTienda>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then((settings) => {
      setValues({
        storeName: settings.storeName,
        storeEmail: settings.storeEmail,
        storePhone: settings.storePhone,
        storeAddress: settings.storeAddress,
        showPhoneInHeader: settings.showPhoneInHeader,
      });
      setLoading(false);
    });
  }, []);

  const update = <K extends keyof DatosTienda>(key: K, value: DatosTienda[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    await saveSettings({
      storeName: values.storeName,
      storeEmail: values.storeEmail,
      storePhone: values.storePhone,
      storeAddress: values.storeAddress,
      showPhoneInHeader: values.showPhoneInHeader,
    });
  };

  if (loading) {
    return <div className="admin-page-loading">Cargando...</div>;
  }

  return (
    <ConfigSectionShell
      title="Datos de la tienda"
      description="Información de contacto que ven tus clientes en la tienda."
      onSave={handleSave}
    >
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Datos del negocio</h2>
        </div>
        <div className="admin-card-body">
          <TextField
            id="config-store-name"
            label="Nombre de la tienda"
            value={values.storeName}
            onChange={(value) => update('storeName', value)}
            placeholder="Mi Tienda"
          />
          <TextField
            id="config-store-email"
            label="Email"
            type="email"
            value={values.storeEmail}
            onChange={(value) => update('storeEmail', value)}
            placeholder="contacto@mitienda.com"
            hint="Se muestra en la página de contacto y en el checkout. Si lo dejás vacío, no se publica ningún email."
            style={{ marginTop: '12px' }}
          />
          <TextField
            id="config-store-phone"
            label="Teléfono"
            type="tel"
            value={values.storePhone}
            onChange={(value) => update('storePhone', value)}
            placeholder="011 1234 5678"
            style={{ marginTop: '12px' }}
          />
          <TextField
            id="config-store-address"
            label="Dirección"
            value={values.storeAddress}
            onChange={(value) => update('storeAddress', value)}
            placeholder="Calle 123, Ciudad"
            style={{ marginTop: '12px' }}
          />
          <ToggleField
            label="Mostrar teléfono en el encabezado"
            description="El teléfono ya está disponible en la página de contacto."
            checked={values.showPhoneInHeader}
            onChange={(checked) => update('showPhoneInHeader', checked)}
            style={{ marginTop: '16px' }}
          />
        </div>
      </div>
    </ConfigSectionShell>
  );
}
