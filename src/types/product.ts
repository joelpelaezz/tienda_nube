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
  imageUrl: string | null;
  variants?: ProductVariant[];
}

/** Full product detail data */
export interface ProductDetailData extends ProductCardData {
  description?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
}

/** Product variant */
export interface ProductVariant {
  id: number;
  productId: number;
  name: string;
  price?: number | null;
  stock?: number | null;
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
}

/** Price formatting options */
export interface FormatPriceOptions {
  locale?: string;
  currency?: string;
}
