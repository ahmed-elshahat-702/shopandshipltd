"use client";

import {
  getNotificationsAction,
  markAllNotificationsReadAction,
  clearAllNotificationsAction,
  deleteNotificationAction,
} from "@/app/actions/notifications";
import { NotificationItem } from "@/components/NotificationItem";
import { Button } from "@/components/ui/button";
import { AppNotification } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

interface NotificationsPageClientProps {
  role: "customer" | "merchant" | "admin";
}

const filtersByRole = {
  customer: ["all", "unread", "orders", "wallet", "account", "system"],
  merchant: ["all", "unread", "orders", "reviews", "wallet", "upgrades", "followers", "system"],
  admin: ["all", "unread", "applications", "orders", "wallet", "upgrades", "system"],
};

export function NotificationsPageClient({ role }: NotificationsPageClientProps) {
  const t = useTranslations("notifications");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearing, setClearing] = useState(false);

  const filters = filtersByRole[role];

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getNotificationsAction({
        page,
        limit: 15,
        unreadOnly: activeFilter === "unread",
        typeFilter: activeFilter === "unread" ? undefined : activeFilter,
      });
      if ("notifications" in result) {
        setNotifications(result.notifications ?? []);
        setTotalPages(result.totalPages ?? 1);
        setTotal(result.total ?? 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [page, activeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsReadAction();
      fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await clearAllNotificationsAction();
      setNotifications([]);
      setTotal(0);
    } finally {
      setClearing(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteNotificationAction(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setTotal((prev) => prev - 1);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total > 0
              ? `${total} ${t("notificationsCount")}`
              : t("noNotifications")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-bold rounded-xl"
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            {markingAll ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <CheckCheck className="h-3 w-3 mr-1" />
            )}
            {t("markAllRead")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-bold rounded-xl text-destructive hover:text-destructive"
            onClick={handleClearAll}
            disabled={clearing || total === 0}
          >
            {clearing ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Trash2 className="h-3 w-3 mr-1" />
            )}
            {t("clearAll")}
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => {
              setActiveFilter(filter);
              setPage(1);
            }}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
              activeFilter === filter
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
            )}
          >
            {t(`filters.${filter}`)}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-bold text-foreground">{t("noNotifications")}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("noNotificationsDesc")}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <div key={notification.id} className="relative group">
                <NotificationItem
                  notification={notification}
                  onRead={fetchNotifications}
                />
                <button
                  onClick={() => handleDelete(notification.id)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  title={t("delete")}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-bold text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
