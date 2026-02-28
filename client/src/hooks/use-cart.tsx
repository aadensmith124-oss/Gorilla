import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string;
  price: number;
  quantity: number;
  image: string;
  cardId?: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (variantId: number) => void;
  removeCard: (cardId: number) => void;
  updateQuantity: (variantId: number, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (newItem) => set((state) => {
        if (newItem.cardId) {
          const alreadyInCart = state.items.some((i) => i.cardId === newItem.cardId);
          if (alreadyInCart) return state;
          return { items: [...state.items, newItem] };
        }
        const existing = state.items.find((i) => i.variantId === newItem.variantId && !i.cardId);
        if (existing) {
          return {
            items: state.items.map((i) =>
              i.variantId === newItem.variantId && !i.cardId
                ? { ...i, quantity: i.quantity + newItem.quantity }
                : i
            ),
          };
        }
        return { items: [...state.items, newItem] };
      }),
      removeItem: (variantId) => set((state) => ({
        items: state.items.filter((i) => i.variantId !== variantId || i.cardId),
      })),
      removeCard: (cardId: number) => set((state) => ({
        items: state.items.filter((i) => i.cardId !== cardId),
      })),
      updateQuantity: (variantId, quantity) => set((state) => ({
        items: state.items.map((i) =>
          i.variantId === variantId && !i.cardId ? { ...i, quantity } : i
        ),
      })),
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((acc, item) => acc + (item.price * item.quantity), 0),
    }),
    {
      name: 'shopping-cart',
    }
  )
);
