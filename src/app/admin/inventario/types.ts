export type InventoryStatusFilter = 'todos' | 'bajo' | 'sin';

export interface InventoryVariant {
  id: number;
  name: string;
  stock: number;
  reservedStock: number;  // reserved by pending orders
  availableStock: number; // stock - reservedStock
  sku: string | null;
  isVisible: boolean | null;
}

export interface InventoryProduct {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  isVisible: boolean | null;
  productType: string | null;
  stock: number | null;
  reservedStock: number;
  availableStock: number | null;
  imageUrl: string | null;
  imageAlt: string | null;
  variants: InventoryVariant[];
}

export interface InventoryStats {
  totalStock: number;
  totalAvailable: number;  // stock - reservedStock
  lowStock: number;
  outOfStock: number;
}

export interface InventoryResult {
  products: InventoryProduct[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  stats: InventoryStats;
}

export interface StockMovementView {
  id: number;
  variantId?: number;
  productId?: number;
  movementType: string;
  movementTypeLabel: string;
  quantity: number;
  stockAfter: number;
  createdAt: string | null;
  createdBy: number | null;
}
