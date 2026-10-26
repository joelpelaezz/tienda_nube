# TASKS: Inventory Clone

## Overview
Clonar funcionalidad de inventario de Tiendanube: página dedicada con filtros, edición inline de stock, y historial de movimientos.

---

## Tarea 1: Schema de Base de Datos

**Descripción**: Agregar tabla stock_movements y columna is_visible a products

**Archivos a crear/modificar**:
- `src/drizzle/migrations/0001_add_stock_movements.sql` (nueva migración)

**Pasos**:
- [x] 1.1 Crear migración Drizzle para:
  - [x] Agregar columna `is_visible boolean DEFAULT true` a `products` (si no existe)
  - [x] Crear tabla `stock_movements` con: id, variant_id, movement_type, quantity, stock_after, created_at, created_by
  - [x] Crear índices en variant_id y created_at
- [x] 1.2 Aplicar migración localmente

**Criterio de done**: Migración aplicada, tabla stock_movements existe

---

## Tarea 2: API Routes para Inventory

**Descripción**: Crear endpoints GET/POST para inventario

**Archivos a crear**:
- `src/app/api/inventory/route.ts` — GET inventory con paginación y filtros
- `src/app/api/inventory/[variantId]/history/route.ts` — GET historial de stock
- `src/app/api/inventory/stock/route.ts` — POST actualizar stock

**Pasos**:
- [x] 2.1 Crear GET `/api/inventory`
  - [x] Query params: `page`, `search`, `status`
  - [x] Join products + product_variants + product_images
  - [x] Calcular total stock, stock bajo, sin stock por variante
  - [x] Filtro por search (LIKE% nombre)
  - [x] Filtro por status (todos/bajo/sin stock)
  - [x] Paginación: 20 productos por página
- [x] 2.2 Crear GET `/api/inventory/[variantId]/history`
  - [x] Obtener movimientos de stock para variantId
  - [x] Ordenar por created_at DESC
  - [x] Devolver con nombres de movement_type traducidos
- [x] 2.3 Crear POST `/api/inventory/stock`
  - [x] Body: `{ variantId, newStock }`
  - [x] Validar newStock >= 0
  - [x] Obtener stock actual
  - [x] Calcular diferencia (newStock - oldStock)
  - [x] Actualizar product_variants.stock
  - [x] Crear registro en stock_movements con tipo 'ajuste'
  - [x] Devolver success + movement creado

**Criterio de done**: APIs respondiendo correctamente con datos mock/real

---

## Tarea 3: Server Actions

**Descripción**: Acciones server para actualizar stock

**Archivos a crear**:
- `src/app/admin/inventario/actions.ts`

**Pasos**:
- [x] 3.1 Crear `updateVariantStock(variantId, newStock, userId?)`
  - [x] Validaciones
  - [x] Transacción: update stock + create movement
- [x] 3.2 Crear `getInventoryProducts(options)`
  - [x] Wrapper de la API route o query directa a DB

**Criterio de done**: Server actions exportadas y funcionales

---

## Tarea 4: Página de Inventario (Skeleton)

**Descripción**: Crear página base `/admin/inventario`

**Archivos a crear**:
- `src/app/admin/inventario/page.tsx`
- `src/app/admin/inventario/InventoryTable.tsx`

**Pasos**:
- [x] 4.1 Crear page.tsx (Server Component)
  - [x] Importar AdminLayout
  - [x] Fetch initial products
  - [x] Render InventoryTable con props
- [x] 4.2 Crear InventoryTable.tsx (Client Component)
  - [x] State: searchQuery, statusFilter, currentPage, products
  - [x] Renderizado básico de tabla con headers

**Criterio de done**: Página accesible en `/admin/inventario` con tabla visible

---

## Tarea 5: StatsBar

**Descripción**: Barra de estadísticas de stock

**Archivos a crear**:
- `src/app/admin/inventario/StatsBar.tsx`

**Pasos**:
- [x] 5.1 Calcular estadísticas desde products/variants
- [x] 5.2 Renderizar 3 cards: Stock total, Stock bajo, Sin stock
- [x] 5.3 Integrar en InventoryTable

**Criterio de done**: StatsBar muestra números correctos

---

## Tarea 6: Toolbar con Filtros

**Descripción**: Barra de búsqueda y filtros

**Archivos a crear**:
- `src/app/admin/inventario/Toolbar.tsx`

**Pasos**:
- [x] 6.1 Input de búsqueda con debounce 300ms
- [x] 6.2 Dropdown status: Todos / Con stock bajo / Sin stock
- [x] 6.3 Botón "Limpiar filtros"
- [x] 6.4 Integrar filtros en InventoryTable y filtrar productos

**Criterio de done**: Filtros funcionan y actualizan la tabla

---

## Tarea 7: ProductRow - Filas de Productos

**Descripción**: Renderizar cada producto con sus variantes

**Archivos a crear/modificar**:
- `src/app/admin/inventario/ProductRow.tsx`

**Pasos**:
- [x] 7.1 Renderizar thumbnail + nombre + badge "Oculto"
- [x] 7.2 Mostrar stock por variante (inline)
- [x] 7.3 Mostrar lista de nombres de variantes
- [x] 7.4 Mostrar SKU o "Sin SKU"
- [x] 7.5 Botón "Ver historial" por producto

**Criterio de done**: Tabla muestra todos los datos del producto

---

## Tarea 8: EditStockModal

**Descripción**: Modal para editar stock de una variante

**Archivos a crear**:
- `src/app/admin/inventario/EditStockModal.tsx`

**Pasos**:
- [x] 8.1 Crear modal con overlay
- [x] 8.2 Mostrar nombre producto + variante
- [x] 8.3 Input numérico para nuevo stock
- [x] 8.4 Validación: >= 0
- [x] 8.5 Botones Cancelar / Guardar stock
- [x] 8.6 On save: llamar server action + cerrar modal
- [x] 8.7 Botón "Editar stock" en cada ProductRow

**Criterio de done**: Modal abre, edita stock, persiste en DB

---

## Tarea 9: StockHistoryModal

**Descripción**: Modal para ver historial de movimientos

**Archivos a crear**:
- `src/app/admin/inventario/StockHistoryModal.tsx`

**Pasos**:
- [x] 9.1 Crear modal con tabla de movimientos
- [x] 9.2 Columns: Fecha, Tipo, Cantidad, Total
- [x] 9.3 Fetch history desde API
- [x] 9.4 Traducir movement_type a español
- [x] 9.5 Mostrar "Sin movimientos" si vacío
- [x] 9.6 Botón "Ver historial" en cada ProductRow

**Criterio de done**: Modal muestra historial completo con todos los tipos de movimiento

---

## Tarea 10: Paginación

**Descripción**: Navegación entre páginas

**Archivos a crear**:
- `src/app/admin/inventario/Pagination.tsx`

**Pasos**:
- [x] 10.1 Calcular totalPages desde total products
- [x] 10.2 Renderizar: [<] [1] [2] [>] con estados disabled
- [x] 10.3 onPageChange actualiza currentPage
- [x] 10.4 Mostrar "Mostrando X-Y de Z"

**Criterio de done**: Paginación funciona y muestra productos correctos por página

---

## Tarea 11: Estilos (CSS)

**Descripción**: Aplicar estilos Tiendanube admin

**Archivos a crear/modificar**:
- `src/app/admin/inventario/inventario.css` (o agregar a admin.css existente)

**Pasos**:
- [x] 11.1 Estilos para StatsBar (cards con colores según nivel)
- [x] 11.2 Estilos para Toolbar (input, dropdown, botones)
- [x] 11.3 Estilos para tabla (header sticky, rows con hover)
- [x] 11.4 Colores de stock: verde > 5, amber 1-5, rojo = 0
- [x] 11.5 Estilos para modales (overlay, modal box)
- [x] 11.6 Estilos para badge "Oculto"
- [x] 11.7 Responsive: horizontal scroll en mobile

**Criterio de done**: Vista indistinguishable del original (funcionalidad y look)

---

## Tarea 12: Integración con Sidebar

**Descripción**: Agregar link a Inventario en menú lateral

**Archivos a modificar**:
- `src/components/admin/AdminLayout.tsx`

**Pasos**:
- [x] 12.1 Agregar link `/admin/inventario` en sección "Gestión" → "Productos"
- [x] 12.2 Posición: después de "Lista de productos", antes de "Categorías"

**Criterio de done**: Link visible y funcional en sidebar

---

## Resumen de Archivos a Crear

```
src/drizzle/migrations/0001_add_stock_movements.sql
src/app/api/inventory/route.ts
src/app/api/inventory/[variantId]/history/route.ts
src/app/api/inventory/stock/route.ts
src/app/admin/inventario/page.tsx
src/app/admin/inventario/actions.ts
src/app/admin/inventario/InventoryTable.tsx
src/app/admin/inventario/StatsBar.tsx
src/app/admin/inventario/Toolbar.tsx
src/app/admin/inventario/ProductRow.tsx
src/app/admin/inventario/EditStockModal.tsx
src/app/admin/inventario/StockHistoryModal.tsx
src/app/admin/inventario/Pagination.tsx
src/app/admin/inventario/inventario.css (o existente)
```

---

## Siguiente Paso

 → Derivar a **Automatic** o usar skills individuales (`sdd-apply`, etc.) para implementar
