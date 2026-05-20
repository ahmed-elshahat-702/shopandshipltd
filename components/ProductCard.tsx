"use client";

import { useUser } from "@/hooks/use-auth";
import { useCartStore } from "@/lib/store/useCartStore";
import { useWishlistStore } from "@/lib/store/useWishlistStore";
import { Product } from "@/lib/types";
import { Heart, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
  lowestPrice?: number;
  originalPrice?: number;
  merchantCount?: number;
  merchantId?: string;
  merchantName?: string;
}

export default function ProductCard({
  product,
  lowestPrice,
  originalPrice,
  merchantCount,
  merchantId,
  merchantName,
}: ProductCardProps) {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useUser();
  const { addWishlist, removeWishlist, isInWishlist } = useWishlistStore();
  const addToCart = useCartStore((s) => s.addItem);
  const getItemQuantity = useCartStore((s) => s.getItemQuantity);
  const inWishlist = isInWishlist(product.id);
  const [hovered, setHovered] = useState(false);

  // Resolve prices — support both direct props and embedded mock fields
  const price = lowestPrice ?? product.lowestPrice ?? product.originalPrice ?? 0;
  const origPrice = originalPrice ?? product.originalPrice;
  const mCount = merchantCount ?? product.merchant_count;
  const mId = merchantId ?? product.merchantId;
  const mName = merchantName ?? product.merchantName;
  const requiresVariantSelection =
    Boolean(product.has_variants) ||
    (Array.isArray(product.variants) && product.variants.length > 0);

  const isOwnProduct = user?.role === "merchant" && user.merchantId === mId;

  const images: string[] =
    Array.isArray(product.image_urls) && product.image_urls.length > 0
      ? product.image_urls
      : product.image_url
        ? [product.image_url]
        : [];

  const primaryImg = images[0] || null;
  const hoverImg = images[1] || null;

  // const rating = product.average_rating ?? 0;
  // const reviewCount = product.total_reviews ?? 0;
  const discount =
    origPrice && price
      ? Math.round(((origPrice - price) / origPrice) * 100)
      : null;

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOwnProduct) {
      toast.error(
        t("merchant.cannotWishlistOwn") ||
          "You cannot add your own products to wishlist",
      );
      return;
    }

    if (inWishlist) {
      removeWishlist(product.id);
      toast.success(t("wishlist.removed"));
    } else {
      addWishlist({
        id: product.id,
        name: product.name,
        image_url: primaryImg || "",
        lowestPrice: price,
      });
      toast.success(t("wishlist.added"));
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Variant products must be configured on the product page before cart write.
    if (requiresVariantSelection) {
      router.push(`/products/${product.id}`);
      return;
    }

    if (isOwnProduct) {
      toast.error(
        t("merchant.cannotAddToCartOwn") ||
          "You cannot add your own products to cart",
      );
      return;
    }

    if (!mId) {
      toast.error(t("product.selectMerchantFirst"));
      return;
    }

    const currentQty = getItemQuantity(product.id, mId);
    if (currentQty + 1 > product.stock) {
      toast.error(t("product.outOfStock") || "Not enough stock available");
      return;
    }

    try {
      await addToCart({
        id: `${product.id}-${mId}`,
        product_id: product.id,
        merchant_id: mId,
        quantity: 1,
        variant_price: price,
        product_name: product.name,
        merchant_name: mName || "Shop & Ship LTD",
        product: { image_url: primaryImg || "" },
      });
      toast.success(t("cart.added"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("messages.operationFailed"),
      );
    }
  };

  return (
    <Link href={`/products/${product.id}`}>
      <div
        className="group relative bg-background border border-border/40 rounded-xl overflow-hidden cursor-pointer
                   hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 h-full"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* ── Image Area ── */}
        <div className="relative w-full aspect-square bg-muted/20 overflow-hidden">
          {/* Primary image */}
          {primaryImg && (
            <Image
              src={primaryImg}
              alt={product.name}
              fill
              className={`object-cover transition-all duration-500 ${
                hovered && hoverImg
                  ? "opacity-0 scale-110"
                  : "opacity-100 scale-100 group-hover:scale-110"
              }`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          )}

          {/* Hover image (second image) */}
          {hoverImg && (
            <Image
              src={hoverImg}
              alt={product.name}
              fill
              className={`object-cover absolute inset-0 transition-all duration-500 ${
                hovered ? "opacity-100 scale-105" : "opacity-0 scale-110"
              }`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          )}

          {/* No image fallback */}
          {!primaryImg && (
            <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-muted to-muted/60">
              <span className="text-3xl">💡</span>
            </div>
          )}

          {/* ── Badges ── */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {discount && discount > 0 && (
              <span className="w-fit bg-primary text-primary-foreground text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow">
                -{discount}%
              </span>
            )}
            {product.stock && product.stock > 0 && product.stock <= 5 && (
              <span className="w-fit text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full animate-pulse capitalize">
                {t("product.lowStockCount", { count: product.stock })}
              </span>
            )}
          </div>

          {/* ── Wishlist ── */}
          <button
            onClick={handleWishlistToggle}
            className="absolute top-2 right-2 z-10 bg-background/90 backdrop-blur-sm rounded-full p-1.5
                       shadow-md
                       opacity-100 lg:opacity-0 lg:group-hover:opacity-100
                       transition-all duration-200 hover:scale-110"
            aria-label={inWishlist ? t("wishlist.remove") : t("wishlist.add")}
          >
            <Heart
              size={14}
              className={
                inWishlist
                  ? "fill-primary text-primary"
                  : "text-muted-foreground"
              }
            />
          </button>

          {/* ── Add to Cart bar — slides up on hover ── */}
          {mId && (
            <button
              onClick={handleAddToCart}
              className="absolute bottom-0 left-0 right-0 z-10
                        bg-primary text-primary-foreground
                        text-[11px] font-bold py-2 flex items-center justify-center gap-1.5
                        lg:translate-y-full lg:group-hover:translate-y-0 translate-y-0
                        transition-transform duration-300 ease-out
                        hover:bg-primary/90"
            >
              <ShoppingCart size={12} />
              Add to Cart
            </button>
          )}
        </div>

        {/* ── Card Info ── */}
        <div className="p-2.5 space-y-1">
          {/* Name */}
          <p className="text-[11px] sm:text-xs text-foreground line-clamp-2 leading-snug font-medium min-h-10">
            {product.name}
          </p>

          {/* Stars + review count */}
          {/* {reviewCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex gap-px">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={9}
                    className={
                      i < Math.round(rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30 fill-muted-foreground/20"
                    }
                  />
                ))}
              </div>
              <span className="text-[9px] text-muted-foreground">
                ({reviewCount.toLocaleString()})
              </span>
            </div>
          )} */}

          {/* Price row */}
          {price > 0 ? (
  <div className="flex items-center gap-1.5">
    <span className="text-sm font-extrabold text-foreground">
      ${price.toFixed(2)}
    </span>
    {origPrice && origPrice > price && (
      <span className="text-[10px] text-muted-foreground line-through">
        ${origPrice.toFixed(2)}
      </span>
    )}
  </div>
) : (
  <p className="text-[9px] text-muted-foreground">Price unavailable</p>
)}

          {mCount && mCount > 0 && (
            <p className="text-[9px] text-muted-foreground">
              {mCount}+ sellers
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
