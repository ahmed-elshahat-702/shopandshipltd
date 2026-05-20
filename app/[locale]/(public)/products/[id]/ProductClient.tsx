"use client";

import ProductCard from "@/components/ProductCard";
import ProductVariants from "@/components/ProductVariants";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useWishlistStore } from "@/lib/store/useWishlistStore";
import { Product } from "@/lib/types";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  RotateCcw,
  Share2,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

import { getProductByIdAction } from "@/app/actions/products";
import { useUser } from "@/hooks/use-auth";

/* ── Auto-Playing Image Carousel ───────────────────────────────── */
function ProductCarousel({
  images,
  name,
  badgeText,
}: {
  images: string[];
  name: string;
  badgeText: string;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"left" | "right">("right");

  const t = useTranslations();

  const goTo = useCallback(
    (idx: number, dir: "left" | "right" = "right") => {
      if (animating || idx === active) return;
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        setActive(idx);
        setAnimating(false);
      }, 280);
    },
    [animating, active],
  );

  const prev = () => goTo((active - 1 + images.length) % images.length, "left");
  const next = useCallback(
    () => goTo((active + 1) % images.length, "right"),
    [active, goTo, images.length],
  );

  // Auto-play every 3.5 s
  useEffect(() => {
    if (paused || images.length <= 1) return;
    const id = setInterval(next, 3500);
    return () => clearInterval(id);
  }, [paused, next, images.length]);

  if (!images.length) return null;

  return (
    <div className="space-y-3">
      {/* Main slide */}
      <div
        className="relative aspect-square rounded-2xl overflow-hidden border border-border bg-muted/20 group"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Slide image — crossfade */}
        <div
          key={active}
          className={`absolute inset-0 transition-opacity duration-300 ${
            animating ? "opacity-0" : "opacity-100"
          }`}
          style={{
            transform: animating
              ? `translateX(${direction === "right" ? "-6%" : "6%"})`
              : "translateX(0)",
            transition: "opacity 280ms ease, transform 280ms ease",
          }}
        >
          <Image
            src={images[active]}
            alt={`${name} — image ${active + 1}`}
            fill
            className="object-contain p-4 group-hover:scale-105 transition-transform duration-700"
            priority={active === 0}
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        {/* Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10
                         bg-background/80 backdrop-blur-sm p-2 rounded-full shadow-md
                         opacity-0 group-hover:opacity-100 transition-opacity
                         hover:bg-background hover:scale-110"
              aria-label={t("common.previous") || "Previous image"}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10
                         bg-background/80 backdrop-blur-sm p-2 rounded-full shadow-md
                         opacity-0 group-hover:opacity-100 transition-opacity
                         hover:bg-background hover:scale-110"
              aria-label={t("common.next") || "Next image"}
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > active ? "right" : "left")}
                className={`rounded-full transition-all duration-300 ${
                  i === active
                    ? "w-5 h-1.5 bg-primary"
                    : "w-1.5 h-1.5 bg-foreground/25 hover:bg-foreground/50"
                }`}
                aria-label={
                  t("common.goToImage", { number: i + 1 }) ||
                  `Go to image ${i + 1}`
                }
              />
            ))}
          </div>
        )}

        {/* Best Seller badge */}
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-primary text-primary-foreground text-[10px] font-extrabold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 uppercase tracking-wider">
            <Zap size={10} fill="currentColor" /> {badgeText}
          </div>
        </div>
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${Math.min(images.length, 5)}, 1fr)`,
          }}
        >
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > active ? "right" : "left")}
              className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                i === active
                  ? "border-primary shadow-md shadow-primary/20 scale-[1.03]"
                  : "border-border/40 hover:border-primary/50 opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={img}
                alt={`Thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="100px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ProductClientProps {
  initialProduct: Product;
  // initialReviews: Review[];
  // initialDistribution: Record<number, number>;
  relatedProducts: Product[];
}

export default function ProductClient({
  initialProduct,
  // initialReviews,
  // initialDistribution,
  relatedProducts,
}: ProductClientProps) {
  const t = useTranslations();
  const { user } = useUser();
  const { addWishlist, removeWishlist, isInWishlist } = useWishlistStore();

  const { data } = useSWR(
    ["product", initialProduct.id],
    () => getProductByIdAction(initialProduct.id),
    {
      fallbackData: {
        product: initialProduct,
        // reviews: initialReviews,
        // distribution: initialDistribution,
      },
      revalidateOnFocus: false,
    },
  );

  const product = data?.product || initialProduct;
  const inWishlist = isInWishlist(product.id);
  const isOwnProduct =
    user?.role === "merchant" && user.merchantId === product.merchantId;

  const handleWishlistToggle = () => {
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
        image_url: product.image_url || "",
        lowestPrice: product.lowestPrice || 0,
      });
      toast.success(t("wishlist.added"));
    }
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: product.name, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success(t("common.linkCopied"), {
        icon: <Share2 className="text-primary" size={16} />,
        position: "top-center",
      });
    }
  };

  // Build image array for carousel
  const imageUrls: string[] =
    Array.isArray(product.image_urls) && product.image_urls.length > 0
      ? product.image_urls
      : product.image_url
        ? [product.image_url]
        : [];

  const price: number = product.lowestPrice ?? product.price ?? 0;
  const originalPrice: number = product.originalPrice ?? price * 1.5;
  const discount =
    originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;
  const categoryName = Array.isArray(product.categories)
    ? product.categories[0]?.name
    : (product.categories?.name as string) || t("nav.categories");

  const merchantName =
    product.merchant_variants?.[0]?.merchants?.name || t("common.appName");

  const merchantId =
    product.merchantId || product.merchant_variants?.[0]?.merchant_id;

  const categorySlug = Array.isArray(product.categories)
    ? product.categories[0]?.slug
    : (product.categories?.slug as string);

  return (
    <main className="min-h-screen bg-background py-6 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground overflow-x-auto no-scrollbar pb-1">
            <Link
              href="/"
              className="hover:text-primary transition-colors whitespace-nowrap"
            >
              {t("nav.home")}
            </Link>
            <span className="text-border">/</span>
            <Link
              href="/products"
              className="hover:text-primary transition-colors whitespace-nowrap"
            >
              {t("nav.products")}
            </Link>
            <span className="text-border">/</span>
            <span className="text-foreground whitespace-nowrap truncate max-w-50">
              {product.name}
            </span>
          </nav>
          <Link
            href="/products"
            className="hidden md:flex items-center gap-2 text-primary font-extrabold text-sm hover:-translate-x-1 transition-transform"
          >
            <ArrowLeft size={16} strokeWidth={3} /> {t("common.back")}
          </Link>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start mb-20">
          {/* Left — carousel */}
          <div className="lg:col-span-7">
            <ProductCarousel
              images={imageUrls}
              name={product.name}
              badgeText={t("product.bestSeller")}
            />
          </div>

          {/* Right — details */}
          <div className="lg:col-span-5 space-y-8">
            {/* Category + Rating */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest border border-primary/20">
                {categoryName}
              </span>
              {/*  <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                <Star size={14} className="fill-yellow-400 text-yellow-400" />
                {(product.average_rating ?? 0).toFixed(1)}
                <span className="text-muted-foreground text-xs font-medium ml-1">
                  ({(product.total_reviews ?? 0).toLocaleString()} {t("common.ratings")})
                </span>
              </div>*/}
            </div>

            {/* Name */}
            <h1 className="text-2xl md:text-4xl font-extrabold leading-tight tracking-tight text-foreground">
              {product.name}
            </h1>

            {/* Price block */}
            <div className="flex items-end gap-3 pt-4 border-t border-border">
              <div className="text-3xl md:text-4xl font-extrabold text-foreground">
                ${price.toFixed(2)}
              </div>
              {originalPrice > price && (
                <div className="text-lg font-bold text-muted-foreground line-through pb-1 opacity-40">
                  ${originalPrice.toFixed(2)}
                </div>
              )}
              {discount > 0 && (
                <div className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-extrabold px-2 py-1 rounded-lg mb-1">
                  {t("product.save")} {discount}%
                </div>
              )}
            </div>

            {/* Merchant Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {merchantName.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground font-semibold">
                  {t("product.soldBy")}:
                </span>
                <Link
                  href={
                    user?.role === "merchant" &&
                    user.merchantId === product.merchantId
                      ? "/merchant/dashboard"
                      : product.merchantId
                        ? `/merchants/${product.merchantId}`
                        : "/merchants"
                  }
                  className="text-sm font-extrabold text-foreground hover:text-primary transition-colors"
                >
                  {merchantName}
                </Link>
              </div>
              <div className="ml-auto">
                <Link href={`/chat/${merchantId || "support"}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl font-bold gap-2"
                  >
                    <MessageCircle size={14} />
                    {t("chat.chatWithMerchant")}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Description */}
            <div className="bg-muted/30 border border-border/60 rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-125 transition-transform duration-700">
                <ShieldCheck size={80} />
              </div>
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-widest mb-3">
                {t("product.details")}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed relative z-10">
                {product.description || t("product.descriptionDefault")}
              </p>
            </div>

            {/* Variants / Add to cart */}
            <ProductVariants
              productId={product.id}
              productName={product.name}
              variants={product.merchant_variants || []}
              productImageUrl={product.image_url ?? undefined}
              productStock={product.stock}
              productVariants={product.variants}
              hasVariants={
                Boolean(product.has_variants) ||
                Boolean(product.variants?.length)
              }
            />

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 py-6 border-y border-border">
              {[
                {
                  icon: Truck,
                  text:
                    t("nav.trust1")?.split(" ").slice(0, 2).join(" ") ||
                    "Fast Shipping",
                  sub: t("product.trust1") || "3–7 Days",
                },
                {
                  icon: RotateCcw,
                  text:
                    t("nav.trust2")?.split(" ").slice(0, 2).join(" ") ||
                    "Easy Returns",
                  sub: t("product.trust2") || "Worry-free",
                },
                {
                  icon: ShieldCheck,
                  text: t("nav.trust7")?.split(",")[0] || "Quality Warranty",
                  sub: t("product.trust7") || "Guaranteed",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center text-center gap-2"
                >
                  <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
                    <item.icon size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold text-foreground uppercase tracking-tighter line-clamp-1">
                      {item.text}
                    </div>
                    <div className="text-[9px] font-bold text-muted-foreground/70 uppercase">
                      {item.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Wishlist + Share */}
            <div className="flex gap-3">
              <button
                onClick={handleWishlistToggle}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-sm border-2 transition-all ${
                  inWishlist
                    ? "border-primary text-primary bg-primary/5"
                    : "border-border text-foreground hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <Heart
                  size={17}
                  className={inWishlist ? "fill-primary text-primary" : ""}
                />
                {inWishlist
                  ? t("product.wishlisted")
                  : t("product.addToWishlist")}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 px-5 py-3 border-2 border-border rounded-full text-foreground font-bold text-sm hover:bg-muted/50 hover:border-primary/20 transition-all group"
                aria-label={t("product.share") || "Share product"}
              >
                <Share2
                  size={17}
                  className="group-hover:text-primary transition-colors"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="max-w-6xl mx-auto space-y-12">
          {/* <ReviewsSection
            productId={product.id}
            averageRating={product.average_rating || 0}
            totalReviews={product.total_reviews || 0}
          /> */}

          {relatedProducts.length > 0 && (
            <section className="py-12 border-t border-border">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black flex items-center gap-3">
                  <div className="w-2 h-8 bg-primary rounded-full" />
                  {t("product.relatedProducts")}
                </h2>
                <Link
                  href={`/products?category=${categorySlug}`}
                  className="text-primary font-bold text-sm hover:underline flex items-center gap-1"
                >
                  {t("common.viewAll") || "View All"}
                  <ChevronRight size={16} />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {relatedProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    lowestPrice={p.lowestPrice}
                    originalPrice={p.originalPrice}
                    merchantCount={p.merchant_count}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
