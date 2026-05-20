"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import ProductCard from "@/components/ProductCard";
import ProductFilter from "@/components/ProductFilter";
import SearchBar from "@/components/SearchBar";
import { ProductCardSkeleton } from "@/components/skeletons";
import {
  ChevronLeft,
  ChevronRight,
  PackageSearch,
  SlidersHorizontal,
  X,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Product, ProductFilters, Category } from "@/lib/types";

import { getProductsAction, getCategoriesAction } from "@/app/actions/products";
import { useRouter } from "@/i18n/navigation";

interface ProductsClientProps {
  initialCategories: Category[];
}

export default function ProductsClient({
  initialCategories,
}: ProductsClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo<ProductFilters>(() => {
    const categories =
      searchParams.get("category")?.split(",").filter(Boolean) || [];
    const ratings =
      searchParams
        .get("rating")
        ?.split(",")
        .map(Number)
        .filter((r) => !isNaN(r)) || [];

    return {
      search: searchParams.get("search") || "",
      category: categories.length > 0 ? categories : null,
      priceMin: searchParams.get("priceMin")
        ? Number(searchParams.get("priceMin"))
        : undefined,
      priceMax: searchParams.get("priceMax")
        ? Number(searchParams.get("priceMax"))
        : undefined,
      rating: ratings.length > 0 ? ratings : null,
      sortBy:
        (searchParams.get("sort") as ProductFilters["sortBy"]) || undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
    };
  }, [searchParams]);

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const { data: productsData, isLoading: isLoadingProducts } = useSWR(
    ["products", filters],
    () =>
      getProductsAction({
        ...filters,
        category: (filters.category as string[]) || undefined,
        rating: (filters.rating as number[]) || undefined,
        sortBy: filters.sortBy,
      }),
    { revalidateOnFocus: false },
  );

  const { data: categoriesData } = useSWR(
    "categories",
    () => getCategoriesAction(),
    {
      fallbackData: { categories: initialCategories },
      revalidateOnFocus: false,
    },
  );

  const handleFilterChange = useCallback(
    (newFilters: ProductFilters) => {
      const params = new URLSearchParams();

      Object.entries(newFilters).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          value !== "" &&
          (Array.isArray(value) ? value.length > 0 : true)
        ) {
          const paramKey = key === "sortBy" ? "sort" : key;
          const paramValue = Array.isArray(value)
            ? value.join(",")
            : String(value);
          params.append(paramKey, paramValue);
        }
      });

      const newSearch = params.toString();
      const currentSearch = window.location.search.replace(/^\?/, "");

      if (newSearch !== currentSearch) {
        router.push(`/products?${newSearch}`);
      }
    },
    [router],
  );

  const handleSearch = useCallback(
    (query: string) => {
      if (query === filters.search) return;
      handleFilterChange({
        ...filters,
        search: query,
        page: 1,
      });
    },
    [filters, handleFilterChange],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      handleFilterChange({
        ...filters,
        page: newPage,
      });
    },
    [filters, handleFilterChange],
  );

  const clearAllFilters = useCallback(() => {
    router.push("/products");
  }, [router]);

  return (
    <main className="min-h-screen bg-background py-10">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-3">
              {t("products.title")}
            </h1>
            <p className="text-muted-foreground font-medium">
              {t("products.subtitle")}
            </p>
          </div>
          <div className="w-full md:max-w-md">
            <SearchBar onSearch={handleSearch} initialValue={filters.search} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1 hidden lg:block">
            <ProductFilter
              categories={categoriesData?.categories || []}
              onFilterChange={handleFilterChange}
              currentFilters={filters}
            />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-8">
            {isLoadingProducts ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 mb-16">
                {[...Array(12)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : productsData?.products?.length === 0 ? (
              <div className="bg-card/50 border border-border rounded-3xl p-20 text-center space-y-6 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
                <div className="mx-auto w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center text-muted-foreground/40 mb-2 border border-border/50">
                  <PackageSearch size={48} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-foreground">
                    {t("products.noResults")}
                  </h3>
                  <p className="text-muted-foreground font-medium mt-2 max-w-sm mx-auto">
                    {t("messages.noResults")}
                  </p>
                </div>
                <button
                  onClick={clearAllFilters}
                  className="bg-primary text-primary-foreground px-10 py-3.5 rounded-full font-black shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <RotateCcw size={18} />
                  {t("filter.clearAll")}
                </button>
              </div>
            ) : (
              <>
                {/* Result Info Strip */}
                <div className="flex items-center justify-between px-2 bg-muted/30 py-3 rounded-2xl border border-border/40">
                  <p className="text-sm font-bold text-muted-foreground ml-3">
                    <span className="text-foreground">
                      {((filters.page || 1) - 1) * 12 + 1} -{" "}
                      {Math.min(
                        (filters.page || 1) * 12,
                        productsData?.total || 0,
                      )}
                    </span>{" "}
                    {t("products.of")}{" "}
                    <span className="text-foreground">
                      {productsData?.total || 0}
                    </span>{" "}
                    {t("products.items")}
                  </p>
                  <div className="lg:hidden pr-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsMobileFilterOpen(true)}
                      className="flex items-center gap-2 font-black bg-background shadow-md h-10 px-6 rounded-xl border-primary/30 text-primary hover:text-primary hover:bg-primary/5 transition-all active:scale-95"
                    >
                      <SlidersHorizontal size={14} />
                      {t("filter.title")}
                    </Button>
                  </div>
                </div>

                {/* Dense Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 mb-16">
                  {productsData?.products?.map((product: Product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      lowestPrice={product.lowestPrice}
                      originalPrice={product.originalPrice}
                      merchantCount={product.merchant_count}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {productsData && productsData.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-10 border-t border-border/60">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handlePageChange(Math.max(1, (filters.page || 1) - 1))
                      }
                      disabled={(filters.page || 1) === 1}
                      className="rounded-xl hover:bg-muted disabled:opacity-30 transition-all shadow-sm"
                      aria-label={t("pagination.previous")}
                    >
                      <ChevronLeft size={20} />
                    </Button>

                    <div className="flex items-center gap-2">
                      {Array.from({ length: productsData.totalPages }).map(
                        (_, idx) => {
                          const pageNum = idx + 1;
                          const isFirstPage = pageNum === 1;
                          const isLastPage =
                            pageNum === productsData.totalPages;
                          const isCurrentPage = (filters.page || 1) === pageNum;
                          const isNearCurrent =
                            Math.abs(pageNum - (filters.page || 1)) <= 1;

                          if (isFirstPage || isLastPage || isNearCurrent) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`w-11 h-11 rounded-xl font-black transition-all text-sm cursor-pointer ${
                                  isCurrentPage
                                    ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 scale-110 z-10"
                                    : "hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 bg-background"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }

                          if (
                            (pageNum === 2 && (filters.page || 1) > 3) ||
                            (pageNum === productsData.totalPages - 1 &&
                              (filters.page || 1) < productsData.totalPages - 2)
                          ) {
                            return (
                              <span
                                key={pageNum}
                                className="px-1 text-muted-foreground font-black opacity-50"
                              >
                                ···
                              </span>
                            );
                          }

                          return null;
                        },
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handlePageChange(
                          Math.min(
                            productsData.totalPages,
                            (filters.page || 1) + 1,
                          ),
                        )
                      }
                      disabled={(filters.page || 1) === productsData.totalPages}
                      className="rounded-xl hover:bg-muted disabled:opacity-30 transition-all shadow-sm"
                      aria-label={t("pagination.next")}
                    >
                      <ChevronRight size={20} />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Overlay */}
      <div
        className={`fixed inset-0 z-100 lg:hidden transition-all duration-500 ${
          isMobileFilterOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-background/90 backdrop-blur-md"
          onClick={() => setIsMobileFilterOpen(false)}
        />

        {/* Drawer */}
        <div
          className={`absolute left-0 right-0 bottom-0 bg-background border-t border-border rounded-t-[3rem] shadow-2xl px-6 pt-2 pb-[calc(5.5rem+env(safe-area-inset-bottom))] transition-transform duration-700 ease-out max-h-[92vh] overflow-hidden flex flex-col ${
            isMobileFilterOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto my-4 opacity-50" />

          <div className="flex items-center justify-between mb-6 px-1">
            <h2 className="text-2xl font-black text-foreground">
              {t("filter.title")}
            </h2>
            <button
              onClick={() => setIsMobileFilterOpen(false)}
              className="p-2.5 hover:bg-muted rounded-full transition-all active:scale-90"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-1 no-scrollbar">
            <ProductFilter
              categories={categoriesData?.categories || []}
              onFilterChange={handleFilterChange}
              currentFilters={filters}
            />
          </div>

          <div className="mt-6 pt-4 border-t border-border/60">
            <Button
              className="w-full font-black h-14 rounded-2xl text-lg shadow-xl shadow-primary/20 cursor-pointer hover:scale-[1.02] transition-all"
              onClick={() => setIsMobileFilterOpen(false)}
            >
              {t("common.viewResults")} ({productsData?.total || 0})
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
