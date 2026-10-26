import { getInventoryProducts } from './actions';
import InventoryTable from './InventoryTable';
import './inventario.css';

export const dynamic = 'force-dynamic';

export default async function InventarioPage() {
  const inventory = await getInventoryProducts();

  return (
    <div className="admin-inventory-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Inventario</h1>
          <p className="admin-page-subtitle">Controlá el stock de productos y variantes desde un solo lugar.</p>
        </div>
      </div>

      <InventoryTable initialInventory={inventory} />
    </div>
  );
}
