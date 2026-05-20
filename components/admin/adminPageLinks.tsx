"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { FreeMode } from "swiper/modules";
import { useTranslations } from "next-intl";
import { useUser } from "@/hooks/use-auth";

export default function PageLinks() {
  const pathname = usePathname();
  const cleanPath = pathname.replace(/^\/(en|ar)/, "");
  const t = useTranslations();
  const { user } = useUser();
  const isSuperAdmin = user?.role === "superadmin";

  const links = [
    { name: t("admin.dashboard"), href: "/admin/dashboard" },
    ...(isSuperAdmin
      ? [{ name: t("admin.admins") || "Admins", href: "/admin/admins" }]
      : []),
    { name: t("admin.users"), href: "/admin/users" },
    { name: t("admin.products"), href: "/admin/products" },
    { name: t("admin.merchants"), href: "/admin/merchants" },
    { name: t("admin.wallet"), href: "/admin/wallet" },
    { name: t("admin.deals"), href: "/admin/deals" },
    { name: t("admin.analytics"), href: "/admin/analytics" },
    {
      name: t("admin.applications") || "Applications",
      href: "/admin/applications",
    },
    // { name: t("admin.merchantPromotions") || "merchantPromotions", href: "/admin/promotions" },
    {
      name: t("admin.upgradeRequests") || "upgradeRequests",
      href: "/admin/upgrades",
    },
    { name: t("admin.language"), href: "/admin/language" },
    { name: t("admin.settings"), href: "/admin/settings" },
  ];

  return (
    <div className="mb-6">
      <Swiper
        modules={[FreeMode]}
        freeMode={true}
        grabCursor={true}
        spaceBetween={10}
        breakpoints={{
          320: { slidesPerView: 2.2 },
          640: { slidesPerView: 3.2 },
          768: { slidesPerView: 4.2 },
          1024: { slidesPerView: 6.2 },
        }}
      >
        {links.map((link, i) => {
          const active = cleanPath.startsWith(link.href);

          return (
            <SwiperSlide key={i}>
              <Link
                href={link.href}
                className={`cursor-pointer block rounded-xl p-3 text-center border transition
                  ${
                    active
                      ? "bg-primary text-white border-primary shadow-lg"
                      : "bg-card text-muted-foreground border-border hover:shadow-md"
                  }
                `}
              >
                <span className="text-sm font-bold">{link.name}</span>
              </Link>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
