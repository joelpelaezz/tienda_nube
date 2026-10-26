'use client';

import { useState } from 'react';

// C4-TRACE: each configuration section owns its own save scope, errors and feedback.

type ConfigSectionShellProps = {
  title: string;
  description: string;
  onSave: () => Promise<void>;
  saveLabel?: string;
  helpText?: string;
  helpHref?: string;
  children: React.ReactNode;
};

export default function ConfigSectionShell({
  title,
  description,
  onSave,
  saveLabel = 'Guardar cambios',
  helpText,
  helpHref,
  children,
}: ConfigSectionShellProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await onSave();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="config-section">
      <div className="config-section-header">
        <h1 className="admin-page-title">{title}</h1>
        <p className="admin-page-subtitle">{description}</p>
      </div>

      <div className="config-section-cards">{children}</div>

      <div className="config-section-actions">
        {error && <div className="admin-error-box" role="alert">{error}</div>}
        <div className="config-section-actions-row">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Guardando...' : saveLabel}
          </button>
          {saved && <span className="admin-save-confirm">✓ Cambios guardados</span>}
        </div>
        {helpText && helpHref && (
          <a className="config-section-help" href={helpHref} target="_blank" rel="noopener noreferrer">
            {helpText}
          </a>
        )}
      </div>
    </div>
  );
}
