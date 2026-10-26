'use client';

import { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '../actions';
import ConfigSectionShell from '../components/ConfigSectionShell';
import { ToggleField } from '../components/fields';

// C4-TRACE: image optimization section with its own save scope.
export default function OptimizacionImagenesPage() {
  const [convertToWebp, setConvertToWebp] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then((settings) => {
      setConvertToWebp(settings.imageConversionToWebp);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    await saveSettings({ imageConversionToWebp: convertToWebp });
  };

  if (loading) {
    return <div className="admin-page-loading">Cargando...</div>;
  }

  return (
    <ConfigSectionShell
      title="Optimización de imágenes"
      description="Convertí tus imágenes a WebP para que la tienda cargue más rápido."
      onSave={handleSave}
    >
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Optimización de imágenes</h2>
        </div>
        <div className="admin-card-body">
          <ToggleField
            label="Convertir imágenes a WebP al guardarlas"
            description="Reduce el peso de JPEG y PNG para mejorar la velocidad de la tienda. Los GIF se conservan sin convertir."
            checked={convertToWebp}
            onChange={setConvertToWebp}
          />
        </div>
      </div>
    </ConfigSectionShell>
  );
}
