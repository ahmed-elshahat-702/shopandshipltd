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
import { useCartStore } from "@/lib/store/useCartStore";
import { useWishlistStore } from "@/lib/store/useWishlistStore";
import { AnimatePresence, motion } from "framer-motion"; // Add Framer Motion
import {
  ChevronRight,
  Headset,
  Heart,
  History,
  Home,
  LayoutGrid,
  Loader2,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Settings,
  ShoppingCart,
  Store,
  User,
  Wallet,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function MobileBottomNav() {
  const t = useTranslations();
  const cartCount = useCartStore((state) => state.getItemCount());
  const wishlistCount = useWishlistStore((state) => state.getItemCount());
  const unreadChatCount = useUnreadChatCount();
  const { user, loading } = useUser();
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
    { href: "/", icon: Home, label: t("nav.home") },
    { href: "/products", icon: LayoutGrid, label: t("nav.products") },
    {
      href: "/cart",
      icon: ShoppingCart,
      label: t("nav.cart"),
      badge: cartCount,
    },
    {
      href: "/wishlist",
      icon: Heart,
      label: t("wishlist.title"),
      badge: wishlistCount,
    },
    {
      href: "/customer/messages",
      icon: MessageCircle,
      label: t("chat.title"),
      badge: unreadChatCount,
      auth: true,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-1 relative">
        {mainLinks.map(({ href, icon: Icon, label, badge, auth }) => {
          if (auth && !user) return null;

          const isActive =
            pathname === href || (href !== "/" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-90 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {/* Active Indicator Background */}
              {isActive && (
                <motion.div
                  layoutId="bottomNav"
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
                <AnimatePresence>
                  {badge !== undefined && badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-black rounded-full min-w-4.5 h-4.5 flex items-center justify-center border-2 border-background"
                    >
                      {badge > 99 ? "9+" : badge}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <span className="text-[9px] font-bold tracking-tight uppercase">
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
                {t("nav.explore")}
              </SheetTitle>
            </SheetHeader>

            {/* Icon Grid */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                {
                  href: "/customer/account",
                  icon: User,
                  label: t("nav.account"),
                  auth: true,
                },
                {
                  href: "/customer/orders",
                  icon: ShoppingCart,
                  label: t("nav.orders"),
                  auth: true,
                },
                {
                  href: "/customer/wallet",
                  icon: Wallet,
                  label: t("customer.myWallet"),
                  auth: true,
                },
                {
                  href: "/merchants",
                  icon: Store,
                  label: t("nav.merchants"),
                },
                {
                  href: "/customer/search-history",
                  icon: History,
                  label: t("nav.searchHistory"),
                },
                {
                  href: "/support",
                  icon: Headset,
                  label: t("nav.customerService"),
                },
                {
                  href: "/customer/messages",
                  icon: MessageCircle,
                  label: t("chat.title"),
                  badge: unreadChatCount,
                  auth: true,
                },
                {
                  href: "/customer/settings",
                  icon: Settings,
                  label: t("nav.settings"),
                  auth: true,
                },
              ].map((item) => {
                if (item.auth && !user) return null;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="relative w-14 h-14 rounded-2xl bg-background border border-border flex items-center justify-center group-hover:bg-primary/5 transition-colors shadow-sm">
                      <item.icon
                        size={22}
                        className="text-foreground group-hover:text-primary transition-colors"
                      />
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-black rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center border-2 border-background">
                          {item.badge > 99 ? "9+" : item.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-center leading-tight text-muted-foreground">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Merchant / Auth Action Section */}
            <div className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-16 w-full bg-muted animate-pulse rounded-3xl" />
                  <div className="h-14 w-full bg-muted animate-pulse rounded-2xl" />
                </div>
              ) : user ? (
                <>
                  {user.role === "customer" ? (
                    <Link
                      href="/customer/apply"
                      className="flex items-center justify-between w-full p-5 rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    >
                      <div className="flex items-center gap-4">
                        <Zap size={20} fill="currentColor" />
                        <span className="font-black text-sm">
                          {t("nav.becomeMerchant")}
                        </span>
                      </div>
                      <ChevronRight size={18} className="opacity-50" />
                    </Link>
                  ) : user.role === "merchant" ||
                    user.role === "admin" ||
                    user.role === "superadmin" ? (
                    <Link
                      href={
                        user.role === "admin" || user.role === "superadmin"
                          ? "/admin/dashboard"
                          : "/merchant/dashboard"
                      }
                      className="flex items-center justify-between w-full p-5 rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    >
                      <div className="flex items-center gap-4">
                        <Zap size={20} fill="currentColor" />
                        <span className="font-black text-sm">
                          {t("nav.switchToMerchant")}
                        </span>
                      </div>
                      <LayoutGrid size={18} className="opacity-50" />
                    </Link>
                  ) : null}

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
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    asChild
                    className="h-14 rounded-2xl font-black bg-foreground text-background"
                  >
                    <Link
                      href={
                        pathname && pathname !== "/"
                          ? `/login?next=${encodeURIComponent(pathname)}`
                          : "/login"
                      }
                    >
                      {t("nav.signin")}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-14 rounded-2xl font-black border-2"
                  >
                    <Link
                      href={
                        pathname && pathname !== "/"
                          ? `/register?next=${encodeURIComponent(pathname)}`
                          : "/register"
                      }
                    >
                      {t("auth.signup")}
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
