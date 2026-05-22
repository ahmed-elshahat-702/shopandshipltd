"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { getNotificationsAction, markAllNotificationsReadAction } from "@/app/actions/notifications";
import { NotificationItem } from "@/components/NotificationItem";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "@/i18n/navigation";
import { AppNotification } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, Loader2, Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useUser } from "@/hooks/use-auth";

export function NotificationBell() {
  const t = useTranslations("notifications");
  const { user } = useUser();
  const { unreadCount, refresh } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await getNotificationsAction({ limit: 8 });
      if ("notifications" in result) {
        setNotifications(result.notifications ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsReadAction();
      refresh();
      fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationRead = () => {
    refresh();
    fetchNotifications();
  };

  // Determine notification link path based on user role
  const notificationsPath = user?.role === "admin" || user?.role === "superadmin"
    ? "/admin/notifications"
    : user?.role === "merchant"
      ? "/merchant/notifications"
      : "/customer/notifications";

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t("title")}
        >
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center"
              >
                {unreadCount > 99 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-95 p-0 rounded-2xl shadow-2xl border-2 overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <h3 className="font-bold text-sm">{t("title")}</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-bold text-primary hover:text-primary"
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
            )}
          </div>
        </div>

        {/* Notification List */}
        <div className="max-h-100 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <Inbox className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                {t("noNotifications")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleNotificationRead}
                  compact
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2.5 bg-muted/30">
            <Link
              href={notificationsPath}
              className="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1"
              onClick={() => setIsOpen(false)}
            >
              {t("viewAll")}
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
