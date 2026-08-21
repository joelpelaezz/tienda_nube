import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QuickShopProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  priceOffer?: number | null;
  imageUrl: string | null;
  variants?: Array<{ id: number; name: string; price?: number | null }>;
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
  quantity: number;
  variant?: string;
  imageUrl: string | null;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: number, variant?: string) => void;
  updateQuantity: (id: number, quantity: number, variant?: string) => void;
  toggleCart: () => void;
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
    set((state) => {
      const existingItem = state.items.find(
        (i) => i.id === item.id && i.variant === item.variant
      );

      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.id === item.id && i.variant === item.variant
              ? { ...i, quantity: i.quantity + quantity }
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

  removeItem: (id, variant) => {
    set((state) => ({
      items: state.items.filter(
        (i) => !(i.id === id && i.variant === variant)
      ),
    }));
  },

  updateQuantity: (id, quantity, variant) => {
    if (quantity < 1) {
      get().removeItem(id, variant);
      return;
    }

    set((state) => ({
      items: state.items.map((i) =>
        i.id === id && i.variant === variant
          ? { ...i, quantity }
          : i
      ),
    }));
  },

  toggleCart: () => {
    set((state) => ({ isOpen: !state.isOpen }));
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
