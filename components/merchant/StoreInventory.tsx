"use client";

import { useTranslations } from "next-intl";
import useSWR, { mutate } from "swr";
import {
  ShoppingBag,
  Trash2,
  ExternalLink,
  Loader2,
  Package,
  LayoutGrid,
  List,
  Plus,
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  getMerchantStoreProductsAction,
  MerchantStoreProduct,
  removeProductFromStoreAction,
} from "@/app/actions/merchant";

interface StoreInventoryProps {
  merchantId: string;
}

interface PendingRemovalProduct {
  id: string;
  name: string;
}

export function StoreInventory({ merchantId }: StoreInventoryProps) {
  const t = useTranslations();

  const [isDeletingMap, setIsDeletingMap] = useState<Record<string, boolean>>(
    {},
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [pendingRemovalProduct, setPendingRemovalProduct] =
    useState<PendingRemovalProduct | null>(null);

  const { data, isLoading } = useSWR(
    merchantId ? ["merchant_store", merchantId] : null,
    () => getMerchantStoreProductsAction(merchantId),
  );

  const storeProducts: MerchantStoreProduct[] = data?.products || [];

  const handleRemoveFromStore = async () => {
    if (!pendingRemovalProduct) return;

    const { id: productId } = pendingRemovalProduct;

    setIsDeletingMap((prev) => ({ ...prev, [productId]: true }));
    try {
      const res = await removeProductFromStoreAction(merchantId, productId);
      if (res.error) throw new Error(res.error);

      toast.success(t("merchant.removedFromStore"));
      setPendingRemovalProduct(null);
      mutate(["merchant_store", merchantId]);
    } catch (error) {
      console.error(error);
      toast.error(t("messages.operationFailed"));
    } finally {
      setIsDeletingMap((prev) => ({ ...prev, [productId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  if (storeProducts.length === 0) {
    return (
      <div className="text-center py-24 bg-card rounded-[2.5rem] border-2 border-dashed border-border shadow-inner flex flex-col items-center">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6 text-muted-foreground/20">
          <ShoppingBag size={48} />
        </div>
        <h2 className="text-2xl font-black text-foreground mb-2">
          {t("merchant.noStoreProducts")}
        </h2>
        <p className="text-muted-foreground font-medium mb-8 max-w-sm mx-auto">
          {t("merchant.noStoreProductsDesc")}
        </p>
        <Link href="/merchant/products">
          <Button className="rounded-2xl h-12 px-8 font-black border-2 bg-primary text-primary-foreground hover:bg-primary/80 transition-all group">
            <Package className="mr-2 group-hover:animate-bounce" size={18} />
            {t("merchant.browseCatalogue")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AlertDialog
        open={!!pendingRemovalProduct}
        onOpenChange={(open) => {
          if (!open && pendingRemovalProduct) {
            const isDeleting = isDeletingMap[pendingRemovalProduct.id];
            if (!isDeleting) {
              setPendingRemovalProduct(null);
            }
          }
        }}
      >
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("merchant.confirmRemove")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemovalProduct
                ? `${t("merchant.removedFromStore")} "${pendingRemovalProduct.name}"?`
                : t("merchant.confirmRemove")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-xl"
              disabled={
                !!pendingRemovalProduct &&
                !!isDeletingMap[pendingRemovalProduct.id]
              }
            >
              {t("admin.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-500 text-white hover:bg-red-600"
              onClick={(event) => {
                event.preventDefault();
                handleRemoveFromStore();
              }}
              disabled={
                !!pendingRemovalProduct &&
                !!isDeletingMap[pendingRemovalProduct.id]
              }
            >
              {pendingRemovalProduct &&
              isDeletingMap[pendingRemovalProduct.id] ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  {t("common.loading")}
                </>
              ) : (
                t("merchant.removeProduct")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Modifiers */}
      <div className="flex items-center justify-between">
        <div className="flex bg-card border border-border rounded-xl p-1 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("grid")}
            className={cn(
              "rounded-lg h-9 w-9",
              viewMode === "grid" &&
                "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
            )}
          >
            <LayoutGrid size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("list")}
            className={cn(
              "rounded-lg h-9 w-9",
              viewMode === "list" &&
                "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
            )}
          >
            <List size={18} />
          </Button>
        </div>
        <Link href="/merchant/products">
          <Button
            variant="outline"
            className="rounded-xl h-11 px-6 font-black gap-2 border-2"
          >
            <Plus size={20} />
            {t("merchant.addProduct")}
          </Button>
        </Link>
      </div>

      <div
        className={cn(
          "grid gap-6",
          viewMode === "grid"
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "grid-cols-1",
        )}
      >
        {storeProducts.map((variant) => {
          const product = variant.products;
          if (!product) return null;
          const isDeleting = isDeletingMap[product.id];

          return (
            <div
              key={variant.id}
              className={cn(
                "group bg-card rounded-[2rem] border border-border overflow-hidden hover:shadow-2xl transition-all duration-500 shadow-sm",
                viewMode === "list"
                  ? "flex items-center p-4 gap-6"
                  : "flex flex-col",
              )}
            >
              {/* Image Container */}
              <div
                className={cn(
                  "bg-muted relative overflow-hidden shrink-0 transition-all",
                  viewMode === "grid"
                    ? "aspect-video w-full"
                    : "w-20 h-20 sm:w-24 sm:h-24 rounded-2xl",
                )}
              >
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                    <ShoppingBag size={viewMode === "grid" ? 48 : 24} />
                  </div>
                )}
                {viewMode === "grid" && (
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-[10px] font-black tracking-widest text-white uppercase border border-white/20">
                      {product.categories?.name || "LTD"}
                    </span>
                  </div>
                )}
              </div>

              {/* Info Content */}
              <div
                className={cn(
                  "flex-1 flex flex-col",
                  viewMode === "grid" ? "p-6" : "p-0 min-w-0",
                )}
              >
                <div className="flex items-start justify-between gap-4 mb-2 min-w-0">
                  <h3 className="font-black text-foreground text-lg sm:text-xl truncate group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                </div>

                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2 mb-4 sm:mb-6 font-medium leading-relaxed">
                  {product.description}
                </p>

                <div className="flex items-center justify-between mt-auto gap-4">
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-foreground leading-none">
                      ${variant.selling_price}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          product.stock > 0
                            ? "bg-green-500 shadow-sm shadow-green-500/50"
                            : "bg-red-500 shadow-sm shadow-red-500/50",
                        )}
                      />
                      <span className="text-[10px] text-muted-foreground font-black uppercase opacity-70">
                        {t("product.stock")}: {product.stock}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/products/${product.id}`} target="_blank">
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-xl h-10 w-10 border-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                      >
                        <ExternalLink size={18} />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setPendingRemovalProduct({
                          id: product.id,
                          name: product.name,
                        })
                      }
                      disabled={isDeleting}
                      className="rounded-xl h-10 w-10 text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                      {isDeleting ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <Trash2 size={20} />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
