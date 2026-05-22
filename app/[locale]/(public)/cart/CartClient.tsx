"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useCartStore } from "@/lib/store/useCartStore";
import {
  ArrowLeft,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

export default function CartClient() {
  const t = useTranslations();
  const router = useRouter();
  const { items, removeItem, updateQuantity } = useCartStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const subtotal = items.reduce(
    (sum, item) => sum + item.variant_price * item.quantity,
    0,
  );
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  // Group items by merchant name, falling back to ID for older cart entries.
  const itemsByMerchant = items.reduce(
    (acc, item) => {
      const merchantName = item.merchant_name || item.merchant_id || "default";
      if (!acc[merchantName]) {
        acc[merchantName] = [];
      }
      acc[merchantName].push(item);
      return acc;
    },
    {} as Record<string, typeof items>,
  );

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error(t("cart.empty"));
      return;
    }

    setIsCheckingOut(true);
    try {
      // Redirect to checkout with cart data
      router.push("/customer/checkout");
    } catch (error) {
      toast.error(t("messages.operationFailed"));
      console.error(error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-background py-12">
        <div className="max-w-7xl mx-auto px-4">
          <Link
            href="/products"
            className="flex items-center gap-2 text-primary hover:text-primary/80 mb-8 font-bold transition-all"
          >
            <ArrowLeft size={20} />
            {t("common.back")}
          </Link>

          <div className="bg-card border border-border rounded-3xl p-16 text-center shadow-xl shadow-primary/5">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag size={40} className="text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold text-foreground mb-4">
              {t("cart.empty")}
            </h1>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {t("cart.emptyDesc")}
            </p>
            <Link
              href="/products"
              className="inline-flex items-center justify-center bg-primary text-primary-foreground px-10 py-4 rounded-full font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20"
            >
              {t("home.browseProducts")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background py-10">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <Link
          href="/products"
          className="flex items-center gap-2 text-primary hover:text-primary/80 mb-8 font-bold transition-all"
        >
          <ArrowLeft size={20} />
          {t("common.back")}
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight">
              {t("cart.title")}
            </h1>
            <p className="text-muted-foreground mt-2 font-medium">
              You have {items.length}{" "}
              {items.length === 1 ? t("cart.item") : t("cart.items")} in your
              shopping bag
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-8">
            {Object.entries(itemsByMerchant).map(
              ([merchantName, merchantItems]) => (
                <div
                  key={merchantName}
                  className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
                >
                  {merchantName !== "default" && (
                    <div className="bg-muted/30 px-6 py-3 border-b border-border">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {t("common.merchant")}:{" "}
                        <span className="text-foreground">{merchantName}</span>
                      </p>
                    </div>
                  )}

                  <div className="divide-y divide-border/50">
                    {merchantItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-6 flex flex-col sm:flex-row gap-6"
                      >
                        {/* Product Image */}
                        <div className="shrink-0 w-32 h-32 bg-muted rounded-2xl overflow-hidden border border-border/50 relative group">
                          {item.product?.image_url && (
                            <Image
                              src={item.product?.image_url}
                              alt={item.product_name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div className="space-y-1">
                            <h3 className="text-lg font-bold text-foreground line-clamp-1">
                              {item.product_name ||
                                `Product ${item.product_id}`}
                            </h3>
                            {item.variant_details && (
                              <div className="flex items-center gap-2 mt-1">
                                {item.variant_details.color && (
                                  <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground uppercase">
                                    {t("common.color") || "Color"}: {item.variant_details.color}
                                  </span>
                                )}
                                {item.variant_details.size && (
                                  <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground uppercase">
                                    {t("common.size") || "Size"}: {item.variant_details.size}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-4">
                              <p className="text-2xl font-black text-primary">
                                ${item.variant_price.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3 mt-4">
                            <div className="flex items-center border border-border bg-muted/20 rounded-xl p-1">
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background hover:shadow-sm transition-all text-muted-foreground hover:text-foreground"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-10 text-center font-bold text-sm">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background hover:shadow-sm transition-all text-muted-foreground hover:text-foreground"
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            <button
                              onClick={() => {
                                removeItem(item.id);
                                toast.success(t("cart.removedSuccess"));
                              }}
                              className="text-destructive hover:bg-destructive/10 p-2.5 rounded-xl transition-all"
                              title={t("common.remove")}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        {/* Subtotal per item */}
                        <div className="sm:text-right flex sm:flex-col justify-between items-center sm:items-end py-1">
                          <span className="text-xs font-bold text-muted-foreground uppercase sm:hidden">
                            Subtotal
                          </span>
                          <p className="text-xl font-black text-foreground">
                            ${(item.variant_price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-3xl p-8 sticky top-24 space-y-8 shadow-xl shadow-primary/5">
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                {t("order.details")}
              </h2>

              {/* Summary Lines */}
              <div className="space-y-4 border-t border-border pt-6">
                <div className="flex justify-between text-muted-foreground font-medium">
                  <span>{t("order.subtotal")}</span>
                  <span className="text-foreground font-bold">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-muted-foreground font-medium">
                  <span>{t("order.tax")}</span>
                  <span className="text-foreground font-bold">
                    ${tax.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="border-t-4 border-double border-border pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-foreground">
                    {t("order.total")}
                  </span>
                  <span className="text-3xl font-black text-primary">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-extrabold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/30 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isCheckingOut ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <Zap size={20} fill="currentColor" />
                  )}
                  {t("cart.checkout")}
                </button>

                <Link
                  href="/products"
                  className="block w-full text-center text-muted-foreground hover:text-primary font-bold py-3 transition-all text-sm"
                >
                  {t("cart.continueShopping")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
