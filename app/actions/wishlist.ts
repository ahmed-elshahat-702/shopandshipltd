"use server";

import { createClient } from "@/utils/supabase/server";

async function getUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function getWishlistAction() {
  try {
    const userId = await getUserId();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("wishlist")
      .select("*, products!inner(*, merchant_products!inner(id))")
      .eq("user_id", userId);

    if (error) throw error;
    return { wishlist: data || [] };
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return { error: "Failed to fetch wishlist" };
  }
}

export async function addToWishlistAction(productId: string) {
  try {
    const userId = await getUserId();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("wishlist")
      .insert([{ user_id: userId, product_id: productId }])
      .select()
      .single();

    if (error) throw error;
    return { item: data };
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    return { error: "Failed to add to wishlist" };
  }
}

export async function removeFromWishlistAction(productId: string) {
  try {
    const userId = await getUserId();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClient();

    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    return { error: "Failed to remove from wishlist" };
  }
}

export async function clearWishlistAction() {
  try {
    const userId = await getUserId();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClient();

    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error clearing wishlist:", error);
    return { error: "Failed to clear wishlist" };
  }
}

export async function syncWishlistAction(productIds: string[]) {
  try {
    const userId = await getUserId();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClient();

    for (const productId of productIds) {
      // Check if exists
      const { data: existing } = await supabase
        .from("wishlist")
        .select("id")
        .eq("user_id", userId)
        .eq("product_id", productId)
        .maybeSingle();

      if (!existing) {
        await supabase.from("wishlist").insert([
          { user_id: userId, product_id: productId }
        ]);
      }
    }

    const { data, error } = await supabase
      .from("wishlist")
      .select("*, products!inner(*, merchant_products!inner(id))")
      .eq("user_id", userId);

    if (error) throw error;
    return { wishlist: data || [] };
  } catch (error) {
    console.error("Error syncing wishlist:", error);
    return { error: "Failed to sync wishlist" };
  }
}
