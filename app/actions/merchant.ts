"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin-client";
import { MerchantProfile } from "@/lib/types";
import {
  getPlatformSettingsAction,
  approveMerchantApplicationAction,
} from "./admin";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface KycRequest {
  id: string;
  user_id: string;
  merchant_id: string;
  id_card_url: string;
  business_license_url: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export type MerchantStoreProduct = {
  id: string;
  merchant_id: string;
  product_id: string;
  selling_price: number;
  created_at: string;
  updated_at: string;
  products: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    stock: number;
    price: number;
    categories?: { id?: number; name?: string | null } | null;
  } | null;
};

export type MerchantWallet = {
  id: string;
  user_id: string;
  balance: number;
  outstanding_balance: number;
  currency: string;
  total_earnings: number;
  is_locked?: boolean;
  earnings_change?: number;
  created_at?: string;
  updated_at?: string;
};

export type MerchantWalletTransaction = {
  id: string;
  wallet_id: string;
  type: "recharge" | "withdrawal" | "order_payment" | "refund" | "commission";
  amount: number;
  status: "pending" | "completed" | "failed" | "cancelled";
  description: string | null;
  proof_image_url?: string | null;
  created_at: string;
  updated_at?: string;
};

export type MerchantSummary = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  location: string | null;
  rating: number;
  isVerified: boolean;
  productCount: number;
  levelId: number | null;
  totalSales: number;
};

export type MerchantPublicDetails = MerchantSummary & {
  followers: number;
  totalReviews: number;
  business_category: string | null;
  store_slug: string;
  isFollowing: boolean;
};

export type MerchantDetail = MerchantProfile & {
  product_count: number;
  order_count: number;
  merchant_level_upgrades: MerchantProfile["merchant_level_upgrades"];
};

export type MerchantDashboardData = {
  stats: MerchantDetail & {
    wallet_balance: number;
    total_sales: number;
    revenue_change: number;
    orders_change: number;
    products_change: number;
    wallet_change: number;
  };
  recentOrders: {
    id: string;
    created_at: string;
    total_amount: number;
    status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  }[];
  topProducts: {
    id: string;
    product_id: string;
    name: string;
    price: number;
    stock: number;
  }[];
  monthlyRevenue: {
    total_amount: number;
    created_at: string;
  }[];
};

export type MerchantOrderDetails = {
  id: string;
  order_number: string | null;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  total_amount: number;
  tax_amount: number;
  shipping_cost: number;
  commission_amount: number;
  profit_amount: number;
  tracking_number: string | null;
  notes: string | null;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  shipping_address: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    zipCode?: string;
  } | null;
  items: {
    id: string;
    product_id: string;
    quantity: number;
    price_per_unit: number;
    subtotal: number;
    products: {
      id: string;
      name: string;
      image_url: string | null;
      sku?: string | null;
    } | null;
  }[];
};

export type AnalyticsPeriod = "weekly" | "monthly" | "yearly";

export type AnalyticsData = {
  period: AnalyticsPeriod;
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  averageOrderValue: number;
  averageOrderValueChange: number;
  revenueChange: number;
  ordersChange: number;
  customerRetention: number;
  chartData: { date: string; revenue: number; orders: number }[];
  ordersByStatus: {
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  revenueByCategory: { name: string; value: number }[];
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function calculatePercentageChange(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

async function getWalletMetrics(userId: string) {
  const supabase = await createClient();
  const { data: wallet, error: walletError } = await supabase
    .from("wallet")
    .select(
      "id, user_id, balance, outstanding_balance, currency, total_earnings, is_locked, created_at, updated_at",
    )
    .eq("user_id", userId)
    .single();

  if (walletError) return null;

  return {
    wallet,
    balance: Number(wallet.balance),
    outstandingBalance: Number(wallet.outstanding_balance || 0),
    totalEarnings: Number(wallet.total_earnings),
  };
}

async function getMerchantDetailByColumn(
  column: "id" | "user_id",
  value: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("merchant_profiles")
    .select(
      `
      *,
      merchant_products(count),
      orders(count),
      merchant_level_upgrades(*)
    `,
    )
    .eq(column, value)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    rating: Number(data.rating || 0),
    total_sales: Number(data.total_sales || 0),
    total_profit: Number(data.total_profit || 0),
    product_count: data.merchant_products?.[0]?.count ?? 0,
    order_count: data.orders?.[0]?.count ?? 0,
    merchant_level_upgrades: data.merchant_level_upgrades ?? [],
  } as MerchantDetail;
}

async function getAuthenticatedMerchant(merchantId: string, userId?: string) {
  const supabase = await createClient();
  const resolvedUserId =
    userId || (await supabase.auth.getUser()).data.user?.id;

  if (!resolvedUserId) {
    throw new Error("Unauthorized");
  }

  const { data: merchant, error } = await supabase
    .from("merchant_profiles")
    .select("id, user_id, level_id")
    .eq("id", merchantId)
    .eq("user_id", resolvedUserId)
    .maybeSingle();

  if (error) throw error;
  if (!merchant) throw new Error("Merchant not found");

  return { supabase, merchant, userId: resolvedUserId };
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

export async function getMerchantsAction(options?: {
  search?: string;
  category?: string;
  level?: number;
  sortBy?: "rating" | "sales" | "newest" | "name";
  page?: number;
  limit?: number;
}) {
  try {
    const {
      search,
      category,
      level,
      sortBy = "name",
      page = 1,
      limit = 12,
    } = options || {};

    const supabase = await createClient();
    let query = supabase
      .from("merchant_profiles")
      .select(`*, merchant_products(count)`, { count: "exact" });

    if (search) {
      query = query.ilike("business_name", `%${search}%`);
    }

    if (category) {
      query = query.eq("business_category", category);
    }

    if (level) {
      query = query.eq("level_id", level);
    }

    // Sorting
    if (sortBy === "rating") {
      query = query.order("rating", { ascending: false });
    } else if (sortBy === "sales") {
      query = query.order("total_sales", { ascending: false });
    } else if (sortBy === "newest") {
      query = query.order("created_at", { ascending: false });
    } else {
      query = query.order("business_name", { ascending: true });
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    const merchants = (data || []).map((profile) => ({
      id: profile.id,
      name: profile.business_name || "Official Store",
      description: profile.business_description || null,
      logo_url: profile.logo_url || null,
      location:
        [profile.city, profile.country].filter(Boolean).join(", ") || null,
      rating: Number(profile.rating || 0),
      isVerified: Boolean(profile.is_verified),
      productCount: profile.merchant_products?.[0]?.count ?? 0,
      levelId: profile.level_id ?? null,
      totalSales: Number(profile.total_sales || 0),
      followers: profile.followers || 0,
    }));

    return {
      merchants,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Merchants error:", error);
    return { error: message, merchants: [], total: 0, page: 1, totalPages: 0 };
  }
}

export async function getMerchantLevelsAction() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("merchant_levels")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;
    return { levels: data };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Merchant levels error:", error);
    return { error: message };
  }
}

export async function getMerchantLevelInfoAction(merchantId: string) {
  try {
    const supabase = await createClient();
    const { data: merchantLevel, error } = await supabase
      .from("merchant_profiles")
      .select("level_id, merchant_levels(commission_percentage)")
      .eq("id", merchantId)
      .single();

    if (error) throw error;

    const level = Array.isArray(merchantLevel?.merchant_levels)
      ? merchantLevel.merchant_levels[0]
      : merchantLevel?.merchant_levels;

    return {
      levelId: merchantLevel.level_id,
      commissionPercentage: Number(level?.commission_percentage || 15),
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Get merchant level info error:", error);
    return { error: message };
  }
}

export async function getMerchantDashboardAction(merchantId: string) {
  try {
    if (!merchantId) return { error: "Merchant ID required" };

    const merchant = await getMerchantDetailByColumn("id", merchantId);
    if (!merchant) throw new Error("Merchant not found");

    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const sixtyDaysAgo = new Date(
      Date.now() - 60 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const supabase = await createClient();

    const [
      ordersData,
      productsData,
      revenueData,
      deliveredOrders,
      currentPeriodOrders,
      previousPeriodOrders,
      totalInventoryCount,
      inventoryBeforeCurrentPeriod,
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("id, created_at, total_amount, status")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("merchant_products")
        .select(
          "id, product_id, selling_price, products(name, stock)",
        )
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("orders")
        .select("total_amount, created_at")
        .eq("merchant_id", merchantId)
        .eq("status", "delivered")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true }),
      supabase
        .from("orders")
        .select("total_amount")
        .eq("merchant_id", merchantId)
        .eq("status", "delivered"),
      supabase
        .from("orders")
        .select("id, total_amount, status")
        .eq("merchant_id", merchantId)
        .gte("created_at", thirtyDaysAgo),
      supabase
        .from("orders")
        .select("id, total_amount, status")
        .eq("merchant_id", merchantId)
        .gte("created_at", sixtyDaysAgo)
        .lt("created_at", thirtyDaysAgo),
      supabase
        .from("merchant_products")
        .select("id", { count: "exact", head: true })
        .eq("merchant_id", merchantId),
      supabase
        .from("merchant_products")
        .select("id", { count: "exact", head: true })
        .eq("merchant_id", merchantId)
        .lt("created_at", thirtyDaysAgo),
    ]);

    const walletMetrics = await getWalletMetrics(merchant.user_id);
    let currentPeriodWalletNet = 0;
    if (walletMetrics) {
      // Fetch completed transactions for the last 30 days to calculate wallet change
      const { data: recentTransactions } = await supabase
        .from("wallet_transactions")
        .select("amount")
        .eq("wallet_id", walletMetrics.wallet.id)
        .eq("status", "completed")
        .gte("created_at", thirtyDaysAgo);

      currentPeriodWalletNet =
        recentTransactions?.reduce(
          (sum, tx) => sum + Number(tx.amount || 0),
          0,
        ) || 0;
    }

    const totalDeliveredRevenue =
      deliveredOrders.data?.reduce(
        (sum, order) => sum + Number(order.total_amount ?? 0),
        0,
      ) ?? 0;
    const currentRevenue =
      currentPeriodOrders.data
        ?.filter((order) => order.status === "delivered")
        .reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0) ?? 0;
    const previousRevenue =
      previousPeriodOrders.data
        ?.filter((order) => order.status === "delivered")
        .reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0) ?? 0;
    const currentOrdersCount = currentPeriodOrders.data?.length ?? 0;
    const previousOrdersCount = previousPeriodOrders.data?.length ?? 0;
    const currentProductsCount =
      totalInventoryCount.count ?? merchant.product_count;
    const previousProductsCount =
      inventoryBeforeCurrentPeriod.count ?? currentProductsCount;
    const currentWalletBalance = Number(walletMetrics?.balance ?? 0);
    const previousWalletBalance = currentWalletBalance - currentPeriodWalletNet;

    const stats = {
      ...merchant,
      merchant_level_upgrades: merchant.merchant_level_upgrades ?? [],
      wallet_balance: currentWalletBalance,
      total_sales: totalDeliveredRevenue,
      revenue_change: calculatePercentageChange(
        currentRevenue,
        previousRevenue,
      ),
      orders_change: calculatePercentageChange(
        currentOrdersCount,
        previousOrdersCount,
      ),
      products_change: calculatePercentageChange(
        currentProductsCount,
        previousProductsCount,
      ),
      wallet_change: calculatePercentageChange(
        currentWalletBalance,
        previousWalletBalance,
      ),
    };

    return {
      stats,
      recentOrders:
        ordersData.data?.map((o) => ({
          ...o,
          total_amount: Number(o.total_amount || 0),
        })) || [],
      topProducts:
        productsData.data?.map((p) => {
          const prod = (Array.isArray(p.products) ? p.products[0] : p.products) as { name?: string; stock?: number } | null;
          return {
            id: p.id,
            product_id: p.product_id,
            name: prod?.name ?? "Unknown Product",
            price: Number(p.selling_price || 0),
            stock: Number(prod?.stock || 0),
          };
        }) || [],
      monthlyRevenue:
        revenueData.data?.map((e) => ({
          total_amount: Number(e.total_amount || 0),
          created_at: e.created_at,
        })) || [],
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Merchant action error:", error);
    return { error: message };
  }
}

export async function getMerchantDashboardByUserIdAction(userId: string) {
  try {
    if (!userId) return { error: "User ID required" };
    const supabase = await createClient();
    const { data: merchant } = await supabase
      .from("merchant_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!merchant) return { error: "Merchant not found" };
    const data = await getMerchantDashboardAction(merchant.id);
    return { ...data, merchantId: merchant.id };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Merchant dashboard error:", error);
    return { error: message };
  }
}

export async function getMerchantApplicationAction(userId: string) {
  try {
    if (!userId) return { error: "User ID required" };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("merchant_applications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { application: data };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Get application error:", error);
    return { error: message };
  }
}

export async function getOrdersForMerchantAction(
  merchantId: string,
  options?: {
    status?: string | null;
    limit?: number;
    offset?: number;
    search?: string;
  },
) {
  try {
    if (!merchantId) return { error: "Merchant ID required" };
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const status = options?.status ?? undefined;
    const search = options?.search;

    const supabase = await createClient();
    let query = supabase
      .from("orders")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    if (search) {
      const searchTerm = search.trim();
      const searchConditions = [
        `order_number.ilike.%${searchTerm}%`,
        `tracking_number.ilike.%${searchTerm}%`,
        `shipping_address->>fullName.ilike.%${searchTerm}%`,
        `shipping_address->>email.ilike.%${searchTerm}%`,
      ];

      const { data: matchingProfiles } = await supabase
        .from("profiles")
        .select("id")
        .or(
          `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`,
        );
      if (matchingProfiles && matchingProfiles.length > 0) {
        matchingProfiles.forEach((p) =>
          searchConditions.push(`user_id.eq.${p.id}`),
        );
      }
      query = query.or(searchConditions.join(","));
    }

    const { data, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;
    return { orders: data || [], count: data?.length || 0 };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Orders error:", error);
    return { error: message };
  }
}

export async function getOrderDetailsForMerchantAction(
  merchantId: string,
  orderId: string,
) {
  try {
    if (!merchantId || !orderId)
      return { error: "Merchant ID and Order ID required" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id, order_number, created_at, updated_at, delivered_at, total_amount, tax_amount, shipping_cost, cod_fee, commission_amount, profit_amount, tracking_number, notes, status, shipping_address,
        order_items(id, product_id, quantity, price_per_unit, subtotal, product_name, product_sku, product_image_url, variant_id, variant_details, products(id, name, image_url, sku))
      `,
      )
      .eq("merchant_id", merchantId)
      .eq("id", orderId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { error: "Order not found" };

    const order: MerchantOrderDetails = {
      id: data.id,
      order_number: data.order_number,
      created_at: data.created_at,
      updated_at: data.updated_at,
      delivered_at: data.delivered_at,
      total_amount: Number(data.total_amount || 0),
      tax_amount: Number(data.tax_amount || 0),
      shipping_cost: Number(data.shipping_cost || 0),
      commission_amount: Number(data.commission_amount || 0),
      profit_amount: Number(data.profit_amount || 0),
      tracking_number: data.tracking_number,
      notes: data.notes,
      status: data.status,
      shipping_address:
        data.shipping_address as MerchantOrderDetails["shipping_address"],
      items: ((data.order_items as unknown[]) || []).map((item: unknown) => {
        const i = item as {
          id: string;
          product_id: string;
          quantity: number;
          price_per_unit: number;
          subtotal: number;
          variant_id?: string | null;
          variant_details?: Record<string, string> | null;
          products:
            | {
                id: string;
                name: string;
                image_url: string | null;
                sku?: string | null;
              }
            | {
                id: string;
                name: string;
                image_url: string | null;
                sku?: string | null;
              }[]
            | null;
        };
        return {
          id: i.id,
          product_id: i.product_id,
          quantity: Number(i.quantity || 0),
          price_per_unit: Number(i.price_per_unit || 0),
          subtotal: Number(i.subtotal || 0),
          variant_id: i.variant_id || null,
          variant_details: i.variant_details || null,
          products: i.products
            ? Array.isArray(i.products)
              ? i.products[0]
              : i.products
            : null,
        };
      }),
    };

    return { order };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Order details error:", error);
    return { error: message };
  }
}

export async function getReviewsForMerchantAction(merchantId: string) {
  try {
    if (!merchantId) return { error: "Merchant ID required" };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("*, orders!inner(id, merchant_id)")
      .eq("orders.merchant_id", merchantId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { reviews: data || [] };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Reviews error:", error);
    return { error: message };
  }
}

export async function getMerchantStoreProductsAction(
  merchantId: string,
  options?: { limit?: number; offset?: number },
) {
  try {
    if (!merchantId) return { error: "Merchant ID required" };
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("merchant_products")
      .select(
        `
        id, merchant_id, product_id, selling_price, created_at, updated_at,
        products(id, name, description, image_url, stock, price, categories(id, name))
      `,
      )
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    const products: MerchantStoreProduct[] = (data || []).map((row) => {
      const prod = Array.isArray(row.products) ? row.products[0] : row.products;
      const cat = prod
        ? Array.isArray(prod.categories)
          ? prod.categories[0]
          : prod.categories
        : null;
      return {
        id: row.id,
        merchant_id: row.merchant_id,
        product_id: row.product_id,
        selling_price: Number(row.selling_price || 0),
        created_at: row.created_at,
        updated_at: row.updated_at,
        products: prod
          ? {
              ...prod,
              stock: Number(prod.stock || 0),
              price: Number(prod.price || 0),
              categories: cat || null,
            }
          : null,
      };
    });
    return { products };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("[merchant_store_get] Error:", error);
    return { error: message };
  }
}

export async function addProductToStoreAction(
  merchantId: string,
  productId: string,
) {
  try {
    if (!merchantId || !productId)
      return { error: "Merchant ID and Product ID are required" };

    const { supabase, merchant } = await getAuthenticatedMerchant(merchantId);

    const settingsRes = await getPlatformSettingsAction();
    if (!("error" in settingsRes)) {
      const { count } = await supabase
        .from("merchant_products")
        .select("*", { count: "exact", head: true })
        .eq("merchant_id", merchantId);

      let maxProducts = 50; // Fallback default

      let currentLevelId = merchant.level_id;
      if (!currentLevelId) {
        const { data: baseLevel } = await supabase
          .from("merchant_levels")
          .select("id")
          .order("min_sales_amount", { ascending: true })
          .limit(1)
          .single();
        if (baseLevel) currentLevelId = baseLevel.id;
      }

      if (currentLevelId) {
        const { data: levelData } = await supabase
          .from("merchant_levels")
          .select("max_products")
          .eq("id", currentLevelId)
          .maybeSingle();
        if (levelData && levelData.max_products !== -1) {
          maxProducts = levelData.max_products;
        } else if (levelData && levelData.max_products === -1) {
          maxProducts = Infinity;
        }
      }

      if (count !== null && count >= maxProducts) {
        return {
          error: `You have reached the maximum product limit of ${maxProducts}. Upgrade your merchant level to add more.`,
        };
      }
    }

    const { data: existingProduct, error: existingProductError } =
      await supabase
        .from("products")
        .select("id, name, price, stock")
        .eq("id", productId)
        .maybeSingle();

    if (existingProductError) throw existingProductError;
    if (!existingProduct) return { error: "Product not found" };

    // Fetch merchant level for commission
    const { data: merchantLevel } = await supabase
      .from("merchant_profiles")
      .select("level_id, merchant_levels(commission_percentage)")
      .eq("id", merchantId)
      .single();

    const level = Array.isArray(merchantLevel?.merchant_levels)
      ? merchantLevel.merchant_levels[0]
      : merchantLevel?.merchant_levels;
    const commissionPercentage = Number(level?.commission_percentage || 15);

    const adminPrice = Number(existingProduct.price || 0);
    const customerPrice = Number(
      (adminPrice * (1 + commissionPercentage / 100)).toFixed(2),
    );

    // Add to inventory
    const { data: existingInventory, error: inventoryError } = await supabase
      .from("merchant_products")
      .select("id")
      .eq("merchant_id", merchantId)
      .eq("product_id", productId)
      .maybeSingle();

    if (inventoryError) throw inventoryError;

    if (existingInventory) {
      // Update existing record
      const { data, error } = await supabase
        .from("merchant_products")
        .update({
          selling_price: customerPrice,
          // We don't change stock here as it's now managed by products table
        })
        .eq("id", existingInventory.id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    }

    // Insert new record
    const { data, error } = await supabase
      .from("merchant_products")
      .insert({
        merchant_id: merchantId,
        product_id: productId,
        selling_price: customerPrice,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return { success: true, alreadyExists: true };
      throw error;
    }

    return { success: true, data };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("[merchant_store_post] Error:", error);
    return { error: message };
  }
}

export async function removeProductFromStoreAction(
  merchantId: string,
  productId: string,
) {
  try {
    if (!merchantId || !productId)
      return { error: "Merchant ID and Product ID required" };

    const { supabase } = await getAuthenticatedMerchant(merchantId);
    const { error } = await supabase
      .from("merchant_products")
      .delete()
      .eq("merchant_id", merchantId)
      .eq("product_id", productId);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("[merchant_store_delete] Error:", error);
    return { error: message };
  }
}

export async function getMerchantWalletAction(userId: string) {
  try {
    if (!userId) return { error: "User ID required" };
    const metrics = await getWalletMetrics(userId);
    if (!metrics) return { wallet: null };

    const supabase = await createClient();
    const { data: merchant } = await supabase
      .from("merchant_profiles")
      .select("id, total_profit")
      .eq("user_id", userId)
      .single();

    let earningsChange = 0;
    if (merchant) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

      const [currentPeriod, previousPeriod] = await Promise.all([
        supabase
          .from("orders")
          .select("profit_amount")
          .eq("merchant_id", merchant.id)
          .eq("status", "delivered")
          .gte("delivered_at", thirtyDaysAgo),
        supabase
          .from("orders")
          .select("profit_amount")
          .eq("merchant_id", merchant.id)
          .eq("status", "delivered")
          .gte("delivered_at", sixtyDaysAgo)
          .lt("delivered_at", thirtyDaysAgo),
      ]);

      const currentProfit = currentPeriod.data?.reduce((sum, o) => sum + Number(o.profit_amount || 0), 0) || 0;
      const previousProfit = previousPeriod.data?.reduce((sum, o) => sum + Number(o.profit_amount || 0), 0) || 0;

      if (previousProfit === 0) {
        earningsChange = currentProfit > 0 ? 100 : 0;
      } else {
        earningsChange = ((currentProfit - previousProfit) / previousProfit) * 100;
      }
    }

    const wallet: MerchantWallet = {
      ...metrics.wallet,
      balance: Number(metrics.balance || 0),
      is_locked: Boolean(metrics.wallet.is_locked),
      total_earnings: Number(merchant?.total_profit || 0),
      earnings_change: earningsChange,
    };
    return { wallet };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Wallet error:", error);
    return { error: message };
  }
}

export async function getMerchantTransactionsAction(userId: string) {
  try {
    if (!userId) return { error: "User ID required" };

    const metrics = await getWalletMetrics(userId);
    if (!metrics) return { transactions: [] };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("wallet_id", metrics.wallet.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const rawTransactions = data || [];
    const transactions = await Promise.all(
      rawTransactions.map(async (tx) => {
        if (!tx.proof_image_url) {
          return {
            ...tx,
            amount: Number(tx.amount || 0),
            description: tx.description || null,
          };
        }

        try {
          let path = tx.proof_image_url;
          if (path.includes("/storage/v1/object/")) {
            const parts = path.split("/wallet-proofs/");
            if (parts.length > 1) path = parts[1].split("?")[0];
          }

          const { data: signedData } = await supabase.storage
            .from("wallet-proofs")
            .createSignedUrl(path, 3600);
          return {
            ...tx,
            amount: Number(tx.amount || 0),
            description: tx.description || null,
            proof_image_url: signedData?.signedUrl ?? tx.proof_image_url,
          };
        } catch {
          return {
            ...tx,
            amount: Number(tx.amount || 0),
            description: tx.description || null,
          };
        }
      }),
    );

    return { transactions };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Transactions error:", error);
    return { error: message };
  }
}

export async function updateMerchantEmailAction(newEmail: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Update email error:", error);
    return { error: message };
  }
}

export async function updateMerchantProfileAction(
  merchantId: string,
  data: Partial<MerchantProfile>,
) {
  try {
    if (!merchantId) return { error: "Merchant ID required" };
    const supabase = await createClient();
    const { error } = await supabase
      .from("merchant_profiles")
      .update(data)
      .eq("id", merchantId);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Update error:", error);
    return { error: message };
  }
}

export async function getMerchantDetailsByUserIdAction(userId: string) {
  try {
    if (!userId) return { error: "User ID required" };
    const merchant = await getMerchantDetailByColumn("user_id", userId);
    if (!merchant) return { error: "Merchant not found" };
    return { merchant };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Merchant details by user error:", error);
    return { error: message };
  }
}

export async function getMerchantDetailsByMerchantIdAction(merchantId: string) {
  try {
    if (!merchantId) return { error: "Merchant ID required" };
    const merchant = await getMerchantDetailByColumn("id", merchantId);
    if (!merchant) return { error: "Merchant not found" };
    return { merchant };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Merchant details by merchant error:", error);
    return { error: message };
  }
}

export async function getMerchantPublicDetailsAction(merchantId: string) {
  try {
    if (!merchantId) return { error: "Merchant ID required" };
    const merchant = await getMerchantDetailByColumn("id", merchantId);
    if (!merchant) return { error: "Merchant not found" };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let isFollowing = false;
    if (user) {
      const { data: followData } = await supabase
        .from("merchant_followers")
        .select("id")
        .eq("merchant_id", merchantId)
        .eq("user_id", user.id)
        .maybeSingle();
      isFollowing = !!followData;
    }

    const summary: MerchantPublicDetails = {
      id: merchant.id,
      name: merchant.business_name || "Official Store",
      description: merchant.business_description || null,
      logo_url: merchant.logo_url || null,
      location:
        [merchant.city, merchant.country].filter(Boolean).join(", ") || null,
      rating: Number(merchant.rating || 0),
      isVerified: Boolean(merchant.is_verified),
      productCount: merchant.product_count,
      levelId: merchant.level_id ?? null,
      totalSales: Number(merchant.total_sales || 0),
      followers: merchant.followers ?? 0,
      totalReviews: Math.round(Number(merchant.rating ?? 0) * 10),
      business_category: merchant.business_category ?? null,
      store_slug: merchant.store_slug || "",
      isFollowing,
    };
    return { merchant: summary };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Merchant public details error:", error);
    return { error: message };
  }
}

export async function toggleFollowMerchantAction(merchantId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    const { data: followData } = await supabase
      .from("merchant_followers")
      .select("id")
      .eq("merchant_id", merchantId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (followData) {
      // Unfollow
      const { error } = await supabase
        .from("merchant_followers")
        .delete()
        .eq("id", followData.id);
      if (error) throw error;
      return { success: true, isFollowing: false };
    } else {
      // Follow
      const { error } = await supabase.from("merchant_followers").insert({
        merchant_id: merchantId,
        user_id: user.id,
      });
      if (error) throw error;
      return { success: true, isFollowing: true };
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Toggle follow error:", error);
    return { error: message };
  }
}

export async function submitMerchantApplicationAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const settingsRes = await getPlatformSettingsAction();
    const settings = "error" in settingsRes ? null : settingsRes;

    if (settings?.emailVerificationRequired) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email_verified")
        .eq("id", user.id)
        .single();
      if (!profile?.email_verified)
        return { error: "Please verify your email before applying." };
    }

    // Check if user already has a pending or approved application
    const { count: existingCount } = await supabase
      .from("merchant_applications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["pending", "approved"]);

    if (existingCount && existingCount > 0) {
      return { error: "You already have a pending or approved application." };
    }

    const storeType = formData.get("storeType") as string;
    const storeName = formData.get("storeName") as string;
    const storeDescription = formData.get("storeDescription") as string;
    const nationality = formData.get("nationality") as string;
    const idType = formData.get("idType") as string;
    const idNumber = formData.get("idNumber") as string;
    const idExpiry = formData.get("idExpiry") as string;
    const issuingCountry = formData.get("issuingCountry") as string;

    const idFrontFile = formData.get("idFront") as File;
    const idBackFile = formData.get("idBack") as File;
    const selfieFile = formData.get("selfie") as File;
    const storeLogoFile = formData.get("storeLogo") as File;

    if (
      settings?.kycRequiredForMerchant !== false &&
      (!idFrontFile || !selfieFile)
    ) {
      return { error: "ID front and selfie are required" };
    }

    const uploadFile = async (file: File, bucket: string, path: string) => {
      if (
        settings?.maxFileUploadSize &&
        file.size > settings.maxFileUploadSize
      ) {
        throw new Error(
          `File too large (max ${settings.maxFileUploadSize / (1024 * 1024)} MB)`,
        );
      }
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(path);
      return publicUrl;
    };

    const ts = Date.now();
    const [idFrontUrl, idBackUrl, selfieUrl, storeLogoUrl] = await Promise.all([
      uploadFile(
        idFrontFile,
        "kyc-documents",
        `${user.id}/${ts}-id-front.${idFrontFile.name.split(".").pop()}`,
      ),
      idBackFile
        ? uploadFile(
            idBackFile,
            "kyc-documents",
            `${user.id}/${ts}-id-back.${idBackFile.name.split(".").pop()}`,
          )
        : Promise.resolve(null),
      uploadFile(
        selfieFile,
        "kyc-documents",
        `${user.id}/${ts}-selfie.${selfieFile.name.split(".").pop()}`,
      ),
      storeLogoFile
        ? uploadFile(
            storeLogoFile,
            "profiles",
            `merchants/${user.id}-logo-${ts}.${storeLogoFile.name.split(".").pop()}`,
          )
        : Promise.resolve(null),
    ]);

    const { data: initialApp, error } = await supabase
      .from("merchant_applications")
      .insert({
        user_id: user.id,
        store_type: storeType,
        store_name: storeName,
        store_description: storeDescription,
        store_logo: storeLogoUrl,
        nationality,
        id_type: idType,
        id_number: idNumber,
        id_expiry: idExpiry,
        issuing_country: issuingCountry,
        id_front_url: idFrontUrl,
        id_back_url: idBackUrl,
        selfie_url: selfieUrl,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    if (settings?.autoApproveKYC && initialApp) {
      await approveMerchantApplicationAction(initialApp.id);
      const { data: updatedApp } = await supabase
        .from("merchant_applications")
        .select("*")
        .eq("id", initialApp.id)
        .single();
      // Return the updated version if it exists, otherwise the initial one
      return { success: true, application: updatedApp ?? initialApp };
    }

    return { success: true, application: initialApp };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Submission error:", error);
    return { error: message };
  }
}

export async function submitUpgradeRequestAction(
  userId: string,
  level: number,
) {
  try {
    if (!userId) return { error: "User ID required" };
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) return { error: "Unauthorized" };

    // Check if user already has a pending upgrade request
    const { count: pendingCount } = await supabase
      .from("merchant_level_upgrades")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending");

    if (pendingCount && pendingCount > 0) {
      return { error: "You already have a pending upgrade request." };
    }

    const { data: merchant, error: merchantError } = await supabase
      .from("merchant_profiles")
      .select("id, total_sales, level_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (merchantError) throw merchantError;
    if (!merchant) throw new Error("Merchant not found");

    if (level !== (merchant.level_id || 0) + 1)
      return { error: "You can only upgrade to the next immediate level." };

    const { data: levelData, error: levelDataError } = await supabase
      .from("merchant_levels")
      .select("min_sales_amount")
      .eq("id", level)
      .maybeSingle();
    if (levelDataError) throw levelDataError;
    if (!levelData) throw new Error("Level not found");

    if (
      Number(merchant.total_sales || 0) <
      Number(levelData.min_sales_amount || 0)
    ) {
      return {
        error: `You need at least $${levelData.min_sales_amount} total sales to upgrade to this level.`,
      };
    }

    const { data: request, error: requestError } = await supabase
      .from("merchant_level_upgrades")
      .insert({
        user_id: userId,
        merchant_id: merchant.id,
        current_level_id: merchant.level_id,
        requested_level_id: level,
        status: "pending",
      })
      .select()
      .single();

    if (requestError) throw requestError;
    return { success: true, request };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Upgrade request error:", error);
    return { error: message };
  }
}

export async function updateUserProfileAction(
  userId: string,
  data: { full_name?: string; phone?: string; profile_image_url?: string },
) {
  try {
    if (!userId) return { error: "User ID required" };
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", userId);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Update profile error:", error);
    return { error: message };
  }
}

export async function uploadProfileImageAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) return { error: "No file provided" };

    const settingsRes = await getPlatformSettingsAction();
    const maxSize =
      "error" in settingsRes ? 5 * 1024 * 1024 : settingsRes.maxFileUploadSize;

    if (file.size > maxSize)
      return { error: `File too large (max ${maxSize / (1024 * 1024)} MB)` };

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `avatars/${user.id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("profiles")
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("profiles").getPublicUrl(path);

    await supabase
      .from("profiles")
      .update({ profile_image_url: publicUrl })
      .eq("id", user.id);
    return { success: true, url: publicUrl };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Upload profile image error:", error);
    return { error: message };
  }
}

export async function uploadMerchantImageAction(
  formData: FormData,
  type: "logo" | "banner",
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) return { error: "No file provided" };

    const settingsRes = await getPlatformSettingsAction();
    const maxSize =
      "error" in settingsRes ? 5 * 1024 * 1024 : settingsRes.maxFileUploadSize;

    if (file.size > maxSize)
      return { error: `File too large (max ${maxSize / (1024 * 1024)} MB)` };

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `merchants/${user.id}-${type}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("profiles")
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("profiles").getPublicUrl(path);

    return { success: true, url: publicUrl };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error(`Upload ${type} image error:`, error);
    return { error: message };
  }
}

export async function updateMerchantStoreProfileAction(
  merchantId: string,
  data: Partial<MerchantProfile>,
) {
  try {
    if (!merchantId) return { error: "Merchant ID required" };
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: merchant } = await supabase
      .from("merchant_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!merchant || merchant.id !== merchantId)
      return { error: "Unauthorized" };

    const { error } = await supabase
      .from("merchant_profiles")
      .update(data)
      .eq("id", merchantId);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Update store profile error:", error);
    return { error: message };
  }
}

export async function getMerchantAnalyticsAction(
  merchantId: string,
  period: AnalyticsPeriod = "monthly",
) {
  try {
    if (!merchantId) return { error: "Merchant ID required" };
    await getAuthenticatedMerchant(merchantId);

    const now = new Date();
    let currentPeriodStart: Date;
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date;

    switch (period) {
      case "weekly":
        currentPeriodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(
          now.getTime() - 14 * 24 * 60 * 60 * 1000,
        );
        previousPeriodEnd = currentPeriodStart;
        break;
      case "yearly":
        currentPeriodStart = new Date(now.getFullYear(), 0, 1);
        previousPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
        previousPeriodEnd = currentPeriodStart;
        break;
      case "monthly":
      default:
        currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(
          now.getTime() - 60 * 24 * 60 * 60 * 1000,
        );
        previousPeriodEnd = currentPeriodStart;
        break;
    }

    const supabase = await createClient();
    const [
      allOrdersRes,
      currentPeriodOrdersRes,
      previousPeriodOrdersRes,
      productsRes,
      merchantProductsRes,
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("id, status, total_amount, created_at")
        .eq("merchant_id", merchantId),
      supabase
        .from("orders")
        .select("total_amount, created_at, status, user_id")
        .eq("merchant_id", merchantId)
        .gte("created_at", currentPeriodStart.toISOString())
        .lt("created_at", now.toISOString())
        .order("created_at", { ascending: true }),
      supabase
        .from("orders")
        .select("total_amount, created_at, status, user_id")
        .eq("merchant_id", merchantId)
        .gte("created_at", previousPeriodStart.toISOString())
        .lt("created_at", previousPeriodEnd.toISOString()),
      supabase
        .from("merchant_products")
        .select("id", { count: "exact" })
        .eq("merchant_id", merchantId),
      supabase
        .from("merchant_products")
        .select(
          "selling_price, products(name, categories(name))",
        )
        .eq("merchant_id", merchantId),
    ]);

    const chartMap = new Map<string, { revenue: number; orders: number }>();
    for (const order of currentPeriodOrdersRes.data || []) {
      let dateKey: string;
      const orderDate = new Date(order.created_at);
      if (period === "weekly")
        dateKey = orderDate.toLocaleDateString("en-US", { weekday: "short" });
      else if (period === "yearly")
        dateKey = orderDate.toLocaleDateString("en-US", { month: "short" });
      else
        dateKey = orderDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      const existing = chartMap.get(dateKey) ?? { revenue: 0, orders: 0 };
      chartMap.set(dateKey, {
        revenue: existing.revenue + Number(order.total_amount || 0),
        orders: existing.orders + 1,
      });
    }

    const currentRevenue = (currentPeriodOrdersRes.data || []).reduce(
      (sum, o) => sum + Number(o.total_amount || 0),
      0,
    );
    const previousRevenue = (previousPeriodOrdersRes.data || []).reduce(
      (sum, o) => sum + Number(o.total_amount || 0),
      0,
    );
    const currentOrderCount = currentPeriodOrdersRes.data?.length || 0;
    const previousOrderCount = previousPeriodOrdersRes.data?.length || 0;
    const averageOrderValue =
      currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0;
    const previousAverageOrderValue =
      previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0;

    const currentUserIds = new Set(
      (currentPeriodOrdersRes.data || []).map((o) => o.user_id).filter(Boolean),
    );
    const previousUserIds = new Set(
      (previousPeriodOrdersRes.data || [])
        .map((o) => o.user_id)
        .filter(Boolean),
    );
    const returning = [...currentUserIds].filter((id) =>
      previousUserIds.has(id),
    ).length;
    const retention =
      currentUserIds.size > 0 ? (returning / currentUserIds.size) * 100 : 0;

    const categoryMap = new Map<string, number>();
    for (const order of currentPeriodOrdersRes.data || []) {
      const row = (merchantProductsRes.data || []).find((r) => r.products);
      const prod = row
        ? Array.isArray(row.products)
          ? row.products[0]
          : row.products
        : null;
      const cat = prod
        ? Array.isArray(prod.categories)
          ? prod.categories[0]
          : prod.categories
        : null;
      const catName = cat?.name || "Other";
      categoryMap.set(
        catName,
        (categoryMap.get(catName) ?? 0) + Number(order.total_amount || 0),
      );
    }

    const data: AnalyticsData = {
      period,
      totalRevenue: currentRevenue,
      totalOrders: allOrdersRes.data?.length || 0,
      totalProducts: productsRes.count || 0,
      averageOrderValue,
      averageOrderValueChange: calculatePercentageChange(
        averageOrderValue,
        previousAverageOrderValue,
      ),
      revenueChange: calculatePercentageChange(currentRevenue, previousRevenue),
      ordersChange: calculatePercentageChange(
        currentOrderCount,
        previousOrderCount,
      ),
      customerRetention: retention,
      chartData: Array.from(chartMap.entries()).map(([date, v]) => ({
        date,
        ...v,
      })),
      ordersByStatus: {
        pending:
          allOrdersRes.data?.filter((o) => o.status === "pending").length || 0,
        processing:
          allOrdersRes.data?.filter((o) => o.status === "processing").length ||
          0,
        shipped:
          allOrdersRes.data?.filter((o) => o.status === "shipped").length || 0,
        delivered:
          allOrdersRes.data?.filter((o) => o.status === "delivered").length ||
          0,
        cancelled:
          allOrdersRes.data?.filter((o) => o.status === "cancelled").length ||
          0,
      },
      revenueByCategory: Array.from(categoryMap.entries()).map(
        ([name, value]) => ({ name, value: Math.round(value) }),
      ),
    };
    return data;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Merchant analytics error:", error);
    return { error: message };
  }
}

export async function submitWalletTransactionAction(formData: FormData) {
  try {
    const userId = formData.get("userId") as string;
    const type = formData.get("type") as "recharge" | "withdrawal";
    const amount = parseFloat(formData.get("amount") as string);
    const description = formData.get("description") as string;
    const proofFile = formData.get("proofFile") as File;

    if (!userId || !type || isNaN(amount))
      return { error: "Missing required fields" };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== userId) return { error: "Unauthorized" };

    const settingsRes = await getPlatformSettingsAction();
    const settings = "error" in settingsRes ? null : settingsRes;

    if (settings) {
      if (type === "withdrawal") {
        if (!settings.allowMerchantWithdrawal) {
          return { error: "Merchant withdrawals are currently disabled." };
        }
        if (amount < settings.minWithdrawalAmount) {
          return {
            error: `Minimum withdrawal amount is $${settings.minWithdrawalAmount}`,
          };
        }
      }
    }

    const { data: wallet } = await supabase
      .from("wallet")
      .select("id, balance, is_locked")
      .eq("user_id", userId)
      .maybeSingle();

    if (!wallet) return { error: "Wallet not found" };
    if (wallet.is_locked) return { error: "Wallet is locked by admin." };

    if (type === "withdrawal" && Number(wallet.balance) < Math.abs(amount)) {
      return { error: "Insufficient balance for withdrawal." };
    }

    let proof_url = "";
    if (proofFile && proofFile.size > 0) {
      if (
        settings?.maxFileUploadSize &&
        proofFile.size > settings.maxFileUploadSize
      ) {
        return {
          error: `File too large (max ${settings.maxFileUploadSize / (1024 * 1024)} MB)`,
        };
      }
      const path = `${userId}/${Date.now()}.${proofFile.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("wallet-proofs")
        .upload(path, proofFile);
      if (uploadError) throw uploadError;
      const { data: signedData } = await supabase.storage
        .from("wallet-proofs")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      proof_url = signedData?.signedUrl || "";
    }

    const { data: transaction, error: transError } = await supabase
      .from("wallet_transactions")
      .insert({
        wallet_id: wallet.id,
        type,
        amount: type === "withdrawal" ? -Math.abs(amount) : Math.abs(amount),
        status: "pending",
        description,
        proof_image_url: proof_url,
      })
      .select()
      .single();

    if (transError) throw transError;

    if (type === "withdrawal" && description) {
      const { data: merchant } = await supabase
        .from("merchant_profiles")
        .select("wallet_address")
        .eq("user_id", userId)
        .maybeSingle();
      if (merchant && !merchant.wallet_address)
        await supabase
          .from("merchant_profiles")
          .update({ wallet_address: description })
          .eq("user_id", userId);
      else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_address")
          .eq("id", userId)
          .maybeSingle();
        if (profile && !profile.wallet_address)
          await supabase
            .from("profiles")
            .update({ wallet_address: description })
            .eq("id", userId);
      }
    }

    return { success: true, transaction };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Wallet transaction error:", error);
    return { error: message };
  }
}

export async function updateOrderStatusAction(
  merchantId: string,
  orderId: string,
  newStatus: "processing" | "shipped" | "delivered" | "cancelled",
  notes?: string,
  trackingNumber?: string,
) {
  try {
    const { merchant } = await getAuthenticatedMerchant(merchantId);
    const adminSupabase = createAdminClient();

    // Fetch order details
    const { data: order, error: orderError } = await adminSupabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("merchant_id", merchantId)
      .single();

    if (orderError || !order) throw new Error("Order not found");

    const oldStatus = order.status;

    // Financial Logic: Moving from Pending to Processing (Confirmation)
    if (oldStatus === "pending" && newStatus === "processing") {
      const adminCost = Number(order.commission_amount || 0);

      // Use Secure RPC to handle wallet deduction and outstanding balance
      const { error: rpcError } = await adminSupabase.rpc(
        "hold_order_commission",
        {
          merchant_user_id: merchant.user_id,
          order_id: orderId,
          amount: adminCost,
        },
      );

      if (rpcError) {
        return {
          error: rpcError.message.includes("Wallet is locked")
            ? "Wallet is locked by admin."
            : rpcError.message.includes("Insufficient balance")
              ? `Insufficient balance. You need $${adminCost.toFixed(2)} to confirm this order.`
              : `Failed to process order confirmation: ${rpcError.message}`,
        };
      }
    }

    // Financial Logic: Moving to Delivered (Finalized)
    if (newStatus === "delivered" && oldStatus !== "delivered") {
      const adminCost = Number(order.commission_amount || 0);
      const merchantEarnings = Number(order.subtotal_amount || 0);
      const profit = Number(order.profit_amount || 0);

      // Use Secure RPC to handle releasing outstanding balance and awarding profit
      const { error: rpcError } = await adminSupabase.rpc(
        "release_order_commission",
        {
          merchant_user_id: merchant.user_id,
          order_id: orderId,
          commission_amount: adminCost,
          merchant_earnings: merchantEarnings,
          total_sales_amount: Number(order.total_amount || 0),
          total_profit_amount: profit
        },
      );

      if (rpcError) {
        console.error("Failed to release order commission via RPC:", rpcError);
      }
    }

    // Financial Logic: Cancellation
    if (newStatus === "cancelled" && oldStatus !== "cancelled") {
      // 1. Return stock to products table
      const { data: items } = await adminSupabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);

      if (items) {
        for (const item of items) {
          const { data: prod } = await adminSupabase
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .single();

          if (prod) {
            await adminSupabase
              .from("products")
              .update({ stock: Number(prod.stock || 0) + item.quantity })
              .eq("id", item.product_id);
          }
        }
      }

      // 2. Refund Customer if wallet payment
      if (order.payment_method === "wallet") {
        const { error: rpcError } = await adminSupabase.rpc("refund_customer_order", {
          customer_user_id: order.user_id,
          order_id: orderId,
          refund_amount: Number(order.total_amount)
        });

        if (rpcError) {
          console.error("Failed to refund customer via RPC:", rpcError);
        }
      }

      // 3. Return Merchant Admin Cost if already paid (processing/shipped)
      if (oldStatus === "processing" || oldStatus === "shipped") {
        const adminCost = Number(order.commission_amount || 0);
        
        const { error: rpcError } = await adminSupabase.rpc("refund_merchant_order", {
          merchant_user_id: merchant.user_id,
          order_id: orderId,
          admin_cost: adminCost
        });

        if (rpcError) {
          console.error("Failed to refund merchant via RPC:", rpcError);
        }
      }
    }

    // Update order status
    const updateData: Record<string, string | Date> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (notes) updateData.notes = notes;
    if (trackingNumber) updateData.tracking_number = trackingNumber;
    if (newStatus === "delivered")
      updateData.delivered_at = new Date().toISOString();

    const { error: updateError } = await adminSupabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Update order status error:", message);
    return { error: message };
  }
}

export async function shipOrderAction(merchantId: string, orderId: string) {
  return await updateOrderStatusAction(merchantId, orderId, "processing");
}

export async function getWalletAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };
    return await getMerchantWalletAction(user.id);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Get wallet error:", error);
    return { error: message };
  }
}
