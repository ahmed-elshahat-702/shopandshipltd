"use client";

import { useTranslations } from "next-intl";
import { ShoppingBag, Heart, Trash2, Plus, Check } from "lucide-react";
import {
  useFavoritesStore,
  FavoriteProduct,
} from "@/lib/store/useFavoritesStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { getMerchantStoreProductsAction } from "@/app/actions/merchant";
import { AddProductDialog } from "@/components/merchant/AddProductDialog";

interface FavoritesListProps {
  merchantId: string;
}

export function FavoritesList({ merchantId }: FavoritesListProps) {
  const t = useTranslations();
  const { favorites, removeFavorite } = useFavoritesStore();
  const [selectedProduct, setSelectedProduct] =
    useState<FavoriteProduct | null>(null);

  const { data: storeData } = useSWR(
    merchantId ? ["merchant_store", merchantId] : null,
    () => getMerchantStoreProductsAction(merchantId),
  );

  const storeProductIds = new Set(
    storeData?.products?.map((p: { product_id: string }) => p.product_id) || [],
  );

  const handleAddToStoreClick = (product: FavoriteProduct) => {
    setSelectedProduct(product);
  };

  if (favorites.length === 0) {
    return (
      <div className="text-center py-32 bg-card rounded-[3rem] border-2 border-dashed border-border flex flex-col items-center">
        <div className="w-28 h-28 bg-muted rounded-full flex items-center justify-center mb-8 text-muted-foreground/20">
          <Heart size={56} className="text-primary" />
        </div>
        <h2 className="text-3xl font-black text-foreground mb-2">
          {t("merchant.noFavoritesYet") || "No favorites yet"}
        </h2>
        <p className="text-muted-foreground font-medium text-lg max-w-sm mx-auto mb-10">
          {t("merchant.noFavoritesDesc") ||
            "Explore the catalogue and heart your favorite products to see them here."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
      {favorites.map((product) => {
        const inStore = storeProductIds.has(product.id);

        return (
          <div
            key={product.id}
            className="group bg-card rounded-[1.5rem] md:rounded-[2rem] border border-border overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col relative"
          >
            {/* Image */}
            <div className="aspect-4/5 bg-muted relative overflow-hidden">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                  <ShoppingBag size={48} />
                </div>
              )}

              {/* Delete Button */}
              <button
                onClick={() => {
                  removeFavorite(product.id);
                  toast.success(t("product.removeFromWishlist"));
                }}
                className="absolute top-3 right-3 w-8 h-8 md:w-9 md:h-9 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-rose-500 hover:text-white transition-all shadow-xl"
              >
                <Trash2 size={14} />
              </button>
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
                </div>

                <Button
                  size="icon"
                  variant={inStore ? "secondary" : "default"}
                  disabled={inStore}
                  onClick={() => handleAddToStoreClick(product)}
                  className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl transition-all active:scale-95",
                    !inStore &&
                      "bg-primary text-white shadow-xl shadow-primary/20 hover:scale-110",
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

      {selectedProduct && (
        <AddProductDialog
          merchantId={merchantId}
          product={{
            id: selectedProduct.id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            stock: selectedProduct.stock || 10,
          }}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
