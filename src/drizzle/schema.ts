import { pgTable, serial, text, integer, boolean, timestamp, primaryKey, jsonb } from 'drizzle-orm/pg-core';

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
});

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
  categoryId: integer('category_id'),
  isVisible: boolean('is_visible').default(true),
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
  stock: integer('stock').default(0),
});

// ──────────────────────────────────────────────────────
// Product Images
// ──────────────────────────────────────────────────────
export const productImages = pgTable('product_images', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull(),
  url: text('url').notNull(),
  alt: text('alt'),
  position: integer('position').default(0),
});

// ──────────────────────────────────────────────────────
// Category Products (muchos a muchos)
// ──────────────────────────────────────────────────────
export const categoryProducts = pgTable('category_products', {
  categoryId: integer('category_id').notNull(),
  productId: integer('product_id').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.categoryId, t.productId] }),
}));

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
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ──────────────────────────────────────────────────────
// Order Items
// ──────────────────────────────────────────────────────
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull(),
  productId: integer('product_id'),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull(),
});
