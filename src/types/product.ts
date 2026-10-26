/**
 * Shared product types used across the application.
 * Centraliza la definición de tipos para mantener consistencia.
 */

/** Product listing card data */
export interface ProductCardData {
  id: number;
  slug: string;
  name: string;
  price: number | null;
  priceOffer?: number | null;
  priceTransfer?: number | null;
  discount?: string | null;
  badge?: string | null;
  hasFreeShipping?: boolean;
  availableStock?: number | null;
  productType?: string | null;
  imageUrl: string | null;
  imageAlt?: string | null;
  variants?: ProductVariant[];
}

/** Full product detail data */
export interface ProductDetailData extends ProductCardData {
  description?: string | null;
  categoryName?: string | null;
  stock: number;
  reservedStock: number;
}

/** Product variant */
export interface ProductVariant {
  id: number;
  productId: number;
  name: string;
  price?: number | null;
  priceOffer?: number | null;
  stock?: number | null;
  colorName?: string | null;
  colorHex?: string | null;
}

/** Category */
export interface Category {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
}

/** Cart item — extends ProductCardData with quantity */
export interface CartItem extends ProductCardData {
  quantity: number;
  variant?: string;
  variantId?: number | null;
  availableStock?: number | null;
}

/** Price formatting options */
export interface FormatPriceOptions {
  locale?: string;
  currency?: string;
}
