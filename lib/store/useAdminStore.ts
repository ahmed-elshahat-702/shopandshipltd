import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminStats {
  pendingKycCount: number;
  pendingWalletRequestsCount: number;
  totalUsers: number;
  totalMerchants: number;
  totalOrders: number;
  platformRevenue: number;
  activeMerchants: number;
}

interface AdminStore {
  stats: AdminStats | null;
  setStats: (stats: AdminStats) => void;
  updateStat: (key: keyof AdminStats, value: number) => void;
  clearStats: () => void;
}

export const useAdminStore = create<AdminStore>()(
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
      name: 'admin-storage',
    }
  )
);
