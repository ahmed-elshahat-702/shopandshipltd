"use server";

import {
  UsersResponse,
  Deal,
  PlatformSettings,
  Profile,
  UpgradeRequestWithMerchant,
  MerchantApplication,
  AdminMerchantsResponse,
  MerchantProfile,
} from "@/lib/types";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin-client";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const calculateChange = (current: number, prev: number) => {
  if (prev === 0) return current > 0 ? 100 : 0;
  return ((current - prev) / prev) * 100;
};

const checkIsSuperAdmin = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "superadmin";
};

const checkIsAdmin = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin" || profile?.role === "superadmin";
};

// ─── DASHBOARD & ANALYTICS ────────────────────────────────────────────────────

export async function getAdminDashboardAction() {
  try {
    const supabase = createAdminClient();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      customers,
      customersCurrent,
      customersPrev,
      merchants,
      merchantsCurrent,
      merchantsPrev,
      allOrders,
      ordersCurrent,
      ordersPrev,
      walletTx,
      walletTxCurrent,
      walletTxPrev,
      kycStats,
      walletStats,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "customer"),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "customer")
        .gte("created_at", thirtyDaysAgo.toISOString()),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "customer")
        .gte("created_at", sixtyDaysAgo.toISOString())
        .lt("created_at", thirtyDaysAgo.toISOString()),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "merchant"),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "merchant")
        .gte("created_at", thirtyDaysAgo.toISOString()),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "merchant")
        .gte("created_at", sixtyDaysAgo.toISOString())
        .lt("created_at", thirtyDaysAgo.toISOString()),
      supabase.from("orders").select("total_amount"),
      supabase
        .from("orders")
        .select("total_amount, created_at")
        .gte("created_at", thirtyDaysAgo.toISOString()),
      supabase
        .from("orders")
        .select("total_amount")
        .gte("created_at", sixtyDaysAgo.toISOString())
        .lt("created_at", thirtyDaysAgo.toISOString()),
      supabase.from("wallet").select("balance"),
      supabase
        .from("wallet")
        .select("balance")
        .gte("created_at", thirtyDaysAgo.toISOString()),
      (async () => {
        const { data } = await supabase
          .from("wallet")
          .select("balance, total_earnings");
        const balance =
          data?.reduce((sum, w) => sum + Number(w.balance || 0), 0) || 0;
        const totalEarnings =
          data?.reduce((sum, w) => sum + Number(w.total_earnings || 0), 0) || 0;
        return { balance, totalEarnings };
      })(),
      (async () => {
        const { count } = await supabase
          .from("merchant_applications")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        return {
          pending: count || 0,
        };
      })(),
      (async () => {
        const [p, a, r, t] = await Promise.all([
          supabase
            .from("wallet_transactions")
            .select("*", { count: "exact", head: true })
            .in("type", ["withdrawal", "recharge"])
            .eq("status", "pending"),
          supabase
            .from("wallet_transactions")
            .select("*", { count: "exact", head: true })
            .in("type", ["withdrawal", "recharge"])
            .eq("status", "completed"),
          supabase
            .from("wallet_transactions")
            .select("*", { count: "exact", head: true })
            .in("type", ["withdrawal", "recharge"])
            .eq("status", "cancelled"),
          supabase
            .from("wallet_transactions")
            .select("amount")
            .in("type", ["withdrawal", "recharge"])
            .eq("status", "completed"),
        ]);
        return {
          pending: p.count || 0,
          approved: a.count || 0,
          rejected: r.count || 0,
          totalApproved:
            t.data?.reduce((s, r) => s + Math.abs(r.amount || 0), 0) || 0,
        };
      })(),
    ]);

    const dailyStats: Record<string, { revenue: number; orders: number }> = {};
    (
      (ordersCurrent.data as { created_at: string; total_amount: number }[]) ||
      []
    ).forEach((order) => {
      const date = new Date(order.created_at).toLocaleDateString();
      if (!dailyStats[date]) dailyStats[date] = { revenue: 0, orders: 0 };
      dailyStats[date].revenue += order.total_amount;
      dailyStats[date].orders += 1;
    });

    const platformStats = Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const currentRevenue =
      (ordersCurrent.data as { total_amount: number }[])?.reduce(
        (sum, o) => sum + Number(o.total_amount || 0),
        0,
      ) || 0;

    const prevRevenue =
      (ordersPrev.data as { total_amount: number }[])?.reduce(
        (sum, o) => sum + Number(o.total_amount || 0),
        0,
      ) || 0;

    const totalRevenueSum =
      (allOrders.data as { total_amount: number }[])?.reduce(
        (sum, o) => sum + Number(o.total_amount || 0),
        0,
      ) || 0;

    const totalWalletBalance =
      (walletTx.data as { balance: number }[])?.reduce(
        (sum, w) => sum + Number(w.balance || 0),
        0,
      ) || 0;

    const currentWalletBalance =
      (walletTxCurrent.data as { balance: number }[])?.reduce(
        (sum, w) => sum + Number(w.balance || 0),
        0,
      ) || 0;

    const totalPlatformEarnings = walletTxPrev.totalEarnings || 0;

    return {
      stats: {
        totalCustomers: customers.count || 0,
        customersChange: calculateChange(
          customersCurrent.count || 0,
          customersPrev.count || 0,
        ),
        totalMerchants: merchants.count || 0,
        merchantsChange: calculateChange(
          merchantsCurrent.count || 0,
          merchantsPrev.count || 0,
        ),
        totalOrders: allOrders.data?.length || 0,
        ordersChange: calculateChange(
          ordersCurrent.data?.length || 0,
          ordersPrev.data?.length || 0,
        ),
        totalRevenue: totalRevenueSum,
        revenueChange: calculateChange(currentRevenue, prevRevenue),
        pendingApplications: kycStats.pending,
        pendingWithdrawals: walletStats.pending,
        totalWalletBalance,
        walletBalanceChange: calculateChange(currentWalletBalance, 0), // Assuming new balances
        totalPlatformEarnings,
      },
      platformStats,
    };
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return { error: "failedFetchDashboard" };
  }
}

export async function getAdminAnalyticsAction() {
  try {
    const supabase = createAdminClient();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [
      currentOrdersRes,
      prevOrdersRes,
      olderOrdersRes,
      merchantProfilesRes,
      allOrdersCountRes,
      orderItemsRes,
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("id, total_amount, created_at, user_id")
        .gte("created_at", thirtyDaysAgo.toISOString()),
      supabase
        .from("orders")
        .select("id, total_amount, created_at, user_id")
        .gte("created_at", sixtyDaysAgo.toISOString())
        .lt("created_at", thirtyDaysAgo.toISOString()),
      supabase
        .from("orders")
        .select("user_id")
        .gte("created_at", ninetyDaysAgo.toISOString())
        .lt("created_at", sixtyDaysAgo.toISOString()),
      supabase.from("merchant_profiles").select("store_visits"),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase
        .from("order_items")
        .select(`subtotal, products (categories (name))`),
    ]);

    const currentRevenue =
      currentOrdersRes.data?.reduce(
        (sum, o) => sum + Number(o.total_amount),
        0,
      ) || 0;
    const prevRevenue =
      prevOrdersRes.data?.reduce((sum, o) => sum + Number(o.total_amount), 0) ||
      0;
    const currentOrdersCount = currentOrdersRes.data?.length || 0;
    const prevOrdersCount = prevOrdersRes.data?.length || 0;

    const avgOrderValue = currentOrdersCount
      ? currentRevenue / currentOrdersCount
      : 0;
    const prevAvgOrderValue = prevOrdersCount
      ? prevRevenue / prevOrdersCount
      : 0;

    const dailyStats: Record<string, { revenue: number; orders: number }> = {};
    (
      (currentOrdersRes.data as {
        created_at: string;
        total_amount: number;
      }[]) || []
    ).forEach((order) => {
      const date = new Date(order.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (!dailyStats[date]) dailyStats[date] = { revenue: 0, orders: 0 };
      dailyStats[date].revenue += Number(order.total_amount);
      dailyStats[date].orders += 1;
    });

    const platformStats = Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const categorySales: Record<string, number> = {};
    let totalSalesValue = 0;
    (
      (orderItemsRes.data as {
        subtotal: number;
        products:
          | { categories: { name: string } | { name: string }[] }
          | { categories: { name: string } | { name: string }[] }[];
      }[]) || []
    ).forEach((item) => {
      let catName = "Uncategorized";
      const prod = Array.isArray(item.products)
        ? item.products[0]
        : item.products;
      const cat = prod?.categories
        ? Array.isArray(prod.categories)
          ? prod.categories[0]
          : prod.categories
        : null;
      if (cat?.name) catName = cat.name;
      const value = Number(item.subtotal || 0);
      categorySales[catName] = (categorySales[catName] || 0) + value;
      totalSalesValue += value;
    });

    const categoryData = Object.entries(categorySales)
      .map(([name, value]) => ({
        name,
        value:
          totalSalesValue > 0 ? Math.round((value / totalSalesValue) * 100) : 0,
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);

    const totalVisits =
      merchantProfilesRes.data?.reduce(
        (s, p) => s + (p.store_visits || 0),
        0,
      ) || 0;
    const conversionRate =
      totalVisits > 0
        ? ((allOrdersCountRes.count || 0) / totalVisits) * 100
        : 0;

    // Retention logic
    const olderUsers = new Set(olderOrdersRes.data?.map((o) => o.user_id));
    const prevUsers = new Set(prevOrdersRes.data?.map((o) => o.user_id));
    const currentUsers = new Set(currentOrdersRes.data?.map((o) => o.user_id));

    let prevRetainedUsers = 0;
    olderUsers.forEach((id) => {
      if (prevUsers.has(id)) prevRetainedUsers++;
    });
    let currentlyRetainedUsers = 0;
    prevUsers.forEach((id) => {
      if (currentUsers.has(id)) currentlyRetainedUsers++;
    });

    const prevCustomerRetention =
      olderUsers.size > 0 ? (prevRetainedUsers / olderUsers.size) * 100 : 0;
    const customerRetention =
      prevUsers.size > 0 ? (currentlyRetainedUsers / prevUsers.size) * 100 : 0;

    return {
      avgOrderValue,
      avgOrderValueChange: calculateChange(avgOrderValue, prevAvgOrderValue),
      conversionRate,
      conversionChange: 0,
      customerRetention,
      retentionChange: calculateChange(
        customerRetention,
        prevCustomerRetention,
      ),
      platformStats,
      categoryData,
      totalVisits,
      activeUsers: currentUsers.size,
    };
  } catch (error) {
    console.error("Admin analytics error:", error);
    return { error: "failedFetchAnalytics" };
  }
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export async function getAdminProductsAction(options?: {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const { search, category, page = 1, limit = 10 } = options || {};
    const supabase = createAdminClient();
    let query = supabase
      .from("products")
      .select("*, categories(*)", { count: "exact" });
    if (search)
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    if (category) query = query.eq("category_id", category);

    const { data, count, error } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return {
      products: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error("[admin_products_get] Error:", error);
    return { error: "serverError" };
  }
}

export async function createAdminProductAction(data: Record<string, unknown>) {
  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) return { error: "unauthorized" };

    const supabase = createAdminClient();
    const { data: product, error } = await supabase
      .from("products")
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return { product };
  } catch (_error) {
    console.error("[admin_products_post] Error:", _error);
    return { error: "failedCreateProduct" };
  }
}

export async function updateAdminProductAction(
  id: string,
  data: Record<string, unknown>,
) {
  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) return { error: "unauthorized" };

    const supabase = createAdminClient();
    if (data.image_urls) {
      const { data: old } = await supabase
        .from("products")
        .select("image_urls")
        .eq("id", id)
        .single();
      const orphaned = ((old?.image_urls as string[]) || []).filter(
        (u) => !(data.image_urls as string[]).includes(u),
      );
      if (orphaned.length > 0) {
        const paths = orphaned
          .map((u) => u.split("/product-images/")[1])
          .filter(Boolean);
        if (paths.length > 0)
          await supabase.storage.from("product-images").remove(paths);
      }
    }
    const { data: product, error } = await supabase
      .from("products")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return { product };
  } catch (_error) {
    console.error("[admin_products_put] Error:", _error);
    return { error: "failedUpdateProduct" };
  }
}

export async function deleteAdminProductAction(id: string) {
  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) return { error: "unauthorized" };

    const supabase = createAdminClient();
    const { data: p } = await supabase
      .from("products")
      .select("image_urls")
      .eq("id", id)
      .single();
    if (p?.image_urls) {
      const paths = (p.image_urls as string[])
        .map((u) => u.split("/product-images/")[1])
        .filter(Boolean);
      if (paths.length > 0)
        await supabase.storage.from("product-images").remove(paths);
    }
    await supabase.from("products").delete().eq("id", id);
    return { success: true };
  } catch (_error) {
    console.error("[admin_products_delete] Error:", _error);
    return { error: "failedDeleteProduct" };
  }
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function getAdminUsersAction(options?: {
  page?: number;
  limit?: number;
  role?: string | string[] | null;
  search?: string | null;
}): Promise<UsersResponse> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const { role, search } = options || {};
    const supabase = createAdminClient();

    // Check if the current user is a superadmin
    const isSuperAdmin = await checkIsSuperAdmin();

    let query = supabase
      .from("profiles")
      .select("id, email, full_name, role, is_active, created_at, wallet(is_locked)", {
        count: "exact",
      });

    // Enforcement: If NOT superadmin, they can only see customers and merchants
    if (!isSuperAdmin) {
      if (role) {
        if (Array.isArray(role)) {
          // Filter out admin roles from requested list
          const allowedRoles = role.filter(
            (r) => r !== "admin" && r !== "superadmin",
          );
          if (allowedRoles.length === 0) {
            return { users: [], total: 0, page, limit, totalPages: 0 };
          }
          query = query.in("role", allowedRoles);
        } else {
          // If they explicitly asked for an admin role, return nothing
          if (role === "admin" || role === "superadmin") {
            return { users: [], total: 0, page, limit, totalPages: 0 };
          }
          query = query.eq("role", role);
        }
      } else {
        // If "All" (no role specified), exclude admins and superadmins
        query = query.not("role", "in", '("admin","superadmin")');
      }
    } else if (role) {
      // Superadmin can filter as they wish
      if (Array.isArray(role)) {
        query = query.in("role", role);
      } else {
        query = query.eq("role", role);
      }
    }

    if (search)
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data, count, error } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const users =
      data?.map((profile) => {
        const wallet = Array.isArray(profile.wallet)
          ? profile.wallet[0]
          : profile.wallet;
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          is_active: profile.is_active,
          created_at: profile.created_at,
          wallet_locked: Boolean(wallet?.is_locked),
        };
      }) || [];

    return {
      users: users as Profile[],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch {
    return {
      users: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
      error: "failedFetchUsers",
    };
  }
}

export async function createAdminUserAction(userData: Record<string, unknown>) {
  try {
    const isSuperAdmin = await checkIsSuperAdmin();
    const isAdmin = await checkIsAdmin();

    // If trying to create an admin or superadmin, MUST be superadmin
    if (
      (userData.role === "admin" || userData.role === "superadmin") &&
      !isSuperAdmin
    ) {
      return { error: "onlySuperadminsCreateAdmin" };
    }

    // Normal admins can create customers/merchants
    if (!isAdmin) return { error: "unauthorized" };

    const supabase = createAdminClient();
    const { data: auth, error: authErr } = await supabase.auth.admin.createUser(
      {
        email: userData.email as string,
        password: (userData.password as string) || "Temp123456!",
        email_confirm: true,
        user_metadata: { full_name: userData.full_name },
      },
    );

    if (authErr) throw authErr;
    await supabase
      .from("profiles")
      .update({
        full_name: userData.full_name,
        role: userData.role,
        is_active: true,
      })
      .eq("id", auth.user.id);

    // If the new user is a merchant, create a merchant_profiles row
    if (userData.role === "merchant") {
      const storeName = (userData.full_name as string) || (userData.email as string).split("@")[0];
      const storeSlug =
        storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
        "-" +
        Math.random().toString(36).substring(2, 7);

      // Fetch base merchant level (lowest min_wallet_balance)
      const { data: baseLevel } = await supabase
        .from("merchant_levels")
        .select("id")
        .order("min_wallet_balance", { ascending: true })
        .limit(1)
        .single();

      await supabase.from("merchant_profiles").insert({
        user_id: auth.user.id,
        business_name: storeName,
        store_slug: storeSlug,
        is_verified: true,
        kyc_status: "approved",
        level_id: baseLevel?.id || 1,
      });
    }

    return { user: auth.user };
  } catch (error) {
    console.error("Create user error:", error);
    return { error: "failedCreateUser" };
  }
}

/**
 * USE THIS ACTION TO INITIALIZE THE FIRST SUPERADMIN
 * YOU CAN CALL THIS FROM A TEMPORARY COMPONENT OR VIA CONSOLE
 */
export async function createSuperAdminAction(
  userData: Record<string, unknown>,
) {
  try {
    const supabase = createAdminClient();

    // Create the auth user
    const { data: auth, error: authErr } = await supabase.auth.admin.createUser(
      {
        email: userData.email as string,
        password: userData.password as string,
        email_confirm: true,
        user_metadata: { full_name: userData.full_name },
      },
    );

    if (authErr) throw authErr;

    // The trigger public.handle_new_user might set it to 'customer' by default.
    // We override it to 'superadmin'.
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        role: "superadmin",
        is_active: true,
        full_name: userData.full_name,
      })
      .eq("id", auth.user.id);

    if (profileErr) throw profileErr;

    return { success: true, user: auth.user };
  } catch (error) {
    console.error("Superadmin creation failed:", error);
    return { error: "failedCreateSuperadmin" };
  }
}

export async function deleteAdminUserAction(userId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "unauthorized" };
    if (user.id === userId) return { error: "cannotDeleteSelf" };

    const isSuperAdmin = await checkIsSuperAdmin();
    if (!isSuperAdmin) {
      // Check if the user being deleted is an admin
      const adminSupabase = createAdminClient();
      const { data: target } = await adminSupabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (target?.role === "admin" || target?.role === "superadmin") {
        return { error: "onlySuperadminsDeleteAdmin" };
      }
    }

    const isAdmin = await checkIsAdmin();
    if (!isAdmin) return { error: "unauthorized" };

    const adminSupabase = createAdminClient();
    await adminSupabase.auth.admin.deleteUser(userId);
    return { success: true };
  } catch {
    return { error: "failedDeleteUser" };
  }
}

export async function getUserDetailsAction(userId: string) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return { user: data };
  } catch {
    console.error("Fetch user detail error");
    return { error: "failedFetchUserDetails" };
  }
}

export async function updateAdminUserAction(
  userId: string,
  data: Record<string, unknown>,
) {
  try {
    const supabaseClient = await createClient();
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) return { error: "unauthorized" };
    if (user.id === userId) return { error: "cannotUpdateSelf" };

    const isSuperAdmin = await checkIsSuperAdmin();

    const supabase = createAdminClient();

    // Fetch the target user's current role
    const { data: target } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    // Enforcement: If NOT superadmin, they cannot manage admins/superadmins
    // and cannot promote anyone to admin/superadmin.
    if (!isSuperAdmin) {
      if (target?.role === "admin" || target?.role === "superadmin") {
        return { error: "onlySuperadminsManageAdmin" };
      }
      if (data.role === "admin" || data.role === "superadmin") {
        return { error: "onlySuperadminsPromoteAdmin" };
      }
    }

    if (data.email || data.password || data.full_name) {
      const updates: Record<string, unknown> = {};
      if (data.email) {
        updates.email = data.email;
        updates.email_confirm = true;
      }
      if (data.password) updates.password = data.password;
      if (data.full_name) updates.user_metadata = { full_name: data.full_name };
      const { error } = await supabase.auth.admin.updateUserById(
        userId,
        updates,
      );
      if (error) throw error;
    }
    const profile: Record<string, unknown> = {};
    if (data.full_name !== undefined) profile.full_name = data.full_name;
    if (data.role !== undefined) profile.role = data.role;
    if (data.is_active !== undefined) profile.is_active = data.is_active;
    if (data.phone !== undefined) profile.phone = data.phone;
    if (data.profile_image_url !== undefined)
      profile.profile_image_url = data.profile_image_url;
    if (Object.keys(profile).length > 0)
      await supabase.from("profiles").update(profile).eq("id", userId);

    // If role is being changed to merchant, ensure a merchant_profiles row exists
    if (data.role === "merchant" && target?.role !== "merchant") {
      const { data: existingMerchant } = await supabase
        .from("merchant_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingMerchant) {
        // Fetch the user's name for the store
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", userId)
          .single();

        const storeName = (data.full_name as string) || userProfile?.full_name || userProfile?.email?.split("@")[0] || "store";
        const storeSlug =
          storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
          "-" +
          Math.random().toString(36).substring(2, 7);

        // Fetch base merchant level (lowest min_wallet_balance)
        const { data: baseLevel } = await supabase
          .from("merchant_levels")
          .select("id")
          .order("min_wallet_balance", { ascending: true })
          .limit(1)
          .single();

        const { error: merchantError } = await supabase.from("merchant_profiles").insert({
          user_id: userId,
          business_name: storeName,
          store_slug: storeSlug,
          is_verified: true,
          kyc_status: "approved",
          level_id: baseLevel?.id || 1,
        });
        if (merchantError) throw merchantError;
      }
    }

    if (data.wallet_locked !== undefined) {
      const { error: walletError } = await supabase.from("wallet").upsert(
        {
          user_id: userId,
          is_locked: Boolean(data.wallet_locked),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (walletError) throw walletError;
    }
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "failedUpdateUser",
    };
  }
}

export async function updateAdminMerchantAction(
  userId: string,
  data: {
    full_name?: string;
    business_name?: string;
    is_active?: boolean;
  },
) {
  try {
    const supabase = createAdminClient();

    // Update profile
    const profileUpdates: Record<string, unknown> = {};
    if (data.full_name !== undefined) profileUpdates.full_name = data.full_name;
    if (data.is_active !== undefined) profileUpdates.is_active = data.is_active;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: pError } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", userId);
      if (pError) throw pError;

      // Also update auth metadata if full_name changed
      if (data.full_name !== undefined) {
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { full_name: data.full_name },
        });
      }
    }

    // Update merchant profile
    if (data.business_name !== undefined) {
      const { error: mError } = await supabase
        .from("merchant_profiles")
        .update({
          business_name: data.business_name,
        })
        .eq("user_id", userId);
      if (mError) throw mError;
    }

    return { success: true };
  } catch (error) {
    console.error("Update merchant error:", error);
    return { error: "failedUpdateMerchant" };
  }
}

// ─── MERCHANTS & APPLICATIONS ────────────────────────────────────────────────

export async function getAdminMerchantApplicationsAction(options?: {
  page?: number;
  limit?: number;
  status?: string | null;
}) {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const status = options?.status || "pending";

    const supabase = createAdminClient();
    let query = supabase
      .from("merchant_applications")
      .select("*, user:profiles(*)", { count: "exact" });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, count, error } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const applications = (await Promise.all(
      (data || []).map(async (app) => {
        const getSigned = async (url: string | null) => {
          if (!url) return url;
          try {
            let path = url;
            let bucket = "kyc-documents";
            if (path.includes("/profiles/")) {
              bucket = "profiles";
              path = path.split("/profiles/")[1].split("?")[0];
            } else if (path.includes("/kyc-documents/")) {
              path = path.split("/kyc-documents/")[1].split("?")[0];
            } else if (url.startsWith("http")) {
              // If it's a direct public URL from storage.getPublicUrl
              return url;
            }

            const { data: signed } = await supabase.storage
              .from(bucket)
              .createSignedUrl(path, 3600);
            return signed?.signedUrl ?? url;
          } catch {
            return url;
          }
        };

        return {
          ...app,
          id_front_url: await getSigned(app.id_front_url),
          id_back_url: await getSigned(app.id_back_url),
          selfie_url: await getSigned(app.selfie_url),
          store_logo: await getSigned(app.store_logo),
        };
      }),
    )) as MerchantApplication[];

    return {
      applications,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error("Fetch applications error:", error);
    return { error: "failedFetchMerchantApps" };
  }
}

export async function approveMerchantApplicationAction(id: string) {
  try {
    const supabase = createAdminClient();

    // 1. Get the application
    const { data: app, error: appError } = await supabase
      .from("merchant_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (appError || !app) throw new Error("appNotFound");

    // 2. Update user role to merchant
    const { error: roleError } = await supabase
      .from("profiles")
      .update({ role: "merchant" })
      .eq("id", app.user_id);

    if (roleError) throw roleError;

    // 3. Create merchant profile
    const storeSlug =
      app.store_name.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
      "-" +
      Math.random().toString(36).substring(2, 7);

    // Fetch base level (lowest min_wallet_balance)
    const { data: baseLevel } = await supabase
      .from("merchant_levels")
      .select("id")
      .order("min_wallet_balance", { ascending: true })
      .limit(1)
      .single();

    const { data: merchant, error: merchantError } = await supabase
      .from("merchant_profiles")
      .insert({
        user_id: app.user_id,
        business_name: app.store_name,
        business_description: app.store_description,
        business_category: app.store_category,
        logo_url: app.store_logo,
        store_slug: storeSlug,
        is_verified: true, // Auto verify since admin approved the application
        kyc_status: "approved",
        country: app.issuing_country,
        level_id: baseLevel?.id || 1, // Start at base level
      })
      .select()
      .single();

    if (merchantError) throw merchantError;

    // 4. Create initial KYC request record (to keep history)
    await supabase.from("kyc_requests").insert({
      user_id: app.user_id,
      merchant_id: merchant.id,
      id_card_url: app.id_front_url,
      business_license_url: app.id_back_url || app.id_front_url, // fallback
      status: "approved",
      reviewed_at: new Date().toISOString(),
    });

    // 5. Update application status
    await supabase
      .from("merchant_applications")
      .update({ status: "approved" })
      .eq("id", id);

    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "failedApproveMerchant";
    console.error("Approve merchant error:", message);
    return { error: message };
  }
}

export async function rejectMerchantApplicationAction(
  id: string,
  reason: string,
) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("merchant_applications")
      .update({ status: "rejected", rejection_reason: reason })
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch {
    return { error: "failedRejectMerchant" };
  }
}

export async function deleteMerchantAction(merchantId: string) {
  try {
    const supabase = createAdminClient();
    // Revert role to customer
    await supabase
      .from("profiles")
      .update({ role: "customer" })
      .eq("id", merchantId);
    // Delete merchant profile
    await supabase.from("merchant_profiles").delete().eq("user_id", merchantId);
    return { success: true };
  } catch {
    return { error: "failedDeleteMerchant" };
  }
}

// ─── WALLET ───────────────────────────────────────────────────────────────────

export async function getWithdrawalDetailAction(requestId: string) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select(
        `id, amount, status, description, rejection_reason, created_at, updated_at, approved_by, wallet(user_id, profiles(email, merchant_profiles(id, business_name, wallet_address, total_profit)))`,
      )
      .eq("id", requestId)
      .single();
    if (error) throw error;
    if (!data) return null;

    const wallet = Array.isArray(data.wallet) ? data.wallet[0] : data.wallet;
    const profile = Array.isArray(wallet?.profiles)
      ? wallet.profiles[0]
      : wallet?.profiles;
    const merchant = Array.isArray(profile?.merchant_profiles)
      ? profile.merchant_profiles[0]
      : profile?.merchant_profiles;

    return {
      id: data.id,
      merchant_id: merchant?.id || "",
      amount: Math.abs(data.amount),
      wallet_address: data.description || merchant?.wallet_address || "",
      status:
        data.status === "completed"
          ? "approved"
          : data.status === "cancelled"
            ? "rejected"
            : data.status,
      notes: data.rejection_reason || data.description,
      created_at: data.created_at,
      processed_at: data.updated_at,
      processed_by: data.approved_by,
      merchants: [
        {
          store_name: merchant?.business_name || "",
          contact_email: profile?.email || "",
          total_earnings: merchant?.total_profit || 0,
        },
      ],
    };
  } catch (_error) {
    console.error("Fetch withdrawal detail error:", _error);
    return { error: "failedFetchWithdrawal" };
  }
}

export async function getAdminWalletAction(options?: {
  page?: number;
  limit?: number;
  status?: string | null;
}) {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const status = options?.status === undefined ? "pending" : options.status;
    const supabase = createAdminClient();
    let query = supabase
      .from("wallet_transactions")
      .select(
        `id, amount, type, status, proof_image_url, description, created_at, wallet(user_id, profiles(email, full_name, merchant_profiles(id, business_name, wallet_address)))`,
        { count: "exact" },
      )
      .in("type", ["withdrawal", "recharge"]);
    if (status && status !== "all") {
      const dbStatus =
        status === "approved"
          ? "completed"
          : status === "rejected"
            ? "cancelled"
            : status;
      query = query.eq("status", dbStatus);
    }
    const { data, count, error } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const requests = (data || []).map((req) => {
      const wallet = Array.isArray(req.wallet) ? req.wallet[0] : req.wallet;
      const profile = Array.isArray(wallet?.profiles)
        ? wallet.profiles[0]
        : wallet?.profiles;
      const merchant = Array.isArray(profile?.merchant_profiles)
        ? profile.merchant_profiles[0]
        : profile?.merchant_profiles;

      return {
        id: req.id,
        merchant_id: merchant?.id || null,
        user_id: wallet?.user_id,
        amount: Math.abs(req.amount),
        type: req.type,
        proof_image_url: req.proof_image_url,
        wallet_address: req.description || merchant?.wallet_address || "",
        created_at: req.created_at,
        status:
          req.status === "completed"
            ? "approved"
            : req.status === "cancelled"
              ? "rejected"
              : req.status,
        profiles: profile
          ? { full_name: profile.full_name, email: profile.email }
          : null,
        merchants: merchant
          ? [
              {
                store_name: merchant.business_name,
                contact_email: profile?.email || "N/A",
              },
            ]
          : null,
      };
    });

    const [p, a, r, t] = await Promise.all([
      supabase
        .from("wallet_transactions")
        .select("*", { count: "exact", head: true })
        .in("type", ["withdrawal", "recharge"])
        .eq("status", "pending"),
      supabase
        .from("wallet_transactions")
        .select("*", { count: "exact", head: true })
        .in("type", ["withdrawal", "recharge"])
        .eq("status", "completed"),
      supabase
        .from("wallet_transactions")
        .select("*", { count: "exact", head: true })
        .in("type", ["withdrawal", "recharge"])
        .eq("status", "cancelled"),
      supabase
        .from("wallet_transactions")
        .select("amount, type")
        .in("type", ["withdrawal", "recharge"])
        .eq("status", "completed"),
    ]);

    const totalRecharged =
      t.data
        ?.filter((tx) => tx.type === "recharge")
        .reduce((s, r) => s + Math.abs(r.amount || 0), 0) || 0;

    const totalWithdrawn =
      t.data
        ?.filter((tx) => tx.type === "withdrawal")
        .reduce((s, r) => s + Math.abs(r.amount || 0), 0) || 0;

    return {
      requests,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      stats: {
        pending: p.count || 0,
        approved: a.count || 0,
        rejected: r.count || 0,
        totalRecharged,
        totalWithdrawn,
      },
    };
  } catch {
    return { error: "failedFetchWallet" };
  }
}

export async function approveWithdrawalAction(requestId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "unauthorized" };

    const isAdmin = await checkIsAdmin();
    if (!isAdmin) return { error: "unauthorized" };

    const adminSupabase = createAdminClient();
    const { data: request, error: requestError } = await adminSupabase
      .from("wallet_transactions")
      .select("wallet(is_locked)")
      .eq("id", requestId)
      .single();
    if (requestError) throw requestError;

    const wallet = Array.isArray(request.wallet)
      ? request.wallet[0]
      : request.wallet;
    if (wallet?.is_locked) return { error: "Wallet is locked by admin." };

    const { error } = await adminSupabase
      .from("wallet_transactions")
      .update({
        status: "completed",
        approved_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Approve withdrawal error:", error);
    return { error: "failedApproveWithdrawal" };
  }
}

export async function rejectWithdrawalAction(
  requestId: string,
  reason: string,
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "unauthorized" };

    const isAdmin = await checkIsAdmin();
    if (!isAdmin) return { error: "unauthorized" };

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("wallet_transactions")
      .update({
        status: "cancelled",
        approved_by: user.id,
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Reject withdrawal error:", error);
    return { error: "failedRejectWithdrawal" };
  }
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

export async function getPlatformSettingsAction(): Promise<
  PlatformSettings | { error: string }
> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("platform_settings")
      .select("*");
    if (error) throw error;
    const settingsMap = data.reduce(
      (acc, row) => ({ ...acc, [row.setting_key]: row.setting_value }),
      {} as Record<string, string>,
    );
    return {
      platformName: settingsMap.platform_name || "Shop & Ship LED",
      platformCommission: Number(settingsMap.platform_commission_default || 15),
      maxFileUploadSize: Number(settingsMap.max_file_upload_size || 10485760),
      emailVerificationRequired:
        settingsMap.email_verification_required === "true",
      kycRequiredForMerchant: settingsMap.kyc_required_for_merchant !== "false",
      minWithdrawalAmount: Number(settingsMap.min_withdrawal_amount || 100),
      allowCustomerWithdrawal:
        settingsMap.allow_customer_withdrawal !== "false",
      allowMerchantWithdrawal:
        settingsMap.allow_merchant_withdrawal !== "false",
      autoApproveKYC: settingsMap.auto_approve_kyc === "true",
      emailNotifications: settingsMap.email_notifications !== "false",
      maintenanceMode: settingsMap.maintenance_mode === "true",
      adminWalletAddress: settingsMap.admin_wallet_address || "",
    };
  } catch {
    return { error: "failedFetchSettings" };
  }
}

export async function updatePlatformSettingsAction(
  settingsData: PlatformSettings | Partial<PlatformSettings>,
) {
  try {
    const supabase = createAdminClient();
    const toUpsert = [];
    if (settingsData.platformName !== undefined)
      toUpsert.push({
        setting_key: "platform_name",
        setting_value: String(settingsData.platformName),
      });
    if (settingsData.platformCommission !== undefined)
      toUpsert.push({
        setting_key: "platform_commission_default",
        setting_value: String(settingsData.platformCommission),
      });
    if (settingsData.maxFileUploadSize !== undefined)
      toUpsert.push({
        setting_key: "max_file_upload_size",
        setting_value: String(settingsData.maxFileUploadSize),
      });
    if (settingsData.emailVerificationRequired !== undefined)
      toUpsert.push({
        setting_key: "email_verification_required",
        setting_value: String(settingsData.emailVerificationRequired),
      });
    if (settingsData.kycRequiredForMerchant !== undefined)
      toUpsert.push({
        setting_key: "kyc_required_for_merchant",
        setting_value: String(settingsData.kycRequiredForMerchant),
      });
    if (settingsData.minWithdrawalAmount !== undefined)
      toUpsert.push({
        setting_key: "min_withdrawal_amount",
        setting_value: String(settingsData.minWithdrawalAmount),
      });
    if (settingsData.allowCustomerWithdrawal !== undefined)
      toUpsert.push({
        setting_key: "allow_customer_withdrawal",
        setting_value: String(settingsData.allowCustomerWithdrawal),
      });
    if (settingsData.allowMerchantWithdrawal !== undefined)
      toUpsert.push({
        setting_key: "allow_merchant_withdrawal",
        setting_value: String(settingsData.allowMerchantWithdrawal),
      });
    if (settingsData.autoApproveKYC !== undefined)
      toUpsert.push({
        setting_key: "auto_approve_kyc",
        setting_value: String(settingsData.autoApproveKYC),
      });
    if (settingsData.emailNotifications !== undefined)
      toUpsert.push({
        setting_key: "email_notifications",
        setting_value: String(settingsData.emailNotifications),
      });
    if (settingsData.maintenanceMode !== undefined)
      toUpsert.push({
        setting_key: "maintenance_mode",
        setting_value: String(settingsData.maintenanceMode),
      });
    if (settingsData.adminWalletAddress !== undefined)
      toUpsert.push({
        setting_key: "admin_wallet_address",
        setting_value: String(settingsData.adminWalletAddress),
      });

    if (toUpsert.length > 0)
      await supabase
        .from("platform_settings")
        .upsert(toUpsert, { onConflict: "setting_key" });
    return { success: true };
  } catch {
    return { error: "failedUpdateSettings" };
  }
}

// ─── DEALS ────────────────────────────────────────────────────────────────────

export async function getAdminDealsAction() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return { deals: data as Deal[] };
  } catch {
    return { error: "failedFetchDeals" };
  }
}

export async function createAdminDealAction(data: Partial<Deal>) {
  try {
    const supabase = createAdminClient();
    const { data: deal, error } = await supabase
      .from("deals")
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return { deal };
  } catch {
    return { error: "failedCreateDeal" };
  }
}

export async function updateAdminDealAction(id: string, data: Partial<Deal>) {
  try {
    const supabase = createAdminClient();
    const { data: deal, error } = await supabase
      .from("deals")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return { deal };
  } catch {
    return { error: "failedUpdateDeal" };
  }
}

export async function deleteAdminDealAction(id: string) {
  try {
    const supabase = createAdminClient();
    await supabase.from("deals").delete().eq("id", id);
    return { success: true };
  } catch {
    return { error: "failedDeleteDeal" };
  }
}

export async function uploadDealImageAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const file = formData.get("file") as File;
    if (!file) return { error: "noFileProvided" };
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage
      .from("deals")
      .upload(path, buffer, { contentType: file.type });
    if (error) throw error;
    const url = supabase.storage
      .from("deals")
      .getPublicUrl(path).data.publicUrl;
    return { url };
  } catch {
    return { error: "failedUploadDealImage" };
  }
}

// ─── UPGRADES ─────────────────────────────────────────────────────────────────

export async function getUpgradeRequestsAction() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("merchant_level_upgrades")
      .select(
        `*, merchant_profiles(business_name, level_id, profiles(full_name))`,
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const requests: UpgradeRequestWithMerchant[] = (data || []).map((req) => ({
      ...req,
      requested_level: req.requested_level_id,
      merchant: {
        name: req.merchant_profiles?.profiles?.full_name ?? "Merchant User",
        store_name: req.merchant_profiles?.business_name ?? "Official Store",
        level: req.merchant_profiles?.level_id ?? 1,
      },
    }));
    return { requests };
  } catch {
    return { error: "failedFetchUpgrades" };
  }
}

export async function respondToUpgradeRequestAction(
  requestId: string,
  status: "approved" | "rejected",
  merchantId: string,
  newLevel: number,
  reason?: string,
) {
  try {
    const supabase = createAdminClient();
    await supabase
      .from("merchant_level_upgrades")
      .update({
        status,
        rejection_reason: status === "rejected" ? reason || null : null,
        updated_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    if (status === "approved")
      await supabase
        .from("merchant_profiles")
        .update({ level_id: newLevel })
        .eq("id", merchantId);
    return { success: true };
  } catch {
    return { error: "failedProcessUpgrade" };
  }
}

// ─── UTILS ────────────────────────────────────────────────────────────────────

export async function uploadProductImagesAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const files = formData.getAll("files") as File[];
    if (!files || files.length === 0) return { error: "noFilesProvided" };
    const urls: string[] = [];
    for (const file of files) {
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split(".").pop() ?? "jpg"}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, buffer, { contentType: file.type });
      if (error) throw error;
      urls.push(
        supabase.storage.from("product-images").getPublicUrl(path).data
          .publicUrl,
      );
    }
    return { urls };
  } catch {
    return { error: "failedUploadImages" };
  }
}

export async function getCurrentUserAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    return profile;
  } catch {
    return null;
  }
}

// ─── CATEGORIES & MERCHANTS ───────────────────────────────────────────────────

export async function createAdminCategoryAction(data: {
  name: string;
  description?: string;
}) {
  try {
    const supabase = createAdminClient();
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { data: category, error } = await supabase
      .from("categories")
      .insert([{ ...data, slug, is_active: true }])
      .select()
      .single();
    if (error) throw error;
    return { category };
  } catch (error) {
    console.error("[admin_category_post] Error:", error);
    return { error: "failedCreateCategory" };
  }
}

export async function getAdminMerchantsAction(options?: {
  page?: number;
  limit?: number;
  search?: string | null;
}): Promise<AdminMerchantsResponse> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const search = options?.search?.trim();
    const supabase = createAdminClient();

    let query = supabase
      .from("merchant_profiles")
      .select(
        "*, profiles!inner(id, email, full_name, role, is_active, created_at)",
        { count: "exact" },
      );

    if (search) {
      // 1. First find profile IDs that match the search term in full_name or email
      const { data: pData } = await supabase
        .from("profiles")
        .select("id")
        .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

      const profileIds = pData?.map((p) => p.id) || [];

      // 2. Filter merchant profiles by business_name OR matching profile IDs
      if (profileIds.length > 0) {
        query = query.or(
          `business_name.ilike.%${search}%,user_id.in.(${profileIds.join(",")})`,
        );
      } else {
        query = query.ilike("business_name", `%${search}%`);
      }
    }

    const { data, count, error } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return {
      merchants: (data as unknown as MerchantProfile[]) || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error("[admin_merchants_get] Error:", error);
    return {
      merchants: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
      error: "failedFetchMerchants",
    };
  }
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────

export async function getAdminOrdersAction(options?: {
  page?: number;
  limit?: number;
  status?: string | null;
  search?: string | null;
}) {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const { status, search } = options || {};
    const supabase = createAdminClient();

    let query = supabase
      .from("orders")
      .select(
        "*, profiles!inner(full_name, email), merchant_profiles!inner(business_name)",
        {
          count: "exact",
        },
      );

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,tracking_number.ilike.%${search}%`,
      );
    }

    const { data, count, error } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return {
      orders: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error("[admin_orders_get] Error:", error);
    return { error: "failedFetchOrders" };
  }
}

export async function getAdminOrderDetailAction(orderId: string) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        profiles!inner(full_name, email, phone),
        merchant_profiles!inner(business_name, logo_url, email:profiles(email)),
        order_items(id, quantity, price_per_unit, subtotal, product_name, product_image_url, product_sku, variant_id, variant_details, products(name, image_url, sku))
      `,
      )
      .eq("id", orderId)
      .single();

    if (error) throw error;
    return { order: data };
  } catch (error) {
    console.error("[admin_order_detail_get] Error:", error);
    return { error: "failedFetchOrderDetail" };
  }
}

export async function adminUpdateOrderStatusAction(
  orderId: string,
  status: string,
  notes?: string,
  trackingNumber?: string,
) {
  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) return { error: "unauthorized" };

    const supabase = createAdminClient();

    // Fetch existing order to check financial logic
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, merchant_profiles(user_id)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) throw new Error("Order not found");

    const oldStatus = order.status;

    // Financial Logic: Moving to Delivered
    if (status === "delivered" && oldStatus !== "delivered") {
      const adminCost = Number(order.commission_amount || 0);
      const profit = Number(order.profit_amount || 0);
      const amountToReturn = adminCost + profit;
      const merchantUserId = order.merchant_profiles?.user_id;

      if (merchantUserId) {
        // Use Secure RPC to handle releasing outstanding balance and awarding profit
        const { error: rpcError } = await supabase.rpc("release_order_commission", {
          merchant_user_id: merchantUserId,
          order_id: orderId,
          commission_amount: adminCost,
          merchant_earnings: amountToReturn,
          total_sales_amount: Number(order.total_amount || 0),
          total_profit_amount: profit
        });

        if (rpcError) {
          console.error("Failed to release order commission via RPC:", rpcError);
        }
        
        // Notify merchant
        await supabase.from("notifications").insert({
          user_id: merchantUserId,
          title: "Order Delivered",
          message: `Order #${order.order_number} has been delivered. Your commission of $${adminCost.toFixed(2)} and profit of $${profit.toFixed(2)} have been added to your wallet.`,
          type: "order_delivered",
          read: false,
        });
      }
    }

    // Financial Logic: Cancellation
    if (status === "cancelled" && oldStatus !== "cancelled") {
      // 1. Return stock to products table
      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);

      if (items) {
        for (const item of items) {
          const { data: prod } = await supabase
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .single();

          if (prod) {
            await supabase
              .from("products")
              .update({ stock: Number(prod.stock || 0) + item.quantity })
              .eq("id", item.product_id);
          }
        }
      }

      // 2. Refund Customer if wallet payment
      if (order.payment_method === "wallet") {
        const { error: rpcError } = await supabase.rpc("refund_customer_order", {
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
        const merchantUserId = order.merchant_profiles?.user_id;

        if (merchantUserId) {
          const { error: rpcError } = await supabase.rpc("refund_merchant_order", {
            merchant_user_id: merchantUserId,
            order_id: orderId,
            admin_cost: adminCost
          });

          if (rpcError) {
            console.error("Failed to refund merchant via RPC:", rpcError);
          }
        }
      }
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (notes !== undefined) updateData.notes = notes;
    if (trackingNumber !== undefined)
      updateData.tracking_number = trackingNumber;
    if (status === "delivered")
      updateData.delivered_at = new Date().toISOString();

    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("[admin_order_status_put] Error:", error);
    return { error: "failedUpdateOrderStatus" };
  }
}

export async function adminRechargeWalletAction(
  userId: string,
  amount: number,
  description?: string
) {
  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) return { error: "unauthorized" };

    const supabaseClient = await createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: "unauthorized" };

    const adminSupabase = createAdminClient();

    // 1. Get the wallet for the user
    const { data: targetWallet, error: walletError } = await adminSupabase
      .from("wallet")
      .select("id, is_locked")
      .eq("user_id", userId)
      .single();

    if (walletError || !targetWallet) {
      return { error: "walletNotFound" };
    }

    if (targetWallet.is_locked) {
       return { error: "walletLocked" };
    }

    // 2. Insert completed recharge transaction
    const { error: txError } = await adminSupabase
      .from("wallet_transactions")
      .insert({
        wallet_id: targetWallet.id,
        type: "recharge",
        amount: Math.abs(amount),
        status: "completed",
        description: description || "Manual recharge by Admin",
        approved_by: user.id
      });

    if (txError) throw txError;

    return { success: true };
  } catch (error) {
    console.error("Admin recharge wallet error:", error);
    return { error: "failedRechargeWallet" };
  }
}

