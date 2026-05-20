"use server";

import { createClient } from "@/utils/supabase/server";

export interface SearchSuggestion {
  id: string;
  name: string;
  type: "product" | "category" | "merchant";
  slug?: string;
  image_url?: string | null;
}

interface MerchantProfileData {
  id: string;
  logo_url: string | null | undefined;
  business_name: string;
  merchant_products_count?: Array<{ count: number }>;
}

export async function getPopularSearchesAction() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("search_history")
      .select("query");

    if (error) throw error;

    const counts = (data || []).reduce((acc: Record<string, number>, curr) => {
      acc[curr.query] = (acc[curr.query] || 0) + 1;
      return acc;
    }, {});

    const popular = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query]) => query);

    return { popular };
  } catch (error) {
    console.error("Popular searches error:", error);
    return { error: "Failed to fetch popular searches" };
  }
}

export async function getGlobalSearchResultsAction(query: string) {
  try {
    const supabase = await createClient();

    const [productsRes, categoriesRes, merchantsRes] = await Promise.all([
      // Products with price, rating and merchant products
      supabase
        .from("products")
        .select(
          `
          *,
          average_rating:rating,
          categories(id, name, slug),
          merchant_products!inner(
            id, product_id, merchant_id, selling_price,
            merchant_profiles(id, business_name, logo_url)
          )
        `,
        )
        .ilike("name", `%${query}%`)
        .limit(20),

      // Categories
      supabase
        .from("categories")
        .select("*")
        .ilike("name", `%${query}%`)
        .limit(10),

      // Merchants
      supabase
        .from("merchant_profiles")
        .select(
          "*, merchant_products!inner(id), merchant_products_count:merchant_products(count)",
        )
        .ilike("business_name", `%${query}%`)
        .limit(10),
    ]);

    const normalizedMerchants = (merchantsRes.data || []).map(
      (m: MerchantProfileData) => {
        return {
          id: m.id,
          logo_url: m.logo_url,
          business_name: m.business_name,
          merchant_products:
            (m.merchant_products_count || []).length > 0
              ? m.merchant_products_count
              : [{ count: 0 }],
        };
      },
    );

    return {
      results: {
        products: productsRes.data || [],
        categories: categoriesRes.data || [],
        merchants: normalizedMerchants,
      },
    };
  } catch (error) {
    console.error("Global search results error:", error);
    return { error: "Failed to fetch search results" };
  }
}

export async function getSearchSuggestionsAction(query: string) {
  try {
    const supabase = await createClient();

    const [productsRes, categoriesRes, merchantsRes] = await Promise.all([
      // Products
      supabase
        .from("products")
        .select("id, name, image_url, merchant_products!inner(id)")
        .ilike("name", `%${query}%`)
        .limit(5),

      // Categories
      supabase
        .from("categories")
        .select("id, name, slug")
        .ilike("name", `%${query}%`)
        .limit(5),

      // Merchants
      supabase
        .from("merchant_profiles")
        .select(
          "id, business_name, logo_url, store_slug, merchant_products!inner(id)",
        )
        .ilike("business_name", `%${query}%`)
        .limit(5),
    ]);

    const suggestions: SearchSuggestion[] = [];

    if (categoriesRes.data) {
      suggestions.push(
        ...categoriesRes.data.map((c) => ({
          id: String(c.id),
          name: c.name,
          slug: c.slug,
          type: "category" as const,
        })),
      );
    }

    if (merchantsRes.data) {
      suggestions.push(
        ...merchantsRes.data.map((m) => ({
          id: m.id,
          name: m.business_name,
          slug: m.store_slug,
          image_url: m.logo_url,
          type: "merchant" as const,
        })),
      );
    }

    if (productsRes.data) {
      suggestions.push(
        ...productsRes.data.map((p) => ({
          id: p.id,
          name: p.name,
          image_url: p.image_url,
          type: "product" as const,
        })),
      );
    }

    return { suggestions: suggestions.slice(0, 10) };
  } catch (error) {
    console.error("Search suggestions error:", error);
    return { error: "Failed to fetch suggestions" };
  }
}

export async function getSearchHistoryAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { history: [] };

    const { data, error } = await supabase
      .from("search_history")
      .select("query, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    return { history: data.map((d) => d.query) };
  } catch (error) {
    console.error("Search history error:", error);
    return { error: "Failed to fetch history" };
  }
}

export async function saveSearchAction(query: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false };

    // Check if already exists recently
    const { data: existing } = await supabase
      .from("search_history")
      .select("id")
      .eq("user_id", user.id)
      .eq("query", query)
      .maybeSingle();

    if (existing) {
      // Update timestamp
      await supabase
        .from("search_history")
        .update({ created_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("search_history").insert({ user_id: user.id, query });
    }

    return { success: true };
  } catch (error) {
    console.error("Save search error:", error);
    return { error: "Failed to save search" };
  }
}

export async function clearSearchHistoryAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const { error } = await supabase
      .from("search_history")
      .delete()
      .eq("user_id", user.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Clear search error:", error);
    return { error: "Failed to clear history" };
  }
}

export async function removeSearchHistoryItemAction(query: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const { error } = await supabase
      .from("search_history")
      .delete()
      .eq("user_id", user.id)
      .eq("query", query);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Remove search item error:", error);
    return { error: "Failed to remove item" };
  }
}
