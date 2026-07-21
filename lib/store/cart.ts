import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  type: "READY" | "PO";
  price: number;
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  imageUrl: string | null;
  // Two variants of the same product are separate cart lines — null means
  // "this product has no variants".
  variant: string | null;
  qty: number;
};

function sameLine(a: { productId: string; variant: string | null }, b: typeof a) {
  return a.productId === b.productId && a.variant === b.variant;
}

type CartState = {
  items: CartItem[];
  // True once the persisted localStorage state has been read on the client.
  // Components should treat the cart as empty until this flips, to avoid an
  // SSR/CSR mismatch — see zustand's persist + Next.js hydration guidance.
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  addItem: (item: Omit<CartItem, "qty">, qty: number) => void;
  removeItem: (productId: string, variant: string | null) => void;
  setQty: (productId: string, variant: string | null, qty: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      addItem: (item, qty) =>
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, item));
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, item) ? { ...i, qty: i.qty + qty } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, qty }] };
        }),
      removeItem: (productId, variant) =>
        set((state) => ({
          items: state.items.filter((i) => !sameLine(i, { productId, variant })),
        })),
      setQty: (productId, variant, qty) =>
        set((state) => ({
          items: state.items.map((i) =>
            sameLine(i, { productId, variant }) ? { ...i, qty: Math.max(1, qty) } : i
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "jastip-cart",
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
