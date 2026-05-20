"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { ArrowLeft, Heart, ShoppingCart, Share2 } from "lucide-react";
import { useWishlistStore, WishlistItem } from "@/lib/store/useWishlistStore";
import { useCartStore } from "@/lib/store/useCartStore";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";

export default function WishlistClient() {
  const t = useTranslations();
  const { items: wishlistItems, removeWishlist } = useWishlistStore();
  const { addItem: addToCart } = useCartStore();

  const handleRemoveFromWishlist = (productId: string) => {
    removeWishlist(productId);
    toast.success(t("wishlist.removed"));
  };

  const handleMoveToCart = (product: WishlistItem) => {
    addToCart({
      id: crypto.randomUUID(),
      product_id: product.id,
      quantity: 1,
      merchant_id: "",
      variant_price: product.lowestPrice || 0,
      product_name: product.name || "",
      merchant_name: "",
      product: {
        image_url: product.image_url,
      },
    });
    removeWishlist(product.id);
    toast.success(t("cart.addedSuccess"));
  };

  const handleShare = async (product: WishlistItem) => {
    const url = `${window.location.origin}/products/${product.id}`;
    if (navigator.share) {
      navigator.share({
        title: product.name,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success(t("common.linkCopied"));
    }
  };

  return (
    <main className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/products"
            className="flex items-center gap-2 text-primary hover:text-primary/80 mb-4 transition-colors font-bold"
          >
            <ArrowLeft size={20} />
            {t("common.back")}
          </Link>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">
            {t("wishlist.title")}
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            {wishlistItems.length} {t("common.items")}
          </p>
        </div>

        {/* Empty State */}
        {wishlistItems.length === 0 ? (
          <div className="bg-card border border-border rounded-3xl p-16 text-center shadow-xl shadow-primary/5">
            <Heart
              size={48}
              className="mx-auto text-muted-foreground/30 mb-4"
            />
            <h2 className="text-2xl font-extrabold text-foreground mb-2">
              {t("wishlist.empty")}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              {t("wishlist.emptyDesc")}
            </p>
            <Link
              href="/products"
              className="inline-flex items-center justify-center bg-primary text-primary-foreground px-8 py-3 rounded-full font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              {t("home.browseProducts")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistItems.map((product) => (
              <div
                key={product.id}
                className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                {/* Product Image */}
                <div className="relative w-full aspect-square bg-muted overflow-hidden">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <span className="text-muted-foreground/40 text-xs font-bold uppercase tracking-widest">
                        {t("common.noImage")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-5 space-y-4">
                  <Link href={`/products/${product.id}`}>
                    <h3 className="text-lg font-bold text-foreground hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {product.name}
                    </h3>
                  </Link>

                  <div className="flex items-center justify-between">
                    {product.lowestPrice && (
                      <p className="text-2xl font-black text-primary">
                        ${product.lowestPrice.toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleMoveToCart(product)}
                      className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/10"
                    >
                      <ShoppingCart size={18} />
                      {t("cart.title")}
                    </button>

                    <button
                      onClick={() => handleRemoveFromWishlist(product.id)}
                      className="w-12 h-11 shrink-0 bg-muted hover:bg-muted/80 text-foreground py-2 rounded-xl transition-all flex items-center justify-center border border-border"
                      title={t("wishlist.removed")}
                    >
                      <Heart
                        size={18}
                        className="fill-destructive text-destructive"
                      />
                    </button>
                  </div>

                  <button
                    onClick={() => handleShare(product)}
                    className="w-full border border-border text-muted-foreground hover:text-foreground py-2 rounded-xl hover:bg-muted transition-all flex items-center justify-center gap-2 text-sm font-bold"
                  >
                    <Share2 size={16} />
                    {t("common.share")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
