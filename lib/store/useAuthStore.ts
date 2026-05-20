import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "customer" | "merchant" | "admin" | "superadmin";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  birthDate: string | null;
  walletAddress: string | null;
  profileImageUrl: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
}

interface AuthStore {
  user: UserProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setProfile: (profile: Partial<UserProfile>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,
      isLoading: false,
      setUser: (user) =>
        set({
          user,
          isLoggedIn: !!user,
        }),
      setLoading: (loading) => set({ isLoading: loading }),
      setProfile: (profile) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...profile } : null,
        })),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
    },
  ),
);
