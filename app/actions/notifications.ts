"use server";

import { createAdminClient } from "@/utils/supabase/admin-client";
import { createClient } from "@/utils/supabase/server";
import { NotificationType, AppNotification } from "@/lib/types";

// ─── INTERNAL HELPERS (used by other server actions) ─────────────────────────

/**
 * Create a single notification. Uses admin client to bypass RLS.
 * This is the core helper called by all other server actions.
 */
export async function createNotification(data: {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("notifications").insert({
      user_id: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata || {},
      is_read: false,
    });

    if (error) {
      console.error("Failed to create notification:", error);
    }
  } catch (err) {
    console.error("Notification creation error:", err);
  }
}

/**
 * Create multiple notifications at once (e.g., notify all admins).
 */
export async function createBulkNotifications(
  items: Array<{
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }>
) {
  try {
    const supabase = createAdminClient();
    const rows = items.map((item) => ({
      user_id: item.user_id,
      type: item.type,
      title: item.title,
      message: item.message,
      metadata: item.metadata || {},
      is_read: false,
    }));

    const { error } = await supabase.from("notifications").insert(rows);
    if (error) {
      console.error("Failed to create bulk notifications:", error);
    }
  } catch (err) {
    console.error("Bulk notification creation error:", err);
  }
}

/**
 * Notify all admin and superadmin users.
 */
export async function notifyAdmins(
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  try {
    const supabase = createAdminClient();
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "superadmin"]);

    if (!admins || admins.length === 0) return;

    await createBulkNotifications(
      admins.map((admin) => ({
        user_id: admin.id,
        type,
        title,
        message,
        metadata,
      }))
    );
  } catch (err) {
    console.error("Notify admins error:", err);
  }
}

// ─── USER-FACING ACTIONS ─────────────────────────────────────────────────────

/**
 * Get paginated notifications for the current user.
 */
export async function getNotificationsAction(options?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  typeFilter?: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.unreadOnly) {
      query = query.eq("is_read", false);
    }

    if (options?.typeFilter && options.typeFilter !== "all") {
      // Filter by type category
      const typeMap: Record<string, NotificationType[]> = {
        orders: [
          "order_placed", "order_confirmed", "order_shipped",
          "order_delivered", "order_delivered_earnings",
          "order_cancelled", "order_refunded",
          "commission_held", "commission_released",
        ],
        wallet: [
          "wallet_recharge_requested", "wallet_recharge_approved", "wallet_recharge_rejected",
          "wallet_withdrawal_requested", "wallet_withdrawal_approved", "wallet_withdrawal_rejected",
          "wallet_admin_recharge", "wallet_locked", "wallet_unlocked",
        ],
        system: ["system_announcement", "low_stock_alert"],
        reviews: ["new_review"],
        upgrades: ["upgrade_requested", "upgrade_approved", "upgrade_rejected"],
        followers: ["new_follower"],
        applications: [
          "merchant_app_submitted", "merchant_app_approved", "merchant_app_rejected",
        ],
        account: [
          "account_deactivated", "account_activated", "role_changed",
        ],
      };
      const types = typeMap[options.typeFilter];
      if (types) {
        query = query.in("type", types);
      }
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      notifications: (data || []) as AppNotification[],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch notifications";
    return { error: message };
  }
}

/**
 * Get unread notification count for the current user.
 */
export async function getUnreadNotificationCountAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { count: 0 };

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) throw error;
    return { count: count || 0 };
  } catch {
    return { count: 0 };
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationReadAction(notificationId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to mark as read",
    };
  }
}

/**
 * Mark all notifications as read for current user.
 */
export async function markAllNotificationsReadAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to mark all as read",
    };
  }
}

/**
 * Delete a single notification.
 */
export async function deleteNotificationAction(notificationId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete notification",
    };
  }
}

/**
 * Delete all notifications for current user.
 */
export async function clearAllNotificationsAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to clear notifications",
    };
  }
}

/**
 * Send a system announcement to all users, specific roles, or individual users.
 * Admin/superadmin only.
 */
export async function sendAnnouncementAction(data: {
  title: string;
  message: string;
  targetType: "all" | "role" | "user";
  targetRole?: string;
  targetUserId?: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    // Verify admin role
    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "superadmin")) {
      return { error: "Unauthorized" };
    }

    let targetUsers: { id: string }[] = [];

    if (data.targetType === "all") {
      const { data: allUsers } = await adminSupabase
        .from("profiles")
        .select("id")
        .eq("is_active", true);
      targetUsers = allUsers || [];
    } else if (data.targetType === "role" && data.targetRole) {
      const { data: roleUsers } = await adminSupabase
        .from("profiles")
        .select("id")
        .eq("role", data.targetRole)
        .eq("is_active", true);
      targetUsers = roleUsers || [];
    } else if (data.targetType === "user" && data.targetUserId) {
      targetUsers = [{ id: data.targetUserId }];
    }

    if (targetUsers.length === 0) {
      return { error: "No target users found" };
    }

    await createBulkNotifications(
      targetUsers.map((u) => ({
        user_id: u.id,
        type: "system_announcement" as NotificationType,
        title: data.title,
        message: data.message,
        metadata: { sent_by: user.id },
      }))
    );

    return { success: true, count: targetUsers.length };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to send announcement",
    };
  }
}
