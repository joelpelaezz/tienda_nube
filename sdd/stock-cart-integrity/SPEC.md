# Delta: Stock + Cart Integrity

## ADDED Requirements

### Requirement: Stock Query API

The system SHALL provide a batch stock query endpoint at `GET /api/stock?variantIds=1,2,3` that returns a JSON object mapping variant IDs to their current stock integer values. The endpoint MUST return `200` with `{[variantId: number]: stock: number}` and `400` if `variantIds` is missing or malformed.

#### Scenario: Query existing variant IDs

- GIVEN variant IDs 1, 2, 3 exist in the DB with stock 5, 0, 12
- WHEN client calls `GET /api/stock?variantIds=1,2,3`
- THEN response is `200` with `{1: 5, 2: 0, 3: 12}`

#### Scenario: Query with non-numeric IDs

- GIVEN request with `?variantIds=a,b,c`
- WHEN endpoint processes the request
- THEN response is `400` with `{error: "variantIds must be comma-separated integers"}`

---

### Requirement: Stock Reservation on Order Creation

When `createOrder` is invoked, the system SHALL atomically decrement stock for each cart item using `UPDATE product_variants SET stock = stock - quantity WHERE id = variantId AND stock >= quantity`. If any variant has insufficient stock, the entire order MUST be rejected with error `"Stock insuficiente para [variantName]"`. This decrement MUST occur within the same transaction as order creation.

#### Scenario: All variants have sufficient stock

- GIVEN cart has item: variantId=5, quantity=2, stock=10
- WHEN `createOrder` is called
- THEN order is created AND variant 5 stock is decremented to 8 in the same transaction

#### Scenario: Variant has insufficient stock

- GIVEN cart has item: variantId=5, quantity=10, stock=3
- WHEN `createOrder` is called
- THEN order is NOT created AND variant 5 stock remains 3
- AND error `"Stock insuficiente para [variantName]"` is returned

#### Scenario: Variant has exactly enough stock

- GIVEN cart has item: variantId=5, quantity=3, stock=3
- WHEN `createOrder` is called
- THEN order is created AND variant 5 stock becomes 0

---

### Requirement: Variant Stock Display in Selector

The `VariantSelector` component SHALL receive a `stockMap: Record<number, number>` prop. For each variant option, if `stockMap[variantId] === 0`, the button MUST be rendered with `opacity: 0.4`, `cursor: not-allowed`, `disabled` attribute, and `title="Sin stock"`.

#### Scenario: Variant in stock

- GIVEN variant 5 has stock=5
- WHEN VariantSelector renders
- THEN the button is fully opaque and clickable

#### Scenario: Variant out of stock

- GIVEN variant 5 has stock=0
- WHEN VariantSelector renders
- THEN button has 40% opacity, cursor not-allowed, is disabled, and tooltip shows "Sin stock"

---

## MODIFIED Requirements

### Requirement: Cart Item Structure

The cart store `CartItem` interface SHALL include `variantId: number | null`. Items added before this change that lack `variantId` SHALL be treated as `null` (no variant selected). All add-to-cart flows MUST populate `variantId` from the selected variant.

(Previously: CartItem had no variantId field)

#### Scenario: Add variant item to cart

- GIVEN user selects variant "Rojo / M" (variantId=7)
- WHEN add-to-cart is triggered
- THEN cart stores `{id: 1, variantId: 7, variant: "Rojo / M", quantity: 1, ...}`

#### Scenario: Legacy cart item without variantId

- GIVEN localStorage contains cart item with no `variantId` field
- WHEN cart hydrates from localStorage
- THEN `variantId` is `null` and cart renders normally

---

### Requirement: Order Item Records Variant Purchased

The `order_items` table SHALL store `variantId: integer | null` referencing `product_variants.id`. The `createOrder` function MUST populate this field from the cart item's `variantId`. Webhook handlers MUST use this field to identify the exact variant for stock operations.

(Previously: order_items had no variantId; impossible to know which variant was purchased)

#### Scenario: New order with variant

- GIVEN cart item has `variantId=7`
- WHEN `createOrder` completes
- THEN order_items row contains `variantId=7`

#### Scenario: Legacy order without variantId

- GIVEN pre-existing order_items row has `variantId=null`
- WHEN order is displayed
- THEN variant field shows "—" gracefully

---

### Requirement: MercadoPago Webhook Decrements Correct Variant

Upon receiving `payment:approved`, the webhook handler SHALL decrement stock using the `variantId` stored in `order_items`. If `variantId` is `null` (legacy order), the handler SHALL fall back to the previous behavior (decrement all variants of the product).

(Previously: webhook decremented ALL variants of the product regardless of which was purchased)

#### Scenario: Approved payment with variantId

- GIVEN order_items has item with `variantId=7`, quantity=2
- WHEN webhook receives `payment:approved` for that order
- THEN only variant 7 stock is decremented by 2

#### Scenario: Approved payment without variantId (legacy)

- GIVEN order_items has item with `variantId=null`, productId=3
- WHEN webhook receives `payment:approved`
- THEN all variants of product 3 are decremented (legacy fallback)

---

### Requirement: Add-to-Cart Stock Validation

Before adding an item to cart, the system SHALL query current stock for the selected variant. If stock is zero, the item MUST NOT be added and a user-visible message "Sin stock" SHALL be displayed. If requested quantity exceeds stock, the quantity SHALL be capped to available stock with message "Solo quedan N unidades".

(Previously: no stock check; users could add any quantity regardless of stock)

#### Scenario: Add item with available stock

- GIVEN variant 5 stock=8, user selects quantity=2
- WHEN add-to-cart is triggered
- THEN item is added with quantity=2 AND cart drawer opens

#### Scenario: Add item with zero stock

- GIVEN variant 5 stock=0
- WHEN user triggers add-to-cart
- THEN item is NOT added AND toast "Sin stock" appears

#### Scenario: Add item exceeding stock

- GIVEN variant 5 stock=3, user selects quantity=5
- WHEN add-to-cart is triggered
- THEN item is added with quantity=3 AND toast "Solo quedan 3 unidades" appears
