import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MerchantStats {
  profitToday: number;
  totalProfit: number;
  totalSales: number;
  visitors: number;
  level: string | null;
  rating: number;
  followers: number;
  totalOrders: number;
}

interface MerchantStore {
  stats: MerchantStats | null;
  setStats: (stats: MerchantStats) => void;
  updateStat: (key: keyof MerchantStats, value: number | string | null) => void;
  clearStats: () => void;
}

export const useMerchantStore = create<MerchantStore>()(
  persist(
    (set) => ({
      stats: null,
      setStats: (stats) => set({ stats }),
      updateStat: (key, value) =>
        set((state) => ({
          stats: state.stats ? { ...state.stats, [key]: value } : null,
        })),
      clearStats: () => set({ stats: null }),
    }),
    {
      name: 'merchant-storage',
    }
  )
);
