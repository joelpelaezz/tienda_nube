# Tasks: stock-cart-integrity

## Phase 1: Foundation (Schema + Types)

- [ ] 1.1 Generate Drizzle migration: `ALTER TABLE order_items ADD COLUMN variant_id INTEGER REFERENCES product_variants(id); CREATE INDEX idx_order_items_variant_id ON order_items(variant_id);`
- [ ] 1.2 Update `src/drizzle/schema.ts`: add `variantId` to `orderItems` table (nullable integer ref to productVariants)
- [ ] 1.3 Update `src/lib/store.ts`: add `variantId: number | null` to `CartItem` interface
- [ ] 1.4 Create `src/lib/colors.ts`: export `VARIANT_COLORS` map and `getVariantColor(name)` function

## Phase 2: API Layer

- [ ] 2.1 Create `src/app/api/stock/route.ts` (GET): parse `variantIds` query param, return `{[id]: stock}` map, 400 on malformed input

## Phase 3: Frontend Stock Integration

- [ ] 3.1 Update `src/components/VariantSelector.tsx`: add `stockMap?: Record<number, number>` prop, apply `opacity-40 cursor-not-allowed disabled title="Sin stock"` when stock=0
- [ ] 3.2 Update `src/app/productos/[slug]/page.tsx`: fetch stock for all variants, pass `stockMap` to `ProductActions`
- [ ] 3.3 Update `src/components/ProductActions.tsx`: pass `stockMap` down to `VariantSelector`
- [ ] 3.4 Update `src/components/AddToCartButton.tsx`: before adding, `fetch('/api/stock?variantIds=' + selectedVariantId)`, if stock=0 show "Sin stock" toast and abort; if quantity > stock cap to stock and show "Solo quedan N unidades" toast

## Phase 4: Cart Flows — Pass variantId

- [ ] 4.1 Update `src/components/AddToCartButton.tsx`: pass `selectedVariantId` as `variantId` in `addItem` call
- [ ] 4.2 Update `src/components/ProductCard.tsx`: `handleAddToCart` passes `selectedVariant?.id` as `variantId`
- [ ] 4.3 Update `src/components/QuickShopModal.tsx`: `handleAddToCart` passes `selectedVariant` id as `variantId`; add stock check on quantity change (cap if exceeds)

## Phase 5: Checkout + Webhook

- [ ] 5.1 Update `src/app/checkout/actions.ts` `createOrder`: after order creation, within transaction, run `UPDATE product_variants SET stock = stock - quantity WHERE id = variantId AND stock >= quantity` for each item; if `rowCount === 0` throw `"Stock insuficiente para [variantName]"`
- [ ] 5.2 Update `src/app/api/mercadopago/webhook/route.ts`: change stock decrement to use `variantId` from `order_items`; if `variantId` is null, fall back to legacy behavior

## Phase 6: Build + Verification

- [ ] 6.1 Run `npm run db:generate` + `npm run db:migrate` to apply schema migration
- [ ] 6.2 Run `npm run build` — must pass without errors
- [ ] 6.3 Manual E2E: Add to cart → checkout → verify variantId in DB order_items
- [ ] 6.4 Manual E2E: Select agotado variant → verify button disabled + no add-to-cart
