"use client";

import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { getGlobalSearchResultsAction } from "@/app/actions/search";
import LoadingSpinner from "@/components/LoadingSpinner";
import ProductCard from "@/components/ProductCard";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Search, Store, LayoutGrid, ArrowRight } from "lucide-react";
import { Product } from "@/lib/types";
import { useTranslations } from "next-intl";

export default function SearchPage() {
  const t = useTranslations("search");
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const { data, isLoading } = useSWR(
    query ? ["global_search", query] : null,
    () => getGlobalSearchResultsAction(query),
  );

  if (!query) {
    return (
      <div className="max-w-7xl mx-auto py-24 px-4 text-center">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground/30">
          <Search size={48} />
        </div>
        <h1 className="text-3xl font-black mb-4">{t("noQuery")}</h1>
        <p className="text-muted-foreground font-medium mb-8">
          {t("noQueryDesc")}
        </p>
        <Link
          href="/"
          className="bg-primary text-white px-8 py-3 rounded-2xl font-bold hover:bg-primary/90 transition-all"
        >
          {t("goBackHome")}
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const results = data?.results;
  const hasResults =
    results &&
    (results.products.length > 0 ||
      results.categories.length > 0 ||
      results.merchants.length > 0);

  return (
    <main className="min-h-screen bg-gray-50/50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <header className="mb-12 space-y-2">
          <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-[0.2em]">
            <Search size={14} />
            {t("resultsTitle")}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
            {t("resultsFor")} &quot;<span className="text-primary">{query}</span>
            &quot;
          </h1>
        </header>

        {!hasResults ? (
          <div className="bg-white rounded-[3rem] p-24 text-center shadow-sm border border-gray-100">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground/30">
              <Search size={32} />
            </div>
            <h2 className="text-3xl font-black mb-4">{t("noMatches")}</h2>
            <p className="text-muted-foreground font-medium max-w-md mx-auto mb-10 text-lg leading-relaxed">
              {t("noMatchesDesc")}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/products"
                className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-xl shadow-primary/20"
              >
                {t("browseAllProducts")}
              </Link>
              <Link
                href="/merchants"
                className="bg-white border-2 border-gray-100 text-gray-900 px-8 py-4 rounded-2xl font-black text-lg hover:bg-gray-50 transition-all"
              >
                {t("viewAllMerchants")}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-20">
            {/* Categories Section */}
            {results.categories.length > 0 && (
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black flex items-center gap-3">
                    <div className="w-2 h-8 bg-primary rounded-full" />
                    {t("categories")}
                  </h2>
                  <span className="bg-muted px-4 py-1.5 rounded-full text-xs font-black text-muted-foreground uppercase tracking-widest">
                    {t("foundCount", { count: results.categories.length })}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {results.categories.map(
                    (cat: { id: string; slug: string; name: string }) => (
                      <Link
                        key={cat.id}
                        href={`/products?category=${cat.slug}`}
                        className="group bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all text-center"
                      >
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary group-hover:scale-110 transition-transform">
                          <LayoutGrid size={24} />
                        </div>
                        <p className="font-black text-gray-900 group-hover:text-primary transition-colors">
                          {cat.name}
                        </p>
                      </Link>
                    ),
                  )}
                </div>
              </section>
            )}

            {/* Merchants Section */}
            {results.merchants.length > 0 && (
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black flex items-center gap-3">
                    <div className="w-2 h-8 bg-orange-500 rounded-full" />
                    {t("merchants")}
                  </h2>
                  <span className="bg-muted px-4 py-1.5 rounded-full text-xs font-black text-muted-foreground uppercase tracking-widest">
                    {t("foundCount", { count: results.merchants.length })}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.merchants.map(
                    (merchant: {
                      id: string;
                      logo_url?: string | null;
                      business_name: string;
                      merchant_products?: { count: number }[];
                    }) => (
                      <Link
                        key={merchant.id}
                        href={`/merchants/${merchant.id}`}
                        className="group bg-white p-6 rounded-[2.5rem] border border-gray-100 hover:border-orange-500/20 hover:shadow-2xl hover:shadow-orange-500/5 transition-all flex items-center gap-6"
                      >
                        <div className="relative w-20 h-20 rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0 group-hover:scale-105 transition-transform">
                          {merchant.logo_url ? (
                            <Image
                              src={merchant.logo_url}
                              alt={merchant.business_name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Store size={32} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-gray-900 text-xl truncate group-hover:text-orange-500 transition-colors">
                            {merchant.business_name}
                          </h3>
                          <p className="text-muted-foreground text-sm font-medium flex items-center gap-2 mt-1">
                            <LayoutGrid
                              size={14}
                              className="text-orange-500/50"
                            />
                            {t("foundCount", { count: merchant.merchant_products?.[0]?.count || 0 })}{" "}
                            {t("products")}
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 group-hover:translate-x-1 transition-transform">
                          <ArrowRight size={20} />
                        </div>
                      </Link>
                    ),
                  )}
                </div>
              </section>
            )}

            {/* Products Section */}
            {results.products.length > 0 && (
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black flex items-center gap-3">
                    <div className="w-2 h-8 bg-primary rounded-full" />
                    {t("products")}
                  </h2>
                  <span className="bg-muted px-4 py-1.5 rounded-full text-xs font-black text-muted-foreground uppercase tracking-widest">
                    {t("foundCount", { count: results.products.length })}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {results.products.map(
                    (
                      product: Product & {
                        merchant_products?: {
                          selling_price: number;
                          merchant_id: string;
                          merchant_profiles: { business_name: string } | null;
                        }[];
                      },
                    ) => {
                      // Compute derived fields for ProductCard
                      const variants = product.merchant_products || [];
                      const merchantCount = variants.length;

                      // Find lowest price variant
                      const lowestPriceVariant =
                        variants.length > 0
                          ? [...variants].sort(
                              (a, b) => a.selling_price - b.selling_price,
                            )[0]
                          : null;

                      return (
                        <ProductCard
                          key={product.id}
                          product={product}
                          lowestPrice={
                            product.lowestPrice ||
                            lowestPriceVariant?.selling_price
                          }
                          originalPrice={product.originalPrice}
                          merchantCount={merchantCount}
                          merchantId={lowestPriceVariant?.merchant_id}
                          merchantName={
                            lowestPriceVariant?.merchant_profiles?.business_name
                          }
                        />
                      );
                    },
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
