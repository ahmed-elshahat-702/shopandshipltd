"use client";

import { getAdminProductsAction } from "@/app/actions/admin";
import { getMerchantStoreProductsAction } from "@/app/actions/merchant";
import { getCategoriesAction } from "@/app/actions/products";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AddProductDialog } from "@/components/merchant/AddProductDialog";
import { CategoryFilters } from "@/components/merchant/CategoryFilters";
import { SearchInput } from "@/components/merchant/SearchInput";
import { Button } from "@/components/ui/button";
import {
  FavoriteProduct,
  useFavoritesStore,
} from "@/lib/store/useFavoritesStore";
import { cn } from "@/lib/utils";
import { Check, Heart, Plus, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  image_url?: string;
  categories?: { name: string };
}

interface CatalogueListProps {
  merchantId: string;
}

export function CatalogueList({ merchantId }: CatalogueListProps) {
  const t = useTranslations();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: catalogueData, isLoading: isLoadingCatalogue } = useSWR(
    ["admin_products", debouncedSearch, category],
    () =>
      getAdminProductsAction({
        search: debouncedSearch,
        category: category !== "all" ? category : undefined,
        limit: 50,
      }),
  );

  const { data: storeData } = useSWR(
    merchantId ? ["merchant_store", merchantId] : null,
    () => getMerchantStoreProductsAction(merchantId),
  );

  const { data: categoriesData } = useSWR("products_categories", () =>
    getCategoriesAction(),
  );

  const catalogueProducts: Product[] = (
    catalogueData && "products" in catalogueData ? catalogueData.products : []
  ) as Product[];
  const storeProductIds = new Set(
    storeData?.products?.map((p: { product_id: string }) => p.product_id) || [],
  );

  const handleAddToStoreClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleToggleFavorite = (product: Product) => {
    const fav: FavoriteProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      image_url: product.image_url,
      categories: product.categories,
    };
    if (isFavorite(product.id)) {
      removeFavorite(product.id);
      toast.success(
        t("product.removeFromWishlist") || "Removed from favorites",
      );
    } else {
      addFavorite(fav);
      toast.success(t("product.addToWishlist") || "Added to favorites");
    }
  };

  return (
    <div className="space-y-6 md:space-y-10">
      {/* Search & Filter */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl -mx-4 px-4 py-4 border-b border-border/50 lg:static lg:bg-transparent lg:border-none lg:p-0">
        <div className="flex flex-col gap-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t("merchant.searchProducts")}
          />
          <CategoryFilters
            categories={categoriesData?.categories || []}
            selectedCategory={category}
            onCategoryChange={setCategory}
          />
        </div>
      </div>

      {/* Catalogue Grid */}
      {isLoadingCatalogue ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : catalogueProducts.length === 0 ? (
        <div className="text-center py-24 bg-card rounded-[2.5rem] border-2 border-dashed border-border shadow-inner">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground/30">
            <ShoppingBag size={48} />
          </div>
          <p className="text-muted-foreground font-black text-2xl mb-2">
            {t("merchant.noResults")}
          </p>
          <p className="text-muted-foreground opacity-70">
            {t("merchant.tryAnotherSearch")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
          {catalogueProducts.map((product: Product) => {
            const inStore = storeProductIds.has(product.id);
            const favorited = isFavorite(product.id);

            return (
              <div
                key={product.id}
                className="group bg-card rounded-[1.5rem] md:rounded-[2rem] border border-border overflow-hidden hover:shadow-2xl hover:-translate-y-1 md:hover:-translate-y-2 transition-all duration-500 flex flex-col relative"
              >
                {/* Image */}
                <div className="aspect-4/5 bg-muted relative overflow-hidden">
                  {product.image_url ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                      <ShoppingBag size={48} />
                    </div>
                  )}

                  {/* Category Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-[10px] font-black tracking-widest text-white uppercase border border-white/20">
                      {product.categories?.name || "LTD"}
                    </span>
                  </div>

                  {/* Favorite Button */}
                  <button
                    onClick={() => handleToggleFavorite(product)}
                    className={cn(
                      "absolute top-3 right-3 w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110 z-50",
                      favorited
                        ? "bg-rose-500 text-white"
                        : "bg-black/30 backdrop-blur-sm text-white hover:bg-rose-500",
                    )}
                  >
                    <Heart
                      size={14}
                      className={favorited ? "fill-white" : ""}
                      strokeWidth={favorited ? 0 : 2}
                    />
                  </button>

                  {/* In store check */}
                  {inStore && (
                    <div className="absolute bottom-3 left-3 bg-green-500 text-white px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shadow-lg shadow-green-500/30">
                      <Check size={10} strokeWidth={4} />
                      {t("merchant.alreadyInStore")}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>

                {/* Content */}
                <div className="p-3 md:p-5 flex-1 flex flex-col">
                  <h3 className="font-black text-foreground text-sm md:text-lg line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-2 mb-4 font-medium leading-relaxed flex-1">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between mt-auto gap-2">
                    <div>
                      <span className="block text-lg md:text-2xl font-black text-foreground leading-none">
                        ${product.price}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-black uppercase opacity-60">
                        {t("product.stock")}: {product.stock}
                      </span>
                    </div>

                    <Button
                      size="icon"
                      variant={inStore ? "secondary" : "default"}
                      disabled={inStore}
                      onClick={() => handleAddToStoreClick(product)}
                      className={cn(
                        "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl shadow-none transition-all duration-300 shrink-0",
                        !inStore &&
                          "bg-primary text-primary-foreground shadow-primary/30 hover:scale-110 active:scale-95",
                      )}
                    >
                      {inStore ? (
                        <Check size={20} strokeWidth={3} />
                      ) : (
                        <Plus size={20} strokeWidth={3} />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <AddProductDialog
        merchantId={merchantId}
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
