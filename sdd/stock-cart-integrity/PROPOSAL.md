# Proposal: stock-cart-integrity

## Intent

El circuito de carrito/producto/checkout tiene una cadena de bugs que causan **sobreventa, stock corrupto e imposibilidad de saber qué variante compró el cliente**. El pedido no registra el `variantId`, el frontend no consulta stock, y el webhook de MP descuenta todas las variantes en paralelo en lugar de la correcta. Este change arregla la integridad de todo el circuito.

## Scope

### In Scope (Fase 1 — Core Integrity)
- **Schema**: agregar `variantId` a `order_items`
- **Store**: `CartItem` incluye `variantId`
- **Add-to-cart flows**: `AddToCartButton`, `ProductCard`, `QuickShopModal` pasan `variantId`
- **Checkout**: `createOrder` valida stock y descuenta atómicamente con lock
- **Webhook MP**: descuenta la variante correcta por `variantId`
- **Stock API**: endpoint `GET /api/stock?variantIds=1,2,3` para consulta batch
- **Frontend stock check**: `AddToCartButton` consulta stock antes de agregar, muestra "Sin stock"

### In Scope (Fase 2 — UX)
- **VariantSelector**: muestra estado de stock por variante (color + deshabilitado)
- **QuickShopModal**: valida stock al cambiar cantidad
- **COLOR_MAP**: extraído a `lib/colors.ts` (un solo archivo)

### Out of Scope
- Zoom en imagen mobile (requiere redesign, no es bug de integridad)
- Sincronización cross-tab del carrito (futuro)
- Múltiples cupones
- Validación `priceOffer < price` en admin

## Capabilities

### New Capabilities
- `stock-query`: Endpoint batch para consultar stock de variantes por IDs. Devuelve `{[variantId]: stock}`.
- `stock-reservation`: `createOrder` decrementa stock atómico con `UPDATE ... WHERE stock >= quantity` + transacción. Si no hay stock, lanza error antes de crear la orden.
- `variant-stock-display`: `VariantSelector` recibe stock por variante y renderiza: botón agotado (opacity 40%, cursor not-allowed, tooltip "Sin stock").

### Modified Capabilities
- `cart`: `CartItem` ahora incluye `variantId: number | null`. Backwards compatible con items existentes (null).
- `order-items`: Schema `order_items` recibe columna `variantId: integer` con FK a `product_variants.id`.
- `mercadopago-webhook`: Al confirmar pago, descuenta stock por `variantId` (no por `productId` + todas las variantes).

## Approach

### Schema Migration
```sql
ALTER TABLE order_items ADD COLUMN variant_id INTEGER REFERENCES product_variants(id);
CREATE INDEX idx_order_items_variant_id ON order_items(variant_id);
```

### Stock Query API
`GET /api/stock?variantIds=1,2,3` → `{1: 5, 2: 0, 3: 12}`

### Store Change
```ts
interface CartItem {
  // ...existing fields
  variantId: number | null;  // NEW
}
```

### Add-to-Cart Validation (AddToCartButton)
1. `fetch('/api/stock?variantIds=' + selectedVariantId)`
2. Si `stock === 0` → mostrar toast "Sin stock", no agregar
3. Si `quantity > stock` → mostrar toast "Solo quedan N", ajustar a `stock`

### createOrder Stock Decrement
```ts
// Dentro de transacción
for (const item of cartItems) {
  if (item.variantId) {
    const result = await db.execute(sql`
      UPDATE product_variants
      SET stock = stock - ${item.quantity}
      WHERE id = ${item.variantId}
        AND stock >= ${item.quantity}
    `);
    if (result.rowCount === 0) {
      throw new Error(`Stock insuficiente para variante ${item.variantId}`);
    }
  }
}
```

### Webhook MP Fix
```ts
// Antes: buscaba por productId, descuenta TODAS las variantes
// Ahora: usa variantId directamente
if (item.variantId) {
  await db.execute(sql`
    UPDATE product_variants
    SET stock = stock - ${item.quantity}
    WHERE id = ${item.variantId} AND stock >= ${item.quantity}
  `);
}
```

### COLOR_MAP
```ts
// src/lib/colors.ts
export const VARIANT_COLORS: Record<string, string> = { ... };
export function getVariantColor(name: string): string {
  return VARIANT_COLORS[name.toLowerCase()] || '#9E9E9E';
}
```
Reemplazar duplicados en `VariantSelector`, `ProductCard`, `QuickShopModal`.

## Affected Areas

| Área | Impact | Descripción |
|------|--------|-------------|
| `src/drizzle/schema.ts` | Modified | `order_items` + `variantId` |
| `src/lib/store.ts` | Modified | `CartItem.variantId` |
| `src/components/AddToCartButton.tsx` | Modified | Consulta stock, validation |
| `src/components/ProductCard.tsx` | Modified | Pasa variantId |
| `src/components/QuickShopModal.tsx` | Modified | Pasa variantId, valida cantidad |
| `src/components/VariantSelector.tsx` | Modified | Muestra stock, usa COLOR_MAP centralizado |
| `src/components/CartDrawer.tsx` | Modified | Muestra variante (ya muestra, no necesita cambios de schema) |
| `src/app/checkout/actions.ts` | Modified | Decremento atómico de stock |
| `src/app/api/mercadopago/webhook/route.ts` | Modified | Descuento por variantId |
| `src/app/api/stock/route.ts` | New | Endpoint batch GET stock |
| `src/app/productos/[slug]/page.tsx` | Modified | Pasa variantId a ProductActions |
| `src/lib/colors.ts` | New | COLOR_MAP centralizado |
| DB Migration | New | ALTER TABLE order_items |

## Risks

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Migración en producción con datos existentes | Media | Testear con datos de staging primero; items sin variantId quedan NULL (no rompe pedidos existentes) |
| Race condition en decremento de stock | Baja | `WHERE stock >= quantity` atómico previene negativos |
| Webhook MP no llega (offline MP) | Media | `createOrder` ya descuenta, webhook solo re-confirma; gap solo siambos fallan |
| Breaking change en CartItem store | Media | Items existentes en localStorage tienen `variantId: undefined`; código handlea null gracefully |

## Rollback Plan

1. `npm run db:rollback` (Drizzle) revierte el ALTER TABLE
2. `git checkout HEAD~1` revierte código fuente
3. Limpiar localStorage del browser (carritos con variantId nuevo no son backwards)
4. En producción: restaurar backup de DB si la migración corruptó datos

## Dependencies

- Drizzle migration toolchain configurado (`npm run db:generate` + `npm run db:migrate`)
- Credenciales MP test disponibles para verificar webhook

## Success Criteria

- [ ] `order_items.variantId` tiene valor para nuevos pedidos
- [ ] No existe forma de agregar al carrito una variante con stock=0
- [ ] Stock de variante correcta se decrementa al confirmar pedido (no todas)
- [ ] VariantSelector muestra visualmente "agotado" para variantes sin stock
- [ ] `npm run build` pasa sin errores
- [ ] Playwright: flujo completo carrito → checkout → pedido con stock correcto
