'use client';

import { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '../actions';
import ConfigSectionShell from '../components/ConfigSectionShell';
import { TextField, ToggleField } from '../components/fields';

type RedesCompartir = {
  showSocialInFooter: boolean;
  instagramUrl: string;
  facebookUrl: string;
  twitterUrl: string;
  publicSiteUrl: string;
  socialShareText: string;
  socialShareImageUrl: string;
};

const EMPTY: RedesCompartir = {
  showSocialInFooter: false,
  instagramUrl: '',
  facebookUrl: '',
  twitterUrl: '',
  publicSiteUrl: 'https://www.tendenciashop.com.ar',
  socialShareText: 'Mirá este producto: {product}',
  socialShareImageUrl: '',
};

// C4-TRACE: social profiles and share metadata section.
export default function RedesCompartirPage() {
  const [values, setValues] = useState<RedesCompartir>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then((settings) => {
      setValues({
        showSocialInFooter: settings.showSocialInFooter,
        instagramUrl: settings.instagramUrl,
        facebookUrl: settings.facebookUrl,
        twitterUrl: settings.twitterUrl,
        publicSiteUrl: settings.publicSiteUrl,
        socialShareText: settings.socialShareText,
        socialShareImageUrl: settings.socialShareImageUrl,
      });
      setLoading(false);
    });
  }, []);

  const update = <K extends keyof RedesCompartir>(key: K, value: RedesCompartir[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    await saveSettings({
      showSocialInFooter: values.showSocialInFooter,
      instagramUrl: values.instagramUrl,
      facebookUrl: values.facebookUrl,
      twitterUrl: values.twitterUrl,
      publicSiteUrl: values.publicSiteUrl,
      socialShareText: values.socialShareText,
      socialShareImageUrl: values.socialShareImageUrl,
    });
  };

  if (loading) {
    return <div className="admin-page-loading">Cargando...</div>;
  }

  return (
    <ConfigSectionShell
      title="Redes y compartir"
      description="Tus redes sociales y cómo se ven tus productos cuando los comparten."
      onSave={handleSave}
    >
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Redes sociales</h2>
        </div>
        <div className="admin-card-body">
          <ToggleField
            label="Mostrar redes sociales en el pie de página"
            checked={values.showSocialInFooter}
            onChange={(checked) => update('showSocialInFooter', checked)}
          />
          <TextField
            id="config-instagram"
            label="Instagram"
            type="url"
            value={values.instagramUrl}
            onChange={(value) => update('instagramUrl', value)}
            placeholder="https://instagram.com/tu-tienda"
            style={{ marginTop: '16px' }}
          />
          <TextField
            id="config-facebook"
            label="Facebook"
            type="url"
            value={values.facebookUrl}
            onChange={(value) => update('facebookUrl', value)}
            placeholder="https://facebook.com/tu-tienda"
            style={{ marginTop: '12px' }}
          />
          <TextField
            id="config-twitter"
            label="Twitter"
            type="url"
            value={values.twitterUrl}
            onChange={(value) => update('twitterUrl', value)}
            placeholder="https://x.com/tu-tienda"
            style={{ marginTop: '12px' }}
          />
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: '16px' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">Compartir productos</h2>
        </div>
        <div className="admin-card-body">
          <TextField
            id="config-public-site-url"
            label="URL pública de la tienda"
            type="url"
            value={values.publicSiteUrl}
            onChange={(value) => update('publicSiteUrl', value)}
            placeholder="https://www.tendenciashop.com.ar"
            hint="Se usa para armar los enlaces que se comparten en redes."
          />
          <TextField
            id="config-share-text"
            label="Texto para compartir"
            value={values.socialShareText}
            onChange={(value) => update('socialShareText', value)}
            placeholder="Mirá este producto: {product}"
            hint="Usá {product} para insertar el nombre del producto."
            style={{ marginTop: '12px' }}
          />
          <TextField
            id="config-share-image"
            label="Imagen para compartir"
            type="url"
            value={values.socialShareImageUrl}
            onChange={(value) => update('socialShareImageUrl', value)}
            placeholder="https://... o /images/mi-imagen.jpg"
            hint="Si lo dejás vacío se usa la primera imagen del producto."
            style={{ marginTop: '12px' }}
          />
        </div>
      </div>
    </ConfigSectionShell>
  );
}
