import { createShippingMethod, getShippingConfiguration, saveShippingRule, updateShippingMethod } from './actions';

export const dynamic = 'force-dynamic';

function centsToInput(value: number | null | undefined) {
  return value == null ? '' : String(value / 100);
}

export default async function ShippingPage() {
  const { methods, rules } = await getShippingConfiguration();

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Medios de envío</h1>
          <p className="admin-page-subtitle">Configurá métodos, zonas por código postal y envío gratis.</p>
          <p className="admin-hint">Cada método y cada regla se guarda con su propio botón. Una regla general sin prefijo se aplica como fallback para cualquier código postal.</p>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: '16px' }}>
        <div className="admin-card-header"><h2 className="admin-card-title">Nuevo método</h2></div>
        <div className="admin-card-body">
          <form action={createShippingMethod} className="admin-form-grid">
            <input className="admin-input" name="name" placeholder="Ej. Envío express" required />
            <input className="admin-input" name="code" placeholder="Código: express" required />
            <input className="admin-input" name="carrier" defaultValue="rules" placeholder="Proveedor" />
            <input className="admin-input" name="baseCost" type="number" min="0" step="0.01" placeholder="Costo base ($)" />
            <input className="admin-input" name="freeFrom" type="number" min="0" step="0.01" placeholder="Gratis desde ($)" />
            <input className="admin-input" name="estimatedDays" placeholder="3 a 7 días hábiles" />
            <label className="admin-checkbox-label"><input type="checkbox" name="isActive" /> Activo</label>
            <button className="admin-btn admin-btn-primary" type="submit">Crear método</button>
          </form>
        </div>
      </div>

      {methods.length === 0 ? (
        <div className="admin-empty-state">No hay métodos de envío configurados.</div>
      ) : methods.map((method) => (
        <div className="admin-card" style={{ marginBottom: '16px' }} key={method.id}>
          <div className="admin-card-header">
            <h2 className="admin-card-title">{method.name}</h2>
            <span className="admin-tag">{method.isActive ? 'Activo' : 'Inactivo'}</span>
          </div>
          <div className="admin-card-body">
            <form action={updateShippingMethod} className="admin-form-grid">
              <input type="hidden" name="id" value={method.id} />
              <input className="admin-input" name="name" defaultValue={method.name} required />
              <input className="admin-input" name="carrier" defaultValue={method.carrier} />
              <input className="admin-input" name="baseCost" type="number" min="0" step="0.01" defaultValue={centsToInput(method.baseCost)} placeholder="Costo base ($)" />
              <input className="admin-input" name="freeFrom" type="number" min="0" step="0.01" defaultValue={centsToInput(method.freeFrom)} placeholder="Gratis desde ($)" />
              <input className="admin-input" name="estimatedDays" defaultValue={method.estimatedDays || ''} placeholder="Tiempo estimado" />
              <label className="admin-checkbox-label"><input type="checkbox" name="isActive" defaultChecked={method.isActive} /> Activo</label>
              <button className="admin-btn admin-btn-secondary" type="submit">Guardar cambios del método</button>
            </form>

            <h3 className="admin-section-title" style={{ marginTop: '24px' }}>Reglas por código postal</h3>
            {rules.filter((rule) => rule.shippingMethodId === method.id).map((rule) => (
              <form action={saveShippingRule} className="admin-form-grid" key={rule.id} style={{ marginTop: '10px' }}>
                <input type="hidden" name="id" value={rule.id} />
                <input type="hidden" name="shippingMethodId" value={method.id} />
                <input className="admin-input" name="name" defaultValue={rule.name} />
                <input className="admin-input" name="postalPrefix" defaultValue={rule.postalPrefix} placeholder="Prefijo CPA, ej. A400" />
                <input className="admin-input" name="cost" type="number" min="0" step="0.01" defaultValue={centsToInput(rule.cost)} placeholder="Costo ($)" />
                <input className="admin-input" name="freeFrom" type="number" min="0" step="0.01" defaultValue={centsToInput(rule.freeFrom)} placeholder="Gratis desde ($)" />
                <input className="admin-input" name="estimatedDays" defaultValue={rule.estimatedDays || ''} placeholder="Tiempo estimado" />
                <label className="admin-checkbox-label"><input type="checkbox" name="isActive" defaultChecked={rule.isActive} /> Activa</label>
                <button className="admin-btn admin-btn-secondary" type="submit">Guardar cambios de regla</button>
              </form>
            ))}
            <form action={saveShippingRule} className="admin-form-grid" style={{ marginTop: '14px' }}>
              <input type="hidden" name="shippingMethodId" value={method.id} />
              <input className="admin-input" name="name" placeholder="Nueva regla" />
              <input className="admin-input" name="postalPrefix" placeholder="Prefijo CPA" />
              <input className="admin-input" name="cost" type="number" min="0" step="0.01" placeholder="Costo ($)" />
              <input className="admin-input" name="freeFrom" type="number" min="0" step="0.01" placeholder="Gratis desde ($)" />
              <input className="admin-input" name="estimatedDays" placeholder="Tiempo estimado" />
              <label className="admin-checkbox-label"><input type="checkbox" name="isActive" defaultChecked /> Activa</label>
              <button className="admin-btn admin-btn-primary" type="submit">Agregar regla</button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
