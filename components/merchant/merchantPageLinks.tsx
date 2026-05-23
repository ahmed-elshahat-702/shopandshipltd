"use client";

import {
  BarChart3,
  Bell,
  Globe,
  Headset,
  Heart,
  LayoutDashboard,
  Lock,
  Package,
  Settings,
  ShoppingCart,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import "swiper/css";
import { FreeMode } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

export default function PageLinks() {
  const pathname = usePathname();
  const router = useRouter();
  const cleanPath = pathname.replace(/^\/(en|ar)/, "");

  const t = useTranslations();

  const links = [
    {
      name: t("merchant.dashboard"),
      href: "/merchant/dashboard",
      icon: LayoutDashboard,
    },
    { name: t("merchant.myStore"), href: "/merchant/my-store", icon: Store },
    { name: t("merchant.products"), href: "/merchant/products", icon: Package },
    { name: t("merchant.favorites"), href: "/merchant/favorites", icon: Heart },
    {
      name: t("merchant.orders"),
      href: "/merchant/orders",
      icon: ShoppingCart,
    },
    {
      name: t("merchant.messages"),
      href: "/merchant/messages",
      icon: ShoppingCart,
    },
    {
      name: t("merchant.notifications"),
      href: "/merchant/notifications",
      icon: Bell,
    },
    {
      name: t("merchant.analytics"),
      href: "/merchant/analytics",
      icon: BarChart3,
    },
    { name: t("merchant.security"), href: "/merchant/security", icon: Lock },
    { name: t("merchant.wallet"), href: "/merchant/wallet", icon: Wallet },
    { name: t("merchant.level"), href: "/merchant/levels", icon: TrendingUp },
    {
      name: t("merchant.customerService"),
      href: "/merchant/customer-service",
      icon: Headset,
    },
    { name: t("merchant.language"), href: "/merchant/language", icon: Globe },
    {
      name: t("merchant.settings"),
      href: "/merchant/settings",
      icon: Settings,
    },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t("merchant.quickLinks")}</h1>
      </div>
      <Swiper
        modules={[FreeMode]}
        freeMode={true}
        grabCursor={true}
        spaceBetween={10}
        breakpoints={{
          320: { slidesPerView: 2.2 },
          640: { slidesPerView: 3.2 },
          768: { slidesPerView: 4.2 },
          1024: { slidesPerView: 6 },
        }}
      >
        {links.map((link, i) => {
          const active = cleanPath.startsWith(link.href);

          return (
            <SwiperSlide key={i}>
              <div
                onClick={() => router.push(link.href)}
                className={`cursor-pointer block rounded-xl p-3 text-center border transition
                  ${
                    active
                      ? "bg-primary text-white border-primary shadow-lg"
                      : "bg-card text-muted-foreground border-border hover:shadow-md"
                  }
                `}
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  <link.icon className="w-4 h-4" />
                  {link.name}
                </span>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
