import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QuickShopProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  priceOffer?: number | null;
  transferPrice?: number | null;
  imageUrl: string | null;
  availableStock?: number | null;
  productType?: string | null;
  // C4-TRACE: preserve the configured store contact for Quick Shop consultation links.
  whatsappNumber?: string;
  variants?: Array<{
    id: number;
    name: string;
    price?: number | null;
    priceOffer?: number | null;
    stock?: number | null;
    colorName?: string | null;
    colorHex?: string | null;
  }>;
}

interface QuickShopState {
  isOpen: boolean;
  product: QuickShopProduct | null;
  openQuickShop: (product: QuickShopProduct) => void;
  closeQuickShop: () => void;
}

export const useQuickShopStore = create<QuickShopState>()((set) => ({
  isOpen: false,
  product: null,
  openQuickShop: (product) => set({ isOpen: true, product }),
  closeQuickShop: () => set({ isOpen: false, product: null }),
}));

export interface CartItem {
  id: number;
  slug: string;
  name: string;
  price: number;
  transferPrice?: number | null;
  quantity: number;
  variant?: string;
  variantId?: number | null;  // NEW
  imageUrl: string | null;
  availableStock?: number | null;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: number, variantId?: number | null) => void;
  updateQuantity: (id: number, quantity: number, variantId?: number | null) => void;
  updateAvailableStock: (id: number, variantId: number | null, availableStock: number | null) => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
  items: [],
  isOpen: false,

  addItem: (item) => {
    const quantity = item.quantity ?? 1;
    if (item.availableStock != null && item.availableStock < quantity) return;
    set((state) => {
      const existingItem = state.items.find(
        (i) => i.id === item.id && (i.variantId ?? null) === (item.variantId ?? null)
      );

      if (existingItem) {
        const requestedQuantity = existingItem.quantity + quantity;
        if (item.availableStock != null && requestedQuantity > item.availableStock) return state;
        return {
          items: state.items.map((i) =>
            i.id === item.id && (i.variantId ?? null) === (item.variantId ?? null)
              ? { ...i, ...item, quantity: requestedQuantity }
              : i
          ),
          isOpen: true,
        };
      }

      return {
        items: [...state.items, { ...item, quantity }],
        isOpen: true,
      };
    });
  },

  removeItem: (id, variantId) => {
    set((state) => ({
      items: state.items.filter(
        (i) => !(i.id === id && (i.variantId ?? null) === (variantId ?? null))
      ),
    }));
  },

  updateQuantity: (id, quantity, variantId) => {
    if (quantity < 1) {
      get().removeItem(id, variantId);
      return;
    }

    set((state) => ({
      items: state.items.map((i) =>
        i.id === id && (i.variantId ?? null) === (variantId ?? null)
          ? { ...i, quantity: i.availableStock == null ? quantity : Math.min(quantity, i.availableStock) }
          : i
      ),
    }));
  },

  updateAvailableStock: (id, variantId, availableStock) => {
    set((state) => ({
      items: state.items.map((item) => (
        item.id === id && (item.variantId ?? null) === variantId
          ? { ...item, availableStock }
          : item
      )),
    }));
  },

  toggleCart: () => {
    set((state) => ({ isOpen: !state.isOpen }));
  },

  openCart: () => {
    set({ isOpen: true });
  },

  closeCart: () => {
    set({ isOpen: false });
  },

  clearCart: () => {
    set({ items: [] });
  },

  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}), { name: 'tiendanube-cart' })
);
