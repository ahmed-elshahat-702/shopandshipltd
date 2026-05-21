"use client";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-auth";
import { useUnreadChatCount } from "@/hooks/useUnreadChatCount";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Globe,
  Headset,
  Heart,
  IdCard,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  TrendingUp,
  Users,
  Users2,
  Wallet,
  Zap,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

interface SidebarProps {
  role: "customer" | "merchant" | "admin" | "superadmin";
  user?: {
    fullName?: string;
    profileImageUrl?: string;
    merchantLogoUrl?: string | null;
    merchantBusinessName?: string | null;
  };
  isMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  role,
  user,
  isMobile = false,
  onClose,
}: SidebarProps) {
  const t = useTranslations();
  const locale = useLocale();
  const { loading: authLoading } = useUser();
  const unreadChatCount = useUnreadChatCount();
  const isRtl = locale === "ar";
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname.startsWith(href)) return true;
    return false;
  };

  const handleLogout = async () => {
    await logoutAction();
  };

  const menuItems = {
    merchant: [
      {
        label: t("merchant.dashboard") || "Dashboard",
        icon: LayoutDashboard,
        href: "/merchant/dashboard",
      },
      {
        label: t("merchant.myStore") || "My Store",
        icon: Store,
        href: "/merchant/my-store",
      },
      {
        label: t("merchant.products") || "Products",
        icon: ShoppingBag,
        href: "/merchant/products",
      },
      {
        label: t("merchant.favorites") || "Favorites",
        icon: Heart,
        href: "/merchant/favorites",
      },
      {
        label: t("merchant.orders") || "Orders",
        icon: ShoppingCart,
        href: "/merchant/orders",
      },
      {
        label: t("merchant.analytics") || "Analytics",
        icon: BarChart3,
        href: "/merchant/analytics",
      },
      {
        label: t("merchant.wallet") || "Wallet",
        icon: Wallet,
        href: "/merchant/wallet",
      },
      {
        label: t("merchant.level") || "Merchant Level",
        icon: TrendingUp,
        href: "/merchant/levels",
      },
      {
        label: t("merchant.messages") || "Messages",
        icon: MessageSquare,
        href: "/merchant/messages",
        badge: unreadChatCount,
      },
      {
        label: t("merchant.customerService") || "Customer Service",
        icon: Headset,
        href: "/merchant/customer-service",
      },
      {
        label: t("merchant.security") || "Security",
        icon: Lock,
        href: "/merchant/security",
      },
      {
        label: t("merchant.language") || "Language",
        icon: Globe,
        href: "/merchant/language",
      },
      {
        label: t("merchant.settings") || "Settings",
        icon: Settings,
        href: "/merchant/settings",
      },
    ],
    admin: [
      {
        label: t("admin.dashboard") || "Dashboard",
        icon: LayoutDashboard,
        href: "/admin/dashboard",
      },
      { label: t("admin.users") || "Users", icon: Users, href: "/admin/users" },
      {
        label: t("admin.products") || "Products",
        icon: ShoppingBag,
        href: "/admin/products",
      },
      {
        label: t("admin.merchants") || "Merchants",
        icon: Users2,
        href: "/admin/merchants",
      },
      {
        label: t("admin.wallet") || "Wallet",
        icon: Wallet,
        href: "/admin/wallet",
      },
      {
        href: "/admin/orders",
        icon: ShoppingCart,
        label: t("admin.orders"),
      },
      {
        label: t("admin.deals") || "Deals",
        icon: Zap,
        href: "/admin/deals",
      },
      {
        label: t("admin.analytics") || "Analytics",
        icon: BarChart3,
        href: "/admin/analytics",
      },
      {
        label: t("admin.application") || "Merchant Applications",
        icon: IdCard,
        href: "/admin/applications",
      },
      // {
      //   label: t("admin.merchantPromotions") || "Merchant Promotions",
      //   icon: Star,
      //   href: "/admin/promotions",
      // },
      {
        label: t("admin.upgradeRequests") || "Upgrade Requests",
        icon: TrendingUp,
        href: "/admin/upgrades",
      },
      {
        label: t("admin.language") || "Language",
        icon: Globe,
        href: "/admin/language",
      },
      {
        label: t("admin.settings") || "Settings",
        icon: Settings,
        href: "/admin/settings",
      },
    ],
    superadmin: [
      {
        label: t("admin.dashboard") || "Dashboard",
        icon: LayoutDashboard,
        href: "/admin/dashboard",
      },
      {
        label: t("admin.admins") || "Admins",
        icon: ShieldCheck,
        href: "/admin/admins",
      },
      { label: t("admin.users") || "Users", icon: Users, href: "/admin/users" },
      {
        label: t("admin.products") || "Products",
        icon: ShoppingBag,
        href: "/admin/products",
      },
      {
        label: t("admin.merchants") || "Merchants",
        icon: Users2,
        href: "/admin/merchants",
      },
      {
        label: t("admin.wallet") || "Wallet",
        icon: Wallet,
        href: "/admin/wallet",
      },
      {
        href: "/admin/orders",
        icon: ShoppingCart,
        label: t("admin.orders"),
      },
      {
        label: t("admin.deals") || "Deals",
        icon: Zap,
        href: "/admin/deals",
      },
      {
        label: t("admin.analytics") || "Analytics",
        icon: BarChart3,
        href: "/admin/analytics",
      },
      {
        label: t("admin.application") || "Merchant Applications",
        icon: IdCard,
        href: "/admin/applications",
      },
      // {
      //   label: t("admin.merchantPromotions") || "Merchant Promotions",
      //   icon: Star,
      //   href: "/admin/promotions",
      // },
      {
        label: t("admin.upgradeRequests") || "Upgrade Requests",
        icon: TrendingUp,
        href: "/admin/upgrades",
      },
      {
        label: t("admin.language") || "Language",
        icon: Globe,
        href: "/admin/language",
      },
      {
        label: t("admin.settings") || "Settings",
        icon: Settings,
        href: "/admin/settings",
      },
    ],
    customer: [],
  };

  const items = menuItems[role];

  const collapsed = !isOpen && !isMobile;

  return (
    <aside
      className={`
        border-r border-border bg-card transition-all duration-300 ease-in-out relative flex flex-col shrink-0 shadow-sm
        ${isMobile ? "w-full h-full" : isOpen ? "w-64" : "w-20"}
        h-full
      `}
    >
      <div className="flex flex-col h-full overflow-visible overflow-x-hidden">
        {/* Collapse Toggle — Desktop only */}
        {!isMobile && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "absolute top-8 h-7 w-7 rounded-full border-2 border-border bg-card shadow-lg z-50 hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 flex items-center justify-center p-0",
              isRtl ? "-left-3.5" : "-right-3.5",
            )}
          >
            {isOpen ? (
              isRtl ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )
            ) : isRtl ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Sidebar Header / Logo */}
        <div
          className={cn(
            "h-fit py-2 flex items-center px-6 transition-all",
            collapsed ? "justify-center px-0" : "justify-between",
          )}
        >
          {!collapsed ? (
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                {role === "merchant" ? (
                  user?.merchantLogoUrl ? (
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-xl group-hover:scale-110 group-hover:border-primary/40 transition-all duration-500 relative">
                      <Image
                        src={user.merchantLogoUrl}
                        alt="Merchant Logo"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-black shadow-xl shadow-primary/20 group-hover:scale-110 transition-all duration-500 text-lg">
                      {user?.merchantBusinessName?.[0]?.toUpperCase() || "M"}
                    </div>
                  )
                ) : user?.profileImageUrl ? (
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-xl group-hover:scale-110 group-hover:border-primary/40 transition-all duration-500 relative">
                    <Image
                      src={user.profileImageUrl}
                      alt="Store Logo"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-black shadow-xl shadow-primary/20 group-hover:scale-110 transition-all duration-500">
                    <Store size={26} />
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black text-foreground tracking-tighter leading-tight truncate">
                  {role === "merchant" ? (user?.merchantBusinessName || user?.fullName || "My Store") : "Shop & Ship LTD"}
                </span>
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                  {role}
                </span>
              </div>
            </Link>
          ) : (
            <div className="w-14 h-14 bg-primary/5 rounded-[1.25rem] flex items-center justify-center text-primary border-2 border-primary/10 relative hover:border-primary/30 transition-colors group">
              {role === "merchant" ? (
                user?.merchantLogoUrl ? (
                  <Image
                    src={user.merchantLogoUrl}
                    alt="Merchant Logo"
                    fill
                    className="rounded-[1.25rem] object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <span className="text-lg font-black group-hover:scale-110 transition-transform duration-500">
                    {user?.merchantBusinessName?.[0]?.toUpperCase() || "M"}
                  </span>
                )
              ) : user?.profileImageUrl ? (
                <Image
                  src={user.profileImageUrl}
                  alt="Logo"
                  fill
                  className="rounded-[1.25rem] object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <Store
                  size={28}
                  className="group-hover:scale-110 transition-transform duration-500"
                />
              )}
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {items.map((item) => {
            const active = isActive(item.href);
            const badge = "badge" in item ? (item.badge ?? 0) : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (isMobile && onClose) onClose();
                }}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                  ${
                    active
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  }
                  ${collapsed ? "justify-center" : ""}
                `}
                title={collapsed ? item.label : undefined}
              >
                <span className="relative shrink-0">
                  <item.icon
                    className={`h-5 w-5 transition-colors ${active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"}`}
                  />
                  {collapsed && badge > 0 && (
                    <span
                      className={cn(
                        "absolute -top-2 -right-2 bg-primary text-primary-foreground text-[9px] font-black rounded-full min-w-4 h-4 px-1 flex items-center justify-center border border-card",
                        active && "bg-primary-foreground text-primary",
                      )}
                    >
                      {badge > 99 ? "9+" : badge}
                    </span>
                  )}
                </span>
                {!collapsed && (
                  <>
                    <span className="truncate flex-1">{item.label}</span>
                    {badge > 0 && (
                      <span
                        className={cn(
                          "ml-auto bg-primary text-primary-foreground text-[10px] font-black rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center",
                          active && "bg-primary-foreground text-primary",
                        )}
                      >
                        {badge > 99 ? "9+" : badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-border mt-auto shrink-0">
          <button
            onClick={handleLogout}
            disabled={authLoading}
            className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? t("common.logout") : undefined}
          >
            {authLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5 shrink-0" />
            )}
            {!collapsed && <span>{t("common.logout")}</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
