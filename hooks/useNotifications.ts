"use client";

import { getUnreadNotificationCountAction } from "@/app/actions/notifications";
import { useUser } from "@/hooks/use-auth";
import { usePathname } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/client";
import { AppNotification } from "@/lib/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// Notification sound — short subtle chime using Web Audio API
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1); // C#6

    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.4);
  } catch {
    // Silently fail if audio is not available
  }
}

// Map notification type to an icon emoji for the toast
function getNotificationEmoji(type: string): string {
  const map: Record<string, string> = {
    order_placed: "🛒",
    order_confirmed: "✅",
    order_shipped: "🚚",
    order_delivered: "📦",
    order_delivered_earnings: "💰",
    order_cancelled: "❌",
    order_refunded: "💸",
    wallet_recharge_requested: "💳",
    wallet_recharge_approved: "✅",
    wallet_recharge_rejected: "❌",
    wallet_withdrawal_requested: "💳",
    wallet_withdrawal_approved: "✅",
    wallet_withdrawal_rejected: "❌",
    wallet_admin_recharge: "💰",
    wallet_locked: "🔒",
    wallet_unlocked: "🔓",
    commission_held: "⏳",
    commission_released: "💸",
    merchant_app_submitted: "📋",
    merchant_app_approved: "🎉",
    merchant_app_rejected: "❌",
    upgrade_requested: "⬆️",
    upgrade_approved: "🎉",
    upgrade_rejected: "❌",
    new_review: "⭐",
    account_deactivated: "🚫",
    account_activated: "✅",
    role_changed: "🔄",
    new_follower: "👤",
    system_announcement: "📢",
    low_stock_alert: "⚠️",
  };
  return map[type] || "🔔";
}

export function useNotifications() {
  const { user } = useUser();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [unreadCount, setUnreadCount] = useState(0);
  const initialFetched = useRef(false);

  const refresh = useCallback(async () => {
    await Promise.resolve();
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const result = await getUnreadNotificationCountAction();
    setUnreadCount(result.count ?? 0);
  }, [user]);

  // Fetch initial count
  useEffect(() => {
    if (!initialFetched.current) {
      initialFetched.current = true;
      const timer = window.setTimeout(() => refresh(), 0);
      return () => window.clearTimeout(timer);
    }
  }, [refresh]);

  // Re-fetch on path change
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as AppNotification;

          // Update count
          setUnreadCount((prev) => prev + 1);

          // Play sound
          playNotificationSound();

          // Show toast
          const emoji = getNotificationEmoji(notification.type);
          toast(`${emoji} ${notification.title}`, {
            description: notification.message,
            duration: 5000,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh count when notifications are marked as read
          refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, supabase, user]);

  return {
    unreadCount,
    refresh,
  };
}
