"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "@/i18n/navigation";
import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

export interface SessionUser {
  id: string;
  email?: string;
  role?: string;
  fullName?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  walletAddress?: string | null;
  profileImageUrl?: string | null;
  isActive?: boolean;
  emailVerified?: boolean;
  merchantId?: string;
}

interface UserContextValue {
  user: SessionUser | null;
  loading: boolean;
  setProfile: (profile: Partial<SessionUser>) => void;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  setProfile: () => {},
});

import { useAuthStore, type UserRole, type UserProfile } from "@/lib/store/useAuthStore";

export function UserProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: SessionUser | null;
}) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [loading, setLoading] = useState(false);
  const setAuthUser = useAuthStore((s) => s.setUser);
  const setAuthProfile = useAuthStore((s) => s.setProfile);

  const [prevInitialUser, setPrevInitialUser] = useState(initialUser);

  if (initialUser !== prevInitialUser) {
    setPrevInitialUser(initialUser);
    setUser(initialUser);
    setLoading(false);
  }

  const setProfile = (profile: Partial<SessionUser>) => {
    setUser((prev) => (prev ? { ...prev, ...profile } : null));
    setAuthProfile(profile as Partial<UserProfile>); // Sync to Zustand store for non-React parts
  };

  useEffect(() => {
    if (initialUser) {
      setAuthUser({
        id: initialUser.id,
        email: initialUser.email || "",
        fullName: initialUser.fullName || null,
        phone: initialUser.phone || null,
        birthDate: initialUser.birthDate || null,
        walletAddress: initialUser.walletAddress || null,
        profileImageUrl: initialUser.profileImageUrl || null,
        role: (initialUser.role as UserRole) || "customer",
        isActive: initialUser.isActive ?? true,
        emailVerified: initialUser.emailVerified || false,
      });
    }
  }, [initialUser, setAuthUser]);

  useEffect(() => {
    const supabase = createClient();

    const syncUser = async (session: Session | null) => {
      if (session?.user) {
        // Fetch full profile from DB to ensure consistency with Layout data
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        const newUser: SessionUser = profile
          ? {
              id: profile.id,
              email: profile.email,
              role: profile.role,
              fullName: profile.full_name,
              phone: profile.phone,
              birthDate: profile.birth_date,
              walletAddress: profile.wallet_address,
              profileImageUrl: profile.profile_image_url,
              emailVerified: profile.email_verified,
            }
          : {
              id: session.user.id,
              email: session.user.email,
              role: session.user.user_metadata?.role || "customer",
              fullName: session.user.user_metadata?.full_name,
              emailVerified: !!session.user.email_confirmed_at,
            };

        if (newUser.role === "merchant") {
          const { data: merchantProfile } = await supabase
            .from("merchant_profiles")
            .select("id")
            .eq("user_id", newUser.id)
            .maybeSingle();
          if (merchantProfile) {
            newUser.merchantId = merchantProfile.id;
          }
        }

        setUser(newUser);
        setAuthUser({
          id: newUser.id,
          email: newUser.email || "",
          fullName: newUser.fullName || null,
          phone: newUser.phone || null,
          birthDate: newUser.birthDate || null,
          walletAddress: newUser.walletAddress || null,
          profileImageUrl: newUser.profileImageUrl || null,
          role: (newUser.role as UserRole) || "customer",
          isActive: profile?.is_active ?? true,
          emailVerified: newUser.emailVerified || false,
        });
      } else {
        setUser(null);
        setAuthUser(null);
      }
      setLoading(false);
    };

    // Initial sync
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncUser(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUser(session);

      if (_event === "SIGNED_IN" || _event === "SIGNED_OUT") {
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, setAuthUser]);

  return (
    <UserContext.Provider value={{ user, loading, setProfile }}>
      {children}
    </UserContext.Provider>
  );
}

/** Use this instead of useAuthStore in any Client Component */
export function useUser(): UserContextValue {
  return useContext(UserContext);
}
