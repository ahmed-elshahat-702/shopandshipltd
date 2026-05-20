import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FavoriteProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  image_url?: string;
  categories?: { name: string };
}

interface FavoritesStore {
  favorites: FavoriteProduct[];
  addFavorite: (product: FavoriteProduct) => void;
  removeFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      addFavorite: (product) =>
        set((state) => ({
          favorites: state.favorites.some((f) => f.id === product.id)
            ? state.favorites
            : [...state.favorites, product],
        })),
      removeFavorite: (productId) =>
        set((state) => ({
          favorites: state.favorites.filter((f) => f.id !== productId),
        })),
      isFavorite: (productId) =>
        get().favorites.some((f) => f.id === productId),
      clearFavorites: () => set({ favorites: [] }),
    }),
    {
      name: 'merchant-favorites',
    }
  )
);
