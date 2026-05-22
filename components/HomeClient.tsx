"use client";

import { getActiveDealsAction } from "@/app/actions/deals";
import { getCategoriesAction, getProductsAction } from "@/app/actions/products";
import ProductCard from "@/components/ProductCard";
import { Link } from "@/i18n/navigation";
import { Category, Deal, Product } from "@/lib/types";
import { ArrowRight, ChevronRight, Flame, Sparkles, Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Autoplay, FreeMode, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import useSWR from "swr";

// Import Swiper styles
import "swiper/css";
import "swiper/css/autoplay";
import "swiper/css/free-mode";
import "swiper/css/pagination";
import Image from "next/image";
import DealsBanner from "./home/deals-banner";

interface HomeClientProps {
  initialNewProducts: {
    products: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  // initialTopRated: {
  //   products: Product[];
  //   total: number;
  //   page: number;
  //   limit: number;
  //   totalPages: number;
  // };
  initialDiscounted: {
    products: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  initialCategories: Category[];
  initialDeals: Deal[];
}

export function HomeClient({
  initialNewProducts,
  // initialTopRated,
  initialDiscounted,
  initialCategories,
  initialDeals,
}: HomeClientProps) {
  const t = useTranslations();
  const locale = useLocale();

  const { data: categoriesData } = useSWR(
    "categories",
    () => getCategoriesAction(),
    {
      revalidateOnFocus: false,
      fallbackData: { categories: initialCategories },
    },
  );

  const categories = categoriesData?.categories || [];

  const { data: dealsData } = useSWR(
    "active-deals",
    () => getActiveDealsAction(),
    {
      revalidateOnFocus: false,
      fallbackData: { deals: initialDeals },
    },
  );

  const activeDeals = dealsData?.deals || [];

  const { data: newProducts, isLoading: loadingNew } = useSWR(
    ["products-newest", { limit: 10, sortBy: "newest" }],
    () => getProductsAction({ limit: 10, sortBy: "newest" }),
    { revalidateOnFocus: false, fallbackData: initialNewProducts },
  );

  // const { data: topRatedProducts, isLoading: loadingTop } = useSWR(
  //   ["products-popular", { limit: 5, sortBy: "popular" }],
  //   () => getProductsAction({ limit: 5, sortBy: "popular" }),
  //   { revalidateOnFocus: false, fallbackData: initialTopRated },
  // );

  const { data: discountedProducts, isLoading: loadingDiscount } = useSWR(
    ["products-discount", { limit: 10, sortBy: "discount" }],
    () => getProductsAction({ limit: 10, sortBy: "discount" }),
    { revalidateOnFocus: false, fallbackData: initialDiscounted },
  );

  const renderSkeletons = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="rounded-md overflow-hidden border border-border/40"
        >
          <div className="aspect-square bg-muted animate-pulse" />
          <div className="p-2 space-y-2">
            <div className="h-3 bg-muted rounded animate-pulse" />
            <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* ── Category Strip (Horizontal Scroll) ── */}
      <div className="sticky top-0 z-20 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto relative py-1">
          {/* Left/Right scroll indicators (fades) */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-linear-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-background to-transparent z-10 pointer-events-none" />
          <Swiper
            modules={[FreeMode]}
            freeMode={true}
            grabCursor={true}
            spaceBetween={10}
            slidesPerView="auto"
          >
            <SwiperSlide className="w-auto!">
              <Link
                href="/products"
                className="w-fit shrink-0 flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/10 px-4 py-2 rounded-full whitespace-nowrap transition-all border border-transparent hover:border-primary/20"
              >
                <span className="text-sm leading-none">🏠</span>
                {t("home.categories.all")}
              </Link>
            </SwiperSlide>
            {categories.map((cat, i) => {
              return (
                <SwiperSlide key={i} className="w-auto!">
                  <Link
                    key={cat.id}
                    href={`/products?category=${cat.slug}`}
                    className="w-fit shrink-0 flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/10 px-4 py-2 rounded-full whitespace-nowrap transition-all border border-transparent hover:border-primary/20"
                  >
                    {/* <span className="text-sm leading-none">{cat.icon_url || "💡"}</span> */}
                    {cat.name}
                  </Link>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>
      </div>

      {/* ─── Flash Deals Banner ─── */}
      <DealsBanner initialDeals={initialDeals} />

      {/* ─── New Arrivals ─── */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-foreground">
                <Sparkles
                  size={20}
                  className="inline-block mr-2 text-primary"
                />
                {t("home.newArrivals")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("home.newArrivalsDesc")}
              </p>
            </div>
            <Link
              href="/products?sort=selling"
              className="text-sm text-primary font-semibold hidden md:flex items-center gap-1 hover:underline"
            >
              {t("home.viewAll")} <ChevronRight size={14} />
            </Link>
          </div>

          {loadingNew ? (
            renderSkeletons()
          ) : newProducts?.products?.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t("home.noProducts")}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {newProducts?.products?.map((product: Product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  lowestPrice={product.lowestPrice}
                  originalPrice={product.originalPrice}
                  merchantCount={product.merchant_count}
                />
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-center md:hidden">
            <Link
              href="/products?sort=newest"
              className="flex items-center gap-2 text-sm font-bold text-primary bg-primary/10 px-6 py-2.5 rounded-full hover:bg-primary/20 transition-all"
            >
              {t("home.viewAllNew")} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Top Rated ─── */}
      {/* <section className="py-8 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-foreground">
                <Star size={20} className="inline-block mr-2 text-primary" />
                {t("home.topRated")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("home.topRatedDesc")}
              </p>
            </div>
            <Link
              href="/products?sort=newest"
              className="text-sm text-primary font-semibold hidden md:flex items-center gap-1 hover:underline"
            >
              {t("home.viewAll")} <ChevronRight size={14} />
            </Link>
          </div>

          {loadingTop ? (
            renderSkeletons()
          ) : topRatedProducts?.products?.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t("home.noProducts")}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {topRatedProducts?.products?.map((product: Product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  lowestPrice={product.lowestPrice}
                  originalPrice={product.originalPrice}
                  merchantCount={product.merchant_count}
                />
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-center md:hidden">
            <Link
              href="/products?sort=popular"
              className="flex items-center gap-2 text-sm font-bold text-primary bg-primary/10 px-6 py-2.5 rounded-full hover:bg-primary/20 transition-all"
            >
              {t("home.viewAllTopRated")} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section> */}

      {/* ─── Biggest Discounts ─── */}
      <section className="py-8 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-foreground">
                <Flame size={20} className="inline-block mr-2 text-primary" />
                {t("home.biggestDiscounts")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("home.biggestDiscountsDesc")}
              </p>
            </div>
            <Link
              href="/products?sort=discount"
              className="text-sm text-primary font-semibold hidden md:flex items-center gap-1 hover:underline"
            >
              {t("home.viewAll")} <ChevronRight size={14} />
            </Link>
          </div>

          {loadingDiscount ? (
            renderSkeletons()
          ) : discountedProducts?.products?.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t("home.noProducts")}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {discountedProducts?.products?.map((product: Product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  lowestPrice={product.lowestPrice}
                  originalPrice={product.originalPrice}
                  merchantCount={product.merchant_count}
                />
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-center md:hidden">
            <Link
              href="/products?sort=discount"
              className="flex items-center gap-2 text-sm font-bold text-primary bg-primary/10 px-6 py-2.5 rounded-full hover:bg-primary/20 transition-all"
            >
              {t("home.viewAllDiscounts")} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA ─── */}
      <section className="py-12 border-t">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center text-center space-y-4">
          <p className="text-muted-foreground max-w-md">
            {t("home.notFoundDesc")}
          </p>
          <Link
            href="/products?sort=selling"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-10 py-4 rounded-full font-bold text-lg hover:scale-105 transition-all shadow-xl shadow-primary/20 mt-4"
          >
            {t("home.browseAllProducts")} <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </>
  );
}
