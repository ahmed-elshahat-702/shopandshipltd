"use client";

import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { useUnreadChatCount } from "@/hooks/useUnreadChatCount";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useUser } from "@/hooks/use-auth";
import { Link, usePathname } from "@/i18n/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  Globe,
  Headset,
  Heart,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function MerchantMobileBottomNav() {
  const t = useTranslations();
  const { user, loading } = useUser();
  const unreadChatCount = useUnreadChatCount();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close sheet on navigation without useEffect to satisfy the linter
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  const handleLogout = async () => {
    await logoutAction();
  };

  const mainLinks = [
    {
      href: "/merchant/dashboard",
      icon: LayoutDashboard,
      label: t("merchant.dashboard"),
    },
    {
      href: "/merchant/orders",
      icon: ShoppingCart,
      label: t("merchant.orders"),
    },
    {
      href: "/merchant/products",
      icon: ShoppingBag,
      label: t("merchant.products"),
    },
    {
      href: "/merchant/messages",
      icon: MessageSquare,
      label: t("merchant.messages") || "Messages",
      badge: unreadChatCount,
    },
    { href: "/merchant/wallet", icon: Wallet, label: t("merchant.wallet") },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-1 relative">
        {mainLinks.map(({ href, icon: Icon, label, badge }) => {
          const isActive =
            pathname === href ||
            (href !== "/merchant/dashboard" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-90 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="merchantBottomNav"
                  className="absolute inset-x-2 inset-y-2 bg-primary/10 rounded-2xl -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}

              <div className="relative mb-0.5">
                <Icon
                  size={20}
                  className={isActive ? "fill-primary/20" : ""}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-black rounded-full min-w-4.5 h-4.5 px-1 flex items-center justify-center border-2 border-background">
                    {badge > 99 ? "9+" : badge}
                  </span>
                )}
              </div>

              <span className="text-[9px] font-bold tracking-tight uppercase truncate max-w-15">
                {label}
              </span>
            </Link>
          );
        })}

        {/* More Menu Trigger */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground active:scale-90 transition-transform">
              <MoreHorizontal size={20} />
              <span className="text-[9px] font-bold tracking-tight uppercase">
                {t("nav.more")}
              </span>
            </button>
          </SheetTrigger>

          <SheetContent
            side="bottom"
            className="rounded-t-[2.5rem] border-t-0 bg-muted/30 backdrop-blur-2xl p-6"
          >
            <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto mb-6" />

            <SheetHeader className="mb-6">
              <SheetTitle className="text-left text-2xl font-black px-2">
                {t("merchant.myStore")}
              </SheetTitle>
            </SheetHeader>

            {/* Icon Grid */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                {
                  href: "/merchant/my-store",
                  icon: Store,
                  label: t("merchant.myStore"),
                },
                {
                  href: "/merchant/analytics",
                  icon: BarChart3,
                  label: t("merchant.analytics"),
                },
                {
                  href: "/merchant/levels",
                  icon: TrendingUp,
                  label: t("merchant.level"),
                },
                {
                  href: "/merchant/favorites",
                  icon: Heart,
                  label: t("merchant.favorites"),
                },
                {
                  href: "/merchant/customer-service",
                  icon: Headset,
                  label: t("merchant.customerService"),
                },
                {
                  href: "/merchant/security",
                  icon: Lock,
                  label: t("merchant.security"),
                },
                {
                  href: "/merchant/language",
                  icon: Globe,
                  label: t("merchant.language"),
                },
                {
                  href: "/merchant/settings",
                  icon: Settings,
                  label: t("merchant.settings"),
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-background border border-border flex items-center justify-center group-hover:bg-primary/5 transition-colors shadow-sm">
                    <item.icon
                      size={22}
                      className="text-foreground group-hover:text-primary transition-colors"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-center leading-tight text-muted-foreground">
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>

            {/* Merchant Info / Action Section */}
            <div className="space-y-3">
              <div className="p-4 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black">
                    {user?.fullName?.[0] || "M"}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black">{user?.fullName}</span>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                      {t("common.merchant")}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                onClick={handleLogout}
                disabled={loading}
                className="w-full h-14 rounded-2xl font-black text-destructive hover:bg-destructive/10"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogOut size={18} className="mr-2" />
                )}
                {t("common.logout")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
