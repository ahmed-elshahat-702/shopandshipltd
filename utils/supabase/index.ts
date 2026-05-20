import { createClient } from "@/utils/supabase/server";

/**
 * Get current user session
 */
export const getSession = async () => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
};

/**
 * Get current user
 */
export const getUser = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

/**
 * Get current user profile with role and additional info
 */
export const getCurrentUserProfile = async () => {
  try {
    const user = await getUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error("Error in getCurrentUserProfile:", error);
    return null;
  }
};

/**
 * Get merchant profile for current user
 */
export const getCurrentMerchantProfile = async () => {
  try {
    const user = await getUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data: merchantProfile, error } = await supabase
      .from("merchant_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching merchant profile:", error);
      return null;
    }

    return merchantProfile;
  } catch (error) {
    console.error("Error in getCurrentMerchantProfile:", error);
    return null;
  }
};

/**
 * Sign out current user
 */
export const signOutUser = async () => {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  return error;
};

/**
 * Type for user profile
 */
export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  wallet_address: string | null;
  profile_image_url: string | null;
  role: "customer" | "merchant" | "admin";
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Type for merchant profile
 */
export type MerchantProfile = {
  id: string;
  user_id: string;
  business_name: string;
  business_description: string | null;
  business_category: string | null;
  logo_url: string | null;
  banner_url: string | null;
  store_slug: string;
  rating: number;
  total_sales: number;
  total_profit: number;
  level_id: number | null;
  is_verified: boolean;
  kyc_status: "pending" | "approved" | "rejected";
  kyc_document_url: string | null;
  wallet_address: string | null;
  country: string | null;
  city: string | null;
  store_visits: number;
  followers: number;
  created_at: string;
  updated_at: string;
};
