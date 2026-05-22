"use client";

import { AppNotification, NotificationType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { markNotificationReadAction } from "@/app/actions/notifications";
import {
  Bell,
  CheckCheck,
  DollarSign,
  Package,
  ShoppingCart,
  Star,
  TrendingUp,
  UserPlus,
  Shield,
  Megaphone,
  AlertTriangle,
  Lock,
  Unlock,
} from "lucide-react";

// Map notification type to icon, color, and link
const typeConfig: Record<
  string,
  { icon: React.ElementType; color: string; href?: (metadata: Record<string, unknown>) => string }
> = {
  order_placed: { icon: ShoppingCart, color: "text-blue-500", href: (m) => `/merchant/orders` },
  order_confirmed: { icon: CheckCheck, color: "text-green-500", href: (m) => `/customer/orders` },
  order_shipped: { icon: Package, color: "text-indigo-500", href: (m) => `/customer/orders` },
  order_delivered: { icon: Package, color: "text-green-600", href: (m) => `/customer/orders` },
  order_delivered_earnings: { icon: DollarSign, color: "text-green-600", href: () => `/merchant/wallet` },
  order_cancelled: { icon: ShoppingCart, color: "text-red-500", href: (m) => `/customer/orders` },
  order_refunded: { icon: DollarSign, color: "text-orange-500", href: () => `/customer/wallet` },
  wallet_recharge_requested: { icon: DollarSign, color: "text-blue-500", href: () => `/admin/wallet` },
  wallet_recharge_approved: { icon: DollarSign, color: "text-green-500", href: () => `/customer/wallet` },
  wallet_recharge_rejected: { icon: DollarSign, color: "text-red-500", href: () => `/customer/wallet` },
  wallet_withdrawal_requested: { icon: DollarSign, color: "text-blue-500", href: () => `/admin/wallet` },
  wallet_withdrawal_approved: { icon: DollarSign, color: "text-green-500", href: () => `/customer/wallet` },
  wallet_withdrawal_rejected: { icon: DollarSign, color: "text-red-500", href: () => `/customer/wallet` },
  wallet_admin_recharge: { icon: DollarSign, color: "text-green-600", href: () => `/customer/wallet` },
  wallet_locked: { icon: Lock, color: "text-red-500" },
  wallet_unlocked: { icon: Unlock, color: "text-green-500" },
  commission_held: { icon: DollarSign, color: "text-amber-500", href: () => `/merchant/wallet` },
  commission_released: { icon: DollarSign, color: "text-green-500", href: () => `/merchant/wallet` },
  merchant_app_submitted: { icon: Shield, color: "text-blue-500", href: () => `/admin/applications` },
  merchant_app_approved: { icon: Shield, color: "text-green-500", href: () => `/merchant/dashboard` },
  merchant_app_rejected: { icon: Shield, color: "text-red-500" },
  upgrade_requested: { icon: TrendingUp, color: "text-blue-500", href: () => `/admin/upgrades` },
  upgrade_approved: { icon: TrendingUp, color: "text-green-500", href: () => `/merchant/levels` },
  upgrade_rejected: { icon: TrendingUp, color: "text-red-500", href: () => `/merchant/levels` },
  new_review: { icon: Star, color: "text-yellow-500" },
  account_deactivated: { icon: Shield, color: "text-red-500" },
  account_activated: { icon: Shield, color: "text-green-500" },
  role_changed: { icon: Shield, color: "text-blue-500" },
  new_follower: { icon: UserPlus, color: "text-purple-500" },
  system_announcement: { icon: Megaphone, color: "text-primary" },
  low_stock_alert: { icon: AlertTriangle, color: "text-amber-500" },
};

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

interface NotificationItemProps {
  notification: AppNotification;
  onRead?: () => void;
  compact?: boolean;
}

export function NotificationItem({
  notification,
  onRead,
  compact = false,
}: NotificationItemProps) {
  const config = typeConfig[notification.type] || {
    icon: Bell,
    color: "text-muted-foreground",
  };
  const Icon = config.icon;
  const href = config.href
    ? config.href(notification.metadata)
    : undefined;

  const handleClick = async () => {
    if (!notification.is_read) {
      await markNotificationReadAction(notification.id);
      onRead?.();
    }
  };

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-all cursor-pointer group",
        !notification.is_read
          ? "bg-primary/5 hover:bg-primary/10"
          : "hover:bg-muted/50",
        compact && "px-3 py-2"
      )}
      onClick={handleClick}
    >
      {/* Icon */}
      <div
        className={cn(
          "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all",
          !notification.is_read
            ? "bg-primary/10"
            : "bg-muted",
          compact && "w-8 h-8 rounded-lg"
        )}
      >
        <Icon
          size={compact ? 14 : 16}
          className={cn(config.color, "transition-colors")}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-tight line-clamp-1",
              !notification.is_read ? "font-bold text-foreground" : "font-medium text-muted-foreground"
            )}
          >
            {notification.title}
          </p>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 font-medium">
            {getTimeAgo(notification.created_at)}
          </span>
        </div>
        <p
          className={cn(
            "text-xs mt-0.5 line-clamp-2",
            !notification.is_read
              ? "text-muted-foreground"
              : "text-muted-foreground/70"
          )}
        >
          {notification.message}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.is_read && (
        <div className="shrink-0 mt-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
