# SPEC: Inventory Management Clone

## Goal
Clonar la funcionalidad de inventario de Tiendanube (www.tendenciashop.com.ar/admin/inventory) en nuestra tienda clone.

---

## 1. Concept & Vision

Una página de inventario dedicada que permite administrar stock a nivel global, ver todos los productos y sus variantes con sus niveles de stock, filtrar por estado, ytrackear el historial de movimientos de stock. La interfaz sigue el patrón Tiendanube: tabla compacta con edición inline y modales para acciones específicas.

---

## 2. Design Language

### Aesthetic Direction
Matches Tiendanube admin style: clean, functional, data-dense tables with clear visual hierarchy.

### Color Palette
- Primary: `#043E8C` (Nube blue)
- Secondary: `#6B7280` (gray-500)
- Background: `#F9FAFB` (gray-50)
- Surface: `#FFFFFF`
- Border: `#E5E7EB` (gray-200)
- Text: `#111827` (gray-900)
- Text Muted: `#6B7280` (gray-500)
- Success/Stock OK: `#059669` (green-600)
- Warning/Stock Low: `#D97706` (amber-600)
- Danger/Out of Stock: `#DC2626` (red-600)

### Typography
- Font: System UI stack (matches current admin)
- Headings: 14px semibold for table headers
- Body: 13px regular for table cells
- Labels: 12px medium

### Spatial System
- Table row height: 48px
- Cell padding: 12px horizontal
- Section gaps: 16px
- Modal padding: 24px

---

## 3. Layout & Structure

### Page: `/admin/inventario`

```
┌─────────────────────────────────────────────────────────────┐
│ Header: "Inventario" + product count                        │
├─────────────────────────────────────────────────────────────┤
│ Toolbar:                                                   │
│ [🔍 Search input........] [Status filter ▾] [Limpiar]    │
├─────────────────────────────────────────────────────────────┤
│ Stats cards:                                                │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│ │Stock total│ │Stock bajo│ │Sin stock │                    │
│ │    25    │ │    5     │ │    1     │                    │
│ └──────────┘ └──────────┘ └──────────┘                    │
├─────────────────────────────────────────────────────────────┤
│ Table:                                                      │
│ │ Producto │ Stock │ Variantes │ SKU │ Historial │          │
│ │ [img]   │       │           │     │           │          │
│ │ Name     │ 5     │ -         │ --- │ [history] │          │
│ │ [img]   │       │           │     │           │          │
│ │ Name     │ 4|1|0 │Full|Queen │ --- │ [history] │          │
│ ...                                                        │
├─────────────────────────────────────────────────────────────┤
│ Pagination: [1] [2] [→] - Mostrando 1-20 de 40            │
└─────────────────────────────────────────────────────────────┘
```

### Responsive Strategy
- Desktop: Full table with all columns
- Tablet: Horizontal scroll on table
- Mobile: Card-based view per product (stacked)

---

## 4. Features & Interactions

### 4.1 Stats Header
- **Stock total**: Suma de todos los stocks de todas las variantes
- **Stock bajo**: Cantidad de variantes con stock entre 1 y `lowStockThreshold` (configurable, default 5)
- **Sin stock**: Cantidad de variantes con stock = 0

### 4.2 Search Filter
- Input text para buscar por nombre de producto
- Debounce de 300ms antes de filtrar
- Clear button (×) cuando hay texto

### 4.3 Status Filter Dropdown
- Options: "Todos", "Con stock bajo", "Sin stock"
- On change: filtra la tabla instantáneamente

### 4.4 Limpiar Filtros
- Button que resetea search y status filter a defaults

### 4.5 Product Table

#### Columns
| Column | Content |
|--------|---------|
| Producto | Thumbnail 40x40 + nombre + badge "Oculto" si `isVisible=false` |
| Stock | Valor numérico único o múltiples (por variante) |
| Variantes | Nombres de variantes separados por `|` |
| SKU | SKU o "Sin SKU" |
| Historial | Button "Ver historial" |

#### Per-Variant Stock Display
- Products sin variantes: muestra stock único
- Products con variantes: muestra N inputs de stock (uno por variante)
- Stock = 0: texto rojo
- Stock 1-5: texto amber
- Stock > 5: texto green

#### Editar Stock Modal
Trigger: Click en button "Editar stock" junto a cada variante

Modal content:
```
┌─────────────────────────────────────────┐
│ Editar stock                      [×]    │
├─────────────────────────────────────────┤
│ Producto: Peluche Stitch con manta       │
│ Variante: Rosa                          │
│                                         │
│ Stock actual: 1                         │
│                                         │
│ [___5___] ← input numérico             │
│                                         │
│ [Cancelar]            [Guardar stock]  │
└─────────────────────────────────────────┘
```

- Input permite número >= 0
- Guardar persiste en DB y cierra modal
- No guardar si valor no cambió

### 4.6 Stock History Modal
Trigger: Click en "Ver historial" junto a producto/variante

Modal content:
```
┌─────────────────────────────────────────────────┐
│ Historial de stock                        [×]   │
├─────────────────────────────────────────────────┤
│ Peluche Stitch con manta - Rosa                  │
├─────────────────────────────────────────────────┤
│ Fecha          │ Tipo      │ Cantidad │ Total   │
│ 27/08 14:30    │ Venta     │ -1       │ 1       │
│ 27/08 10:15    │ Restock   │ +5       │ 2       │
│ 26/08 16:45    │ Venta     │ -1       │ 3       │
│ 26/08 09:00    │ Creación  │ +4       │ 4       │
├─────────────────────────────────────────────────┤
│                                     [Cerrar]    │
└─────────────────────────────────────────────────┘
```

Movement types:
- `Creación` — variant created with initial stock
- `Restock` — manual stock increase
- `Venta` — order completed (stock decrease)
- `Cancelación` — order cancelled (stock increase)
- `Ajuste` — manual adjustment

### 4.7 Pagination
- 20 products per page
- Shows: "Mostrando X-Y de Z"
- Navigation: [<] [1] [2] [>] (disabled state for first/last)

---

## 5. Component Inventory

### 5.1 InventoryPage (page.tsx)
- Server component que fetch productos con variantes
- Pass data a InventoryTable client component

### 5.2 InventoryTable (client)
- State: searchQuery, statusFilter, currentPage
- Filters products client-side (search + status)
- Renders: StatsBar + Toolbar + Table + Pagination

### 5.3 StatsBar
- Props: products[]
- Calculates totals from variants
- Renders 3 stat cards

### 5.4 Toolbar
- Search input con debounce
- Status dropdown (Todos/Con stock bajo/Sin stock)
- Limpiar filtros button

### 5.5 ProductRow
- Props: product with variants[]
- Renders thumbnail, name, per-variant stock, variants list, SKU, history button
- Handles "Editar stock" click

### 5.6 EditStockModal
- Props: variantId, currentStock, productName, variantName, onSave, onClose
- State: newStock value
- Validation: >= 0 integer
- Server action: updateVariantStock(variantId, newStock)
- Creates StockMovement record on save

### 5.7 StockHistoryModal
- Props: variantId, productName, variantName, onClose
- Fetches history from StockMovement table
- Renders timeline of movements

### 5.8 Pagination
- Props: currentPage, totalPages, onPageChange
- Renders page numbers and navigation

---

## 6. Technical Approach

### 6.1 New DB Schema

```sql
-- Add isVisible to products if not exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true;

-- Stock movements table (NEW)
CREATE TABLE stock_movements (
  id serial PRIMARY KEY,
  variant_id integer NOT NULL REFERENCES product_variants(id),
  movement_type text NOT NULL, -- 'creacion' | 'restock' | 'venta' | 'cancelacion' | 'ajuste'
  quantity integer NOT NULL, -- positive for in, negative for out
  stock_after integer NOT NULL, -- stock level after this movement
  created_at timestamp DEFAULT now(),
  created_by integer -- user_id who made the change (nullable for system)
);

CREATE INDEX stock_movements_variant_id_idx ON stock_movements(variant_id);
CREATE INDEX stock_movements_created_at_idx ON stock_movements(created_at);
```

### 6.2 API Endpoints

```
GET /api/inventory
  - Returns: { products: ProductWithVariants[], total: number }
  - Query params: page, search, status (todos|bajo|sin)

GET /api/inventory/[variantId]/history
  - Returns: { movements: StockMovement[] }

POST /api/inventory/stock
  - Body: { variantId, newStock }
  - Creates StockMovement record
  - Updates product_variants.stock
  - Returns: { success: boolean, movement: StockMovement }
```

### 6.3 Server Actions

```typescript
// Update stock + create movement record
async function updateVariantStock(variantId: number, newStock: number, userId?: number)

// Get products with variants for inventory view
async function getInventoryProducts(options: {
  page?: number
  search?: string
  status?: 'todos' | 'bajo' | 'sin'
})
```

### 6.4 Route Structure

```
/admin/inventario
├── page.tsx              (Server component)
├── InventoryTable.tsx     (Client component with state)
├── StatsBar.tsx
├── Toolbar.tsx
├── ProductRow.tsx
├── EditStockModal.tsx
├── StockHistoryModal.tsx
├── Pagination.tsx
└── actions.ts           (Server actions + API calls)
```

---

## 7. Implementation Order

1. **DB Schema**: Add stock_movements table, is_visible column
2. **API Routes**: GET inventory, GET history, POST stock
3. **Server Actions**: updateVariantStock, getInventoryProducts
4. **InventoryPage**: Basic page skeleton
5. **InventoryTable**: Table with product rows
6. **StatsBar**: Stock statistics
7. **Toolbar**: Search + filters
8. **EditStockModal**: Edit stock inline
9. **StockHistoryModal**: View movement history
10. **Pagination**: Page navigation
11. **Styling**: Match Tiendanube admin aesthetic

---

## 8. Edge Cases

- Product sin variantes: muestra "—" en columna variantes
- Variant sin stock movement history: muestra "Sin movimientos"
- Search con caracteres especiales: sanitizar SQL
- Concurrent stock edits: última escritura gana (optimistic)
- Stock negativo: no permitir, input validation
- Very long product names: truncate con ellipsis en tabla
