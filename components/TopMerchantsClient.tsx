"use client";

import { useUser } from "@/hooks/use-auth";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, ChevronRight, Package, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

interface Merchant {
  id: string;
  business_name: string;
  store_slug: string;
  logo_url: string | null;
  // rating: number;
  followers: number | null;
  total_sales: number | null;
  is_verified: boolean;
  merchant_products: { count: number }[];
}

export function TopMerchantsClient({ merchants }: { merchants: Merchant[] }) {
  const t = useTranslations();
  const { user } = useUser();

  if (merchants.length === 0) {
    return (
      <section className="py-12 border-t border-border/40 bg-muted/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
                <Store className="text-primary" size={24} />
                {t("home.topMerchants")}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm font-medium">
                {t("home.topMerchantsDesc")}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
            <Store size={48} className="opacity-20" />
            <p className="text-sm font-medium">{t("home.noMerchants")}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 border-t border-border/40 bg-muted/10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Store className="text-primary" size={24} />
              {t("home.topMerchants")}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm font-medium">
              {t("home.topMerchantsDesc")}
            </p>
          </div>
          <Link
            href="/merchants"
            className="text-sm text-primary font-bold hidden md:flex items-center gap-1 hover:underline transition-all"
          >
            {t("common.viewAll")} <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {merchants.map((merchant) => {
            const productCount = merchant.merchant_products?.[0]?.count ?? 0;

            return (
              <Link
                key={merchant.id}
                href={
                  user?.role === "merchant" && user.merchantId === merchant.id
                    ? "/merchant/dashboard"
                    : `/merchants/${merchant.id}`
                }
                className="group relative bg-card border border-border rounded-2xl p-5 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border/50 shrink-0 group-hover:scale-105 transition-transform duration-500 bg-muted flex items-center justify-center">
                    {merchant.logo_url ? (
                      <Image
                        src={merchant.logo_url}
                        alt={merchant.business_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Store size={28} className="text-muted-foreground/40" />
                    )}
                  </div>

                  <div className="space-y-1 mt-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-foreground group-hover:text-primary transition-colors truncate">
                        {merchant.business_name}
                      </h3>
                      {merchant.is_verified && (
                        <CheckCircle2
                          size={14}
                          className="text-blue-500 shrink-0"
                          fill="currentColor"
                        />
                      )}
                    </div>
                    {/* <div className="flex items-center gap-1">
                      <Star
                        size={12}
                        className="fill-yellow-400 text-yellow-400 shrink-0"
                      />
                      <span className="text-xs font-bold text-foreground">
                        {Number(merchant.rating).toFixed(1)}
                      </span>
                    </div> */}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground text-center">
                    <div className="text-sm font-black text-foreground flex items-center gap-1 justify-center">
                      <Package size={12} />
                      {productCount}
                    </div>
                    {t("common.products")}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground text-center">
                    <div className="text-sm font-black text-foreground">
                      {merchant.followers ?? 0}
                    </div>
                    {t("common.followers")}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground text-center">
                    <div className="text-sm font-black text-foreground">
                      ${Number(merchant.total_sales ?? 0).toLocaleString()}
                    </div>
                    {t("common.sales")}
                  </div>
                </div>

                <div className="mt-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex justify-center">
                  <span className="text-primary text-[11px] font-black uppercase tracking-widest">
                    {t("common.visitStore")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
