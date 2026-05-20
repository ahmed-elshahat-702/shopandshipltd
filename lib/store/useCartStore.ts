import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addCartItemAction, removeCartItemAction, updateCartItemAction, clearCartAction, getCartAction } from '@/app/actions/cart';
import { useAuthStore } from './useAuthStore';
import { Product, MerchantProfile } from '../types';

export interface CartItem {
  id: string; // This is unique for the cart item (DB ID or local unique ID)
  product_id: string;
  merchant_id: string;
  quantity: number;
  variant_price: number;
  product_name: string;
  merchant_name: string;
  variant_id?: string | null;
  variant_details?: Record<string, string> | null;
  product?: {
    image_url?: string;
  };
}

interface DbCartItem {
  id: string;
  product_id: string;
  merchant_id: string;
  quantity: number;
  price_per_unit: number;
  variant_price?: number;
  variant_id?: string | null;
  variant_details?: Record<string, string> | null;
  products?: Product | null;
  merchant_profiles?: MerchantProfile | null;
  merchants?: { name: string; business_name: string } | null;
}

function cartItemKey(item: {
  product_id: string;
  merchant_id: string;
  variant_id?: string | null;
}) {
  return `${item.product_id}:${item.merchant_id}:${item.variant_id || "no-variant"}`;
}

function mergeDuplicateItems(items: CartItem[]) {
  const merged = new Map<string, CartItem>();

  for (const item of items) {
    const key = cartItemKey(item);
    const existing = merged.get(key);

    if (existing) {
      merged.set(key, {
        ...existing,
        quantity: Math.max(existing.quantity, item.quantity),
        product_name: existing.product_name || item.product_name,
        merchant_name: existing.merchant_name || item.merchant_name,
        variant_details: existing.variant_details || item.variant_details,
        product: existing.product?.image_url ? existing.product : item.product,
      });
    } else {
      merged.set(key, item);
    }
  }

  return Array.from(merged.values());
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  syncWithDB: () => Promise<void>;
  getTotal: () => number;
  getItemCount: () => number;
  getItemQuantity: (productId: string, merchantId: string, variantId?: string | null) => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: async (item) => {
        const state = get();
        const isLoggedIn = useAuthStore.getState().isLoggedIn;
        const previousItems = state.items;
        const existingItem = state.items.find(
          (i) => cartItemKey(i) === cartItemKey(item)
        );
        
        let newItems;
        if (existingItem) {
          newItems = state.items.map((i) =>
            cartItemKey(i) === cartItemKey(item)
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          );
        } else {
          newItems = [...state.items, item];
        }

        set({ items: mergeDuplicateItems(newItems) });

        if (isLoggedIn) {
          try {
            const result = await addCartItemAction({
              productId: item.product_id,
              merchantId: item.merchant_id,
              quantity: item.quantity,
              variantPrice: item.variant_price,
              variantId: item.variant_id,
              variantDetails: item.variant_details
            });
            if (result?.error) throw new Error(result.error);
            // Refresh to get correct IDs from DB
            await get().syncWithDB();
          } catch (error) {
            console.error("Failed to add item to DB cart:", error);
            set({ items: previousItems });
            throw error;
          }
        }
      },
      removeItem: async (itemId) => {
        const isLoggedIn = useAuthStore.getState().isLoggedIn;
        set((state) => ({
          items: state.items.filter((i) => i.id !== itemId),
        }));

        if (isLoggedIn) {
          try {
            await removeCartItemAction(itemId);
          } catch (error) {
            console.error("Failed to remove item from DB cart:", error);
          }
        }
      },
      updateQuantity: async (itemId, quantity) => {
        const isLoggedIn = useAuthStore.getState().isLoggedIn;
        const previousItems = get().items;
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, quantity: Math.max(0, quantity) } : i
          ),
        }));

        if (isLoggedIn) {
          try {
            const result = await updateCartItemAction({ itemId, quantity });
            if (result?.error) throw new Error(result.error);
          } catch (error) {
            console.error("Failed to update item quantity in DB cart:", error);
            set({ items: previousItems });
            throw error;
          }
        }
      },
      clearCart: async () => {
        const isLoggedIn = useAuthStore.getState().isLoggedIn;
        set({ items: [] });
        if (isLoggedIn) {
          try {
            await clearCartAction();
          } catch (error) {
            console.error("Failed to clear DB cart:", error);
          }
        }
      },
      syncWithDB: async () => {
        try {
          const { cart, error } = await getCartAction();
          if (error || !cart) return;

          const dbItems: CartItem[] = (cart as unknown as DbCartItem[]).map((item) => ({
            id: item.id,
            product_id: item.product_id,
            merchant_id: item.merchant_id,
            quantity: item.quantity,
            variant_price: Number(item.price_per_unit || item.variant_price),
            product_name: item.products?.name || '',
            merchant_name: item.merchant_profiles?.business_name || item.merchants?.name || item.merchants?.business_name || '',
            variant_id: item.variant_id,
            variant_details: item.variant_details,
            product: {
              image_url: item.products?.image_url || undefined
            }
          }));

          set({ items: mergeDuplicateItems(dbItems) });
        } catch (error) {
          console.error("Failed to sync cart with DB:", error);
        }
      },
      getTotal: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.variant_price * item.quantity, 0);
      },
      getItemCount: () => {
        const state = get();
        return state.items.reduce((count, item) => count + item.quantity, 0);
      },
      getItemQuantity: (productId, merchantId, variantId) => {
        const state = get();
        const item = state.items.find(
          (i) =>
            cartItemKey(i) ===
            cartItemKey({ product_id: productId, merchant_id: merchantId, variant_id: variantId })
        );
        return item ? item.quantity : 0;
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
