'use client';

import { useState, useTransition } from 'react';
import {
  createManagedVariantOption,
  createManagedVariantType,
  toggleManagedVariantOption,
  toggleManagedVariantType,
  updateManagedVariantOption,
  updateManagedVariantType,
  type ManagedVariantType,
  type VariantPresentation,
} from './actions';

type Props = { initialTypes: ManagedVariantType[] };

const presentationLabels: Record<VariantPresentation, string> = { text: 'Texto', color: 'Color', image: 'Imagen' };

export default function VariantManager({ initialTypes }: Props) {
  const [types, setTypes] = useState(initialTypes);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [newType, setNewType] = useState({ name: '', presentation: 'text' as VariantPresentation });
  const [newOption, setNewOption] = useState<Record<number, { value: string; colorHex: string }>>({});
  const [editingType, setEditingType] = useState<number | null>(null);
  const [editingOption, setEditingOption] = useState<number | null>(null);

  const run = <T,>(operation: () => Promise<T>, onSuccess?: () => void) => {
    setError('');
    startTransition(async () => {
      try { await operation(); onSuccess?.(); window.location.reload(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el cambio.'); }
    });
  };

  const addType = (event: React.FormEvent) => {
    event.preventDefault();
    run(() => createManagedVariantType(newType), () => setNewType({ name: '', presentation: 'text' }));
  };

  return (
    <main className="admin-page admin-variants-page">
      <header className="admin-variants-hero">
        <div>
          <span className="admin-eyebrow">Catálogo / Configuración</span>
          <h1 className="admin-page-title">Variaciones</h1>
          <p className="admin-page-subtitle">Definí las propiedades que tus productos pueden ofrecer y mantené sus valores listos para usar.</p>
        </div>
        <div className="admin-variants-hero-mark" aria-hidden="true">◌</div>
      </header>

      {error && <div className="admin-error-box" role="alert">{error}</div>}

      <section className="admin-variants-create admin-card">
        <div>
          <span className="admin-eyebrow">Nueva propiedad</span>
          <h2 className="admin-card-title">Agregá una dimensión de producto</h2>
          <p className="admin-field-hint">Ejemplos: Color, Talle, Tamaño o Material.</p>
        </div>
        <form className="admin-variants-create-form" onSubmit={addType}>
          <input className="admin-input" value={newType.name} onChange={(event) => setNewType({ ...newType, name: event.target.value })} placeholder="Nombre de la propiedad" required />
          <select className="admin-input" value={newType.presentation} onChange={(event) => setNewType({ ...newType, presentation: event.target.value as VariantPresentation })}>
            {Object.entries(presentationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className="admin-btn admin-btn-primary" disabled={isPending} type="submit">Agregar propiedad</button>
        </form>
      </section>

      <section className="admin-variants-grid" aria-label="Propiedades de variantes">
        {types.map((type) => (
          <article className={`admin-card admin-variant-config-card ${!type.isActive ? 'is-archived' : ''}`} key={type.id}>
            <div className="admin-variant-config-header">
              <div className="admin-variant-config-icon" data-presentation={type.presentation}>{type.presentation === 'color' ? '●' : type.presentation === 'image' ? '▧' : 'Aa'}</div>
              <div className="admin-variant-config-heading">
                {editingType === type.id ? (
                  <input className="admin-input" defaultValue={type.name} onBlur={(event) => run(() => updateManagedVariantType(type.id, { name: event.target.value, presentation: type.presentation }), () => setEditingType(null))} autoFocus />
                ) : <h2>{type.name}</h2>}
                <span>{type.kind === 'system' ? 'Recomendada' : 'Personalizada'} · {presentationLabels[type.presentation]}</span>
              </div>
              <button className="admin-ghost-action" onClick={() => setEditingType(type.id)} type="button">Editar</button>
            </div>

            <div className="admin-variant-option-list">
              {type.options.length === 0 && <p className="admin-empty-state">Todavía no hay valores. Agregá el primero abajo.</p>}
              {type.options.map((option) => (
                <div className={`admin-variant-config-option ${!option.isActive ? 'is-archived' : ''}`} key={option.id}>
                  {type.presentation === 'color' && <span className="admin-variant-color-swatch" style={{ backgroundColor: option.colorHex || '#d8dce3' }} />}
                  {editingOption === option.id ? (
                    <input className="admin-input" defaultValue={option.value} onBlur={(event) => run(() => updateManagedVariantOption(option.id, { value: event.target.value, colorHex: option.colorHex || undefined, imageUrl: option.imageUrl || undefined }), () => setEditingOption(null))} autoFocus />
                  ) : <span>{option.value}</span>}
                  {!option.isActive && <em>Archivado</em>}
                  <button className="admin-ghost-action" onClick={() => setEditingOption(option.id)} type="button">Editar</button>
                  <button className="admin-ghost-action" onClick={() => run(() => toggleManagedVariantOption(option.id, !option.isActive))} type="button">{option.isActive ? 'Archivar' : 'Activar'}</button>
                </div>
              ))}
            </div>

            <form className="admin-variant-add-option" onSubmit={(event) => { event.preventDefault(); const value = newOption[type.id] || { value: '', colorHex: '#0059d5' }; run(() => createManagedVariantOption({ variantTypeId: type.id, value: value.value, colorHex: type.presentation === 'color' ? value.colorHex : undefined }), () => setNewOption({ ...newOption, [type.id]: { value: '', colorHex: value.colorHex } })); }}>
              <input className="admin-input" value={newOption[type.id]?.value || ''} onChange={(event) => setNewOption({ ...newOption, [type.id]: { value: event.target.value, colorHex: newOption[type.id]?.colorHex || '#0059d5' } })} placeholder="Nuevo valor" required />
              {type.presentation === 'color' && <input type="color" value={newOption[type.id]?.colorHex || '#0059d5'} onChange={(event) => setNewOption({ ...newOption, [type.id]: { value: newOption[type.id]?.value || '', colorHex: event.target.value } })} aria-label={`Color de ${type.name}`} />}
              <button className="admin-btn admin-btn-secondary admin-btn-sm" disabled={isPending} type="submit">+ Agregar valor</button>
            </form>

            <button className="admin-variant-archive" onClick={() => run(() => toggleManagedVariantType(type.id, !type.isActive))} type="button">{type.isActive ? 'Archivar propiedad' : 'Activar propiedad'}</button>
          </article>
        ))}
      </section>
    </main>
  );
}
