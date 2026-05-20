"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useCartStore } from "@/lib/store/useCartStore";
import {
  Check,
  Info,
  Loader2,
  Lock,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type { FC, SVGProps } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useUser } from "@/hooks/use-auth";
import { MerchantVariant, ProductVariant } from "@/lib/types";

interface ProductVariantsProps {
  productId: string;
  productName: string;
  variants: MerchantVariant[];
  productImageUrl?: string;
  productStock: number;
  productVariants?: ProductVariant[];
  hasVariants?: boolean;
}

export default function ProductVariants({
  productId,
  productName,
  variants,
  productImageUrl,
  productStock,
  productVariants = [],
  hasVariants = false,
}: ProductVariantsProps) {
  const t = useTranslations();
  const { user } = useUser();
  const firstAvailableProductVariant = useMemo(
    () =>
      productVariants.find((variant) => variant.stock > 0) ||
      productVariants[0] ||
      null,
    [productVariants],
  );
  const [selectedVariant, setSelectedVariant] =
    useState<MerchantVariant | null>(variants[0] || null);
  const [quantity, setQuantity] = useState(1);
  const [selectedProductVariant, setSelectedProductVariant] =
    useState<ProductVariant | null>(
      hasVariants ? firstAvailableProductVariant : null,
    );

  const hasProductVariantOptions = hasVariants && productVariants.length > 0;
  const activeStock = hasVariants
    ? (selectedProductVariant?.stock ?? 0)
    : productStock;

  useEffect(() => {
    setSelectedVariant((current) => {
      if (current && variants.some((variant) => variant.id === current.id)) {
        return current;
      }
      return variants[0] || null;
    });
  }, [variants]);

  useEffect(() => {
    if (!hasVariants) {
      setSelectedProductVariant(null);
      return;
    }

    setSelectedProductVariant((current) => {
      if (
        current &&
        productVariants.some((variant) => variant.id === current.id)
      ) {
        return current;
      }
      return firstAvailableProductVariant;
    });
  }, [firstAvailableProductVariant, hasVariants, productVariants]);

  useEffect(() => {
    if (activeStock <= 0) {
      setQuantity(1);
      return;
    }

    setQuantity((current) => Math.min(Math.max(1, current), activeStock));
  }, [activeStock]);

  const handleVariantChange = (variant: MerchantVariant) => {
    setSelectedVariant(variant);
    if (quantity > activeStock) {
      setQuantity(Math.max(1, activeStock));
    }
  };

  const handleProductVariantChange = (variant: ProductVariant) => {
    setSelectedProductVariant(variant);
    if (quantity > variant.stock) {
      setQuantity(Math.max(1, variant.stock));
    }
  };

  const [loading, setLoading] = useState(false);
  const { addItem, getItemQuantity } = useCartStore();
  const router = useRouter();

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      toast.error(t("product.selectVariant"));
      return;
    }

    if (hasVariants && !selectedProductVariant) {
      toast.error("Please select a color/size option");
      return;
    }

    if (
      user?.role === "merchant" &&
      user.merchantId === selectedVariant.merchant_id
    ) {
      toast.error(
        t("merchant.cannotAddToCartOwn") ||
          "You cannot add your own products to cart",
      );
      return;
    }

    const currentInCart = getItemQuantity(
      productId,
      selectedVariant.merchant_id,
      selectedProductVariant?.id,
    );
    if (currentInCart + quantity > activeStock) {
      toast.error(t("product.outOfStock") || "Not enough stock available");
      return;
    }

    setLoading(true);
    try {
      await addItem({
        id: selectedProductVariant
          ? `${selectedVariant.id}-${selectedProductVariant.id}`
          : selectedVariant.id,
        product_id: productId,
        merchant_id: selectedVariant.merchant_id,
        quantity,
        variant_price: selectedVariant.price,
        product_name: productName,
        merchant_name: selectedVariant.merchants.name,
        variant_id: selectedProductVariant?.id,
        variant_details: selectedProductVariant
          ? {
              color: selectedProductVariant.color || "",
              size: selectedProductVariant.size || "",
            }
          : null,
        product: { image_url: productImageUrl },
      });

      toast.success(t("cart.added"));
      setQuantity(1);
    } catch (error) {
      toast.error("Failed to add to cart");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!selectedVariant) return;

    if (hasVariants && !selectedProductVariant) {
      toast.error("Please select a color/size option");
      return;
    }

    if (
      user?.role === "merchant" &&
      user.merchantId === selectedVariant.merchant_id
    ) {
      toast.error(
        t("merchant.cannotAddToCartOwn") ||
          "You cannot add your own products to cart",
      );
      return;
    }

    const currentInCart = getItemQuantity(
      productId,
      selectedVariant.merchant_id,
      selectedProductVariant?.id,
    );
    if (currentInCart + quantity > activeStock) {
      toast.error(t("product.outOfStock") || "Not enough stock available");
      return;
    }

    setLoading(true);
    try {
      await addItem({
        id: selectedProductVariant
          ? `${selectedVariant.id}-${selectedProductVariant.id}`
          : selectedVariant.id,
        product_id: productId,
        merchant_id: selectedVariant.merchant_id,
        quantity,
        variant_price: selectedVariant.price,
        product_name: productName,
        merchant_name: selectedVariant.merchants.name,
        variant_id: selectedProductVariant?.id,
        variant_details: selectedProductVariant
          ? {
              color: selectedProductVariant.color || "",
              size: selectedProductVariant.size || "",
            }
          : null,
        product: { image_url: productImageUrl },
      });

      router.push("/customer/checkout");
    } catch (error) {
      toast.error("Failed to process request");
      console.error(error);
      setLoading(false);
    }
  };

  if (!selectedVariant) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 flex items-center gap-4 text-yellow-800">
        <div className="bg-yellow-100 p-3 rounded-full shrink-0">
          <Info size={24} />
        </div>
        <p className="font-bold text-sm leading-relaxed">
          {t("product.noVariants")}
        </p>
      </div>
    );
  }

  if (hasVariants && !hasProductVariantOptions) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 flex items-center gap-4 text-yellow-800">
        <div className="bg-yellow-100 p-3 rounded-full shrink-0">
          <Info size={24} />
        </div>
        <p className="font-bold text-sm leading-relaxed">
          {t("product.noVariants")}
        </p>
      </div>
    );
  }

  const inStock = activeStock > 0;
  const lowStock = activeStock > 0 && activeStock <= 5;

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-8 backdrop-blur-sm">
      {/* Product Options (Color/Size) */}
      {hasProductVariantOptions && (
        <div className="space-y-4">
          <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            Options
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {productVariants.map((v) => (
              <button
                key={v.id}
                onClick={() => handleProductVariantChange(v)}
                disabled={v.stock <= 0}
                className={`p-3 border-2 rounded-xl transition-all text-left relative ${
                  selectedProductVariant?.id === v.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/30 hover:bg-muted/30"
                } ${v.stock <= 0 ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
              >
                {selectedProductVariant?.id === v.id && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-0.5 rounded-full shadow-lg">
                    <Check size={12} strokeWidth={4} />
                  </div>
                )}
                <div className="font-bold text-sm">
                  {v.color && <span>{v.color}</span>}
                  {v.color && v.size && <span> - </span>}
                  {v.size && <span>{v.size}</span>}
                  {!v.color && !v.size && (
                    <span>
                      {t("common.option", { defaultMessage: "Option" })}
                    </span>
                  )}
                </div>
                <div className="text-xs mt-1 text-muted-foreground">
                  {v.stock > 0 ? `${v.stock} in stock` : "Out of stock"}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Merchant Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <Store size={20} className="text-primary" />
            {t("product.availableSellers")}
          </h3>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2 py-1 bg-muted rounded-md">
            {variants.length} {t("product.offers")}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {variants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => handleVariantChange(variant)}
              className={`p-4 border-2 rounded-xl transition-all text-left relative group ${
                selectedVariant.id === variant.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/30 hover:bg-muted/30"
              }`}
            >
              {selectedVariant.id === variant.id && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-0.5 rounded-full shadow-lg">
                  <Check size={12} strokeWidth={4} />
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-lg border border-border p-1 overflow-hidden shrink-0">
                  {variant.merchants.logo_url ? (
                    <Image
                      src={variant.merchants.logo_url}
                      alt={variant.merchants.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-[10px] font-bold">
                      {t("common.noImage")}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <Link
                    href={
                      user?.role === "merchant" &&
                      user.merchantId === variant.merchants.id
                        ? "/merchant/dashboard"
                        : `/merchants/${variant.merchants.id}`
                    }
                    className={`font-bold text-sm transition-colors block hover:underline ${
                      selectedVariant.id === variant.id
                        ? "text-primary"
                        : "text-foreground hover:text-primary"
                    }`}
                  >
                    {variant.merchants.name}
                  </Link>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xl font-extrabold text-foreground">
                      ${variant.price.toFixed(2)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                        activeStock > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {activeStock > 0
                        ? t("product.inStock")
                        : t("product.outOfStock")}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quantity & Action Area */}
      <div className="space-y-6 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-extrabold text-foreground">
            {t("product.quantity")}
          </label>
          <div className="flex items-center bg-muted/30 rounded-full border border-border p-1 group focus-within:border-primary transition-colors">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity === 1}
              className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground disabled:opacity-30 rounded-full transition-all"
              aria-label={t("product.decreaseQuantity") || "Decrease quantity"}
            >
              <Minus size={14} strokeWidth={3} />
            </button>
            <input
              type="number"
              min="1"
              max={activeStock}
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  Math.min(
                    activeStock || 1,
                    Math.max(1, parseInt(e.target.value) || 1),
                  ),
                )
              }
              className="w-12 bg-transparent text-center font-extrabold text-sm focus:outline-none"
            />
            <button
              onClick={() => setQuantity(Math.min(activeStock, quantity + 1))}
              disabled={quantity === activeStock}
              className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground disabled:opacity-30 rounded-full transition-all"
              aria-label={t("product.increaseQuantity") || "Increase quantity"}
            >
              <Plus size={14} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Dynamic Alerts */}
        <div className="space-y-3">
          {lowStock && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 animate-in fade-in slide-in-from-top-1">
              <p className="text-primary text-[11px] font-extrabold flex items-center gap-2">
                <Zap size={14} />
                {t("product.lowStockCount", { count: activeStock })}
              </p>
            </div>
          )}

          {!inStock && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
              <p className="text-destructive text-[11px] font-extrabold flex items-center gap-2 uppercase tracking-wide">
                <Info size={14} />
                {t("product.outOfStockFromSeller")}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleAddToCart}
            disabled={!inStock || loading}
            className="flex-1 group relative bg-secondary text-secondary-foreground py-4 rounded-full font-extrabold shadow-md hover:bg-secondary/80 active:scale-95 transition-all text-sm uppercase tracking-widest disabled:grayscale disabled:opacity-50 disabled:scale-100 flex items-center justify-center overflow-hidden"
          >
            <div className="relative flex items-center justify-center gap-3">
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <ShoppingCart size={18} strokeWidth={3} />
              )}
              {inStock ? t("product.addToCart") : t("product.outOfStock")}
            </div>
          </button>

          <button
            onClick={handleBuyNow}
            disabled={!inStock || loading}
            className="flex-1 group relative bg-primary text-primary-foreground py-4 rounded-full font-extrabold shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all text-sm uppercase tracking-widest disabled:grayscale disabled:opacity-50 disabled:scale-100 flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
            <div className="relative flex items-center justify-center gap-3">
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <ShoppingBag size={18} strokeWidth={3} />
              )}
              {t("product.buyNow")}
            </div>
          </button>
        </div>
      </div>

      {/* Trust Signals Footer */}
      <div className="pt-6 border-t border-border grid grid-cols-3 gap-2">
        {[
          { label: "fastDelivery", Icon: Truck },
          { label: "securePay", Icon: Lock },
          { label: "trueQuality", Icon: Check },
        ].map((item: { label: string; Icon: FC<SVGProps<SVGSVGElement>> }) => (
          <div key={item.label} className="text-center space-y-1">
            <div className="text-lg text-primary">
              <item.Icon className="mx-auto h-5 w-5" />
            </div>
            <div className="text-[9px] font-bold text-muted-foreground uppercase ltr">
              {t(`product.trustSignals.${item.label}`)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
