import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addToWishlistAction, removeFromWishlistAction, clearWishlistAction, getWishlistAction } from '@/app/actions/wishlist';
import { useAuthStore } from './useAuthStore';
import { Product } from '../types';

export interface WishlistItem {
  id: string; // Product ID
  name: string;
  lowestPrice: number;
  image_url?: string;
}

interface DbWishlistItem {
  product_id: string;
  products?: Product | null;
}

interface WishlistStore {
  items: WishlistItem[];
  addWishlist: (item: WishlistItem) => Promise<void>;
  removeWishlist: (id: string) => Promise<void>;
  isInWishlist: (id: string) => boolean;
  clearWishlist: () => Promise<void>;
  syncWithDB: () => Promise<void>;
  getItemCount: () => number;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      addWishlist: async (item) => {
        const isLoggedIn = useAuthStore.getState().isLoggedIn;
        const state = get();
        const isWishlisted = state.items.some((i) => i.id === item.id);
        
        if (!isWishlisted) {
          set({ items: [...state.items, item] });
        }

        if (isLoggedIn) {
          try {
            await addToWishlistAction(item.id);
          } catch (error) {
            console.error("Failed to add item to DB wishlist:", error);
          }
        }
      },
      removeWishlist: async (id) => {
        const isLoggedIn = useAuthStore.getState().isLoggedIn;
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));

        if (isLoggedIn) {
          try {
            await removeFromWishlistAction(id);
          } catch (error) {
            console.error("Failed to remove item from DB wishlist:", error);
          }
        }
      },
      isInWishlist: (id) => {
        const state = get();
        return state.items.some((i) => i.id === id);
      },
      clearWishlist: async () => {
        const isLoggedIn = useAuthStore.getState().isLoggedIn;
        set({ items: [] });
        if (isLoggedIn) {
          try {
            await clearWishlistAction();
          } catch (error) {
            console.error("Failed to clear DB wishlist:", error);
          }
        }
      },
      syncWithDB: async () => {
        try {
          const { wishlist, error } = await getWishlistAction();
          if (error || !wishlist) return;

          const dbItems: WishlistItem[] = (wishlist as unknown as DbWishlistItem[]).map((item) => ({
            id: item.product_id,
            name: item.products?.name || '',
            lowestPrice: Number(item.products?.price || item.products?.lowestPrice || 0),
            image_url: item.products?.image_url || undefined
          }));

          set({ items: dbItems });
        } catch (error) {
          console.error("Failed to sync wishlist with DB:", error);
        }
      },
      getItemCount: () => {
        const state = get();
        return state.items.length;
      },
    }),
    {
      name: 'wishlist-storage',
    }
  )
);
