import { pgTable, serial, text, integer, boolean, timestamp, primaryKey, index, unique, jsonb } from 'drizzle-orm/pg-core';

// ──────────────────────────────────────────────────────
// NextAuth.js Tables
// ──────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  password: text('password'),
  role: text('role').default('customer'), // customer, admin
  createdAt: timestamp('created_at').defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  sessionToken: text('session_token').notNull().unique(),
  userId: integer('user_id').notNull(),
  expires: timestamp('expires').notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.identifier, t.token] }),
}));

// ──────────────────────────────────────────────────────
// Categories
// ──────────────────────────────────────────────────────
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  parentId: integer('parent_id'),
  position: integer('position').notNull().default(0),
});

// ──────────────────────────────────────────────────────
// Product <-> Category junction (many-to-many)
// ──────────────────────────────────────────────────────
export const productCategories = pgTable('product_categories', {
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: { columns: [table.productId, table.categoryId] },
}));

// ──────────────────────────────────────────────────────
// Products
// ──────────────────────────────────────────────────────
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  price: integer('price'),
  priceOffer: integer('price_offer'),
  priceTransfer: integer('price_transfer'),
  discount: text('discount'),
  badge: text('badge'),
  hasFreeShipping: boolean('has_free_shipping').notNull().default(false),
  isVisible: boolean('is_visible').default(true),
  stock: integer('stock').notNull().default(0),
  reservedStock: integer('reserved_stock').notNull().default(0),
  // Shipping / physical
  weight: integer('weight'),          // grams
  length: integer('length'),         // cm
  width: integer('width'),           // cm
  height: integer('height'),         // cm
  // Inventory
  sku: text('sku'),
  barcode: text('barcode'),
  // Product type: 'physical' | 'digital'
  productType: text('product_type').default('physical'),
  // SEO
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ──────────────────────────────────────────────────────
// Variant Types (Color, Talle, etc.)
// ──────────────────────────────────────────────────────
export const variantTypes = pgTable('variant_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind').notNull().default('custom'), // system | custom
  presentation: text('presentation').notNull().default('text'), // text | color | image
  isActive: boolean('is_active').notNull().default(true),
  position: integer('position').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// ──────────────────────────────────────────────────────
// Variant Options (Rojo, Azul / S, M, L)
// ──────────────────────────────────────────────────────
export const variantOptions = pgTable('variant_options', {
  id: serial('id').primaryKey(),
  variantTypeId: integer('variant_type_id').notNull().references(() => variantTypes.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  colorHex: text('color_hex'),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  position: integer('position').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// ──────────────────────────────────────────────────────
// Product Variants
// ──────────────────────────────────────────────────────
export const productVariants = pgTable('product_variants', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull(),
  name: text('name').notNull(),
  price: integer('price'),
  priceOffer: integer('price_offer'),
  imageUrl: text('image_url'),
  stock: integer('stock').default(0),
  reservedStock: integer('reserved_stock').default(0),  // Stock locked by pending orders
  variantTypeId: integer('variant_type_id').references(() => variantTypes.id),
  // Per-variant shipping
  weight: integer('weight'),
  length: integer('length'),
  width: integer('width'),
  height: integer('height'),
  // Per-variant inventory
  sku: text('sku'),
  barcode: text('barcode'),
  isVisible: boolean('is_visible').default(true),
});

// Normalized relationship between a product variant and its selected options.
export const productVariantOptions = pgTable('product_variant_options', {
  productVariantId: integer('product_variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
  variantOptionId: integer('variant_option_id').notNull().references(() => variantOptions.id, { onDelete: 'restrict' }),
  position: integer('position').notNull().default(0),
}, (table) => ({
  primaryKey: primaryKey({ columns: [table.productVariantId, table.variantOptionId] }),
  variantOptionIdx: index('product_variant_options_option_idx').on(table.variantOptionId),
  uniquePosition: unique('product_variant_options_variant_position_unique').on(table.productVariantId, table.position),
}));

// ──────────────────────────────────────────────────────
// Stock Movements
// ──────────────────────────────────────────────────────
export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  variantId: integer('variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
  movementType: text('movement_type').notNull(), // creacion | restock | venta | cancelacion | ajuste
  quantity: integer('quantity').notNull(),
  stockAfter: integer('stock_after').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
}, (table) => ({
  variantIdIdx: index('stock_movements_variant_id_idx').on(table.variantId),
  createdAtIdx: index('stock_movements_created_at_idx').on(table.createdAt),
}));

export const productStockMovements = pgTable('product_stock_movements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  movementType: text('movement_type').notNull(),
  quantity: integer('quantity').notNull(),
  stockAfter: integer('stock_after').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
}, (table) => ({
  productIdIdx: index('product_stock_movements_product_id_idx').on(table.productId),
  createdAtIdx: index('product_stock_movements_created_at_idx').on(table.createdAt),
}));

// ──────────────────────────────────────────────────────
// Product Images
// ──────────────────────────────────────────────────────
export const productImages = pgTable('product_images', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull(),
  url: text('url').notNull(),
  alt: text('alt'),
  position: integer('position').notNull().default(0),
  src: text('src').default('url'), // 'url' | 'file'
});

// ──────────────────────────────────────────────────────
// Customers
// ──────────────────────────────────────────────────────
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  dni: text('dni'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ──────────────────────────────────────────────────────
// Orders
// ──────────────────────────────────────────────────────
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  customerId: integer('customer_id'),
  status: text('status').notNull().default('pending'),  // pending, confirmed, packed, shipped, delivered, cancelled
  total: integer('total').notNull().default(0),
  discount: integer('discount').default(0),  // discount applied in cents
  couponCode: text('coupon_code'),
  notes: text('notes'),
  postalCode: text('postal_code'),
  shippingMethod: text('shipping_method'),
  shippingCost: integer('shipping_cost').default(0),
  mpPaymentId: text('mp_payment_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ──────────────────────────────────────────────────────
// Settings (key-value store for configurable options)
// ──────────────────────────────────────────────────────
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),  // e.g. 'payment_mp_enabled'
  value: text('value').notNull(), // stored as string, parsed by consumer
});

export const contactMessages = pgTable('contact_messages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  message: text('message').notNull(),
  status: text('status').notNull().default('new'),
  ipHash: text('ip_hash'),
  createdAt: timestamp('created_at').defaultNow(),
  readAt: timestamp('read_at'),
  repliedAt: timestamp('replied_at'),
});

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: serial('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  status: text('status').notNull().default('subscribed'),
  source: text('source').notNull().default('homepage'),
  consentAt: timestamp('consent_at').defaultNow(),
  subscribedAt: timestamp('subscribed_at').defaultNow(),
  unsubscribedAt: timestamp('unsubscribed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const communicationEvents = pgTable('communication_events', {
  id: serial('id').primaryKey(),
  channel: text('channel').notNull(), // whatsapp | contact | newsletter
  eventType: text('event_type').notNull(), // click | submitted
  name: text('name'),
  email: text('email'),
  phone: text('phone'),
  source: text('source').notNull().default('unknown'),
  productId: integer('product_id'),
  orderId: integer('order_id'),
  href: text('href'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ──────────────────────────────────────────────────────
// Payment Methods
// ──────────────────────────────────────────────────────
export const paymentMethods = pgTable('payment_methods', {
  id: text('id').primaryKey(),           // 'visa', 'mastercard', 'mercadopago', etc.
  name: text('name').notNull(),          // 'Visa', 'Mercado Pago'
  type: text('type').notNull(),          // 'card_credit' | 'card_debit' | 'gateway' | 'bank_transfer' | 'cash'
  isActive: boolean('is_active').default(false),
  discountPercent: integer('discount_percent'),  // null = sin descuento
  logoUrl: text('logo_url'),            // null = usar emoji/placeholder
  position: integer('position').default(0),
});

export const shippingMethods = pgTable('shipping_methods', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  carrier: text('carrier').notNull().default('rules'),
  baseCost: integer('base_cost').notNull().default(0),
  freeFrom: integer('free_from'),
  estimatedDays: text('estimated_days'),
  isActive: boolean('is_active').notNull().default(false),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const shippingRules = pgTable('shipping_rules', {
  id: serial('id').primaryKey(),
  shippingMethodId: integer('shipping_method_id').notNull().references(() => shippingMethods.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  postalPrefix: text('postal_prefix').notNull().default(''),
  cost: integer('cost').notNull().default(0),
  freeFrom: integer('free_from'),
  estimatedDays: text('estimated_days'),
  isActive: boolean('is_active').notNull().default(true),
  position: integer('position').notNull().default(0),
});

export type SettingKey = typeof settings.$inferSelect['key'];

// ──────────────────────────────────────────────────────
// Coupons
// ──────────────────────────────────────────────────────
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  type: text('type').notNull(),  // 'percent' | 'fixed'
  value: integer('value').notNull(),  // percent (e.g. 10 = 10%) or fixed amount in cents
  minPurchase: integer('min_purchase'),  // minimum purchase in cents to apply coupon
  maxUses: integer('max_uses'),  // null = unlimited
  usedCount: integer('used_count').default(0),
  validFrom: timestamp('valid_from'),
  validUntil: timestamp('valid_until'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// ──────────────────────────────────────────────────────
// Order Items
// ──────────────────────────────────────────────────────
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull(),
  productId: integer('product_id'),
  variantId: integer('variant_id'),  // NEW: references productVariants.id
  stockReserved: boolean('stock_reserved').notNull().default(false),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull(),
});
