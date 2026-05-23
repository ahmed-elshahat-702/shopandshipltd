"use client";

import LoadingSpinner from "@/components/LoadingSpinner";
import ProductCard from "@/components/ProductCard";
import { ArrowLeft, Heart, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import useSWR from "swr";

import {
  getMerchantPublicDetailsAction,
  toggleFollowMerchantAction,
} from "@/app/actions/merchant";
import { getMerchantProductsAction } from "@/app/actions/products";
import { useUser } from "@/hooks/use-auth";
import { Link, useRouter } from "@/i18n/navigation";
import {
  MerchantInventoryProduct,
  MerchantPublicDetails,
  Product,
} from "@/lib/types";
import Image from "next/image";
import { toast } from "sonner";

interface MerchantClientProps {
  merchantId: string;
  initialMerchant: MerchantPublicDetails | null;
  initialProductsData: {
    products: MerchantInventoryProduct[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function MerchantClient({
  merchantId,
  initialMerchant,
  initialProductsData,
}: MerchantClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useUser();

  const {
    data: merchantData,
    isLoading: merchantLoading,
    mutate: mutateMerchant,
  } = useSWR(
    ["merchant", merchantId],
    () => getMerchantPublicDetailsAction(merchantId),
    {
      revalidateOnFocus: false,
      fallbackData: initialMerchant ? { merchant: initialMerchant } : undefined,
    },
  );

  const merchant =
    merchantData && "merchant" in merchantData ? merchantData.merchant : null;

  const [page, setPage] = useState(1);

  const { data: productsData, isLoading: productsLoading } = useSWR<{
    products: MerchantInventoryProduct[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(
    ["store-products", merchantId, page],
    () => getMerchantProductsAction(merchantId, page, 15),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      fallbackData: page === 1 ? initialProductsData : undefined,
    },
  );

  const totalPages = productsData?.totalPages || 1;

  const handleFollowToggle = async () => {
    if (!user) {
      toast.error(t("auth.loginRequired"), {
        action: {
          label: t("auth.login"),
          onClick: () => router.push("/login"),
        },
      });
      return;
    }

    if (!merchant) return;

    // Optimistic update
    const previousData = merchantData;
    const isFollowing = merchant.isFollowing;
    const newFollowersCount = isFollowing
      ? merchant.followers - 1
      : merchant.followers + 1;

    mutateMerchant(
      {
        merchant: {
          ...merchant,
          isFollowing: !isFollowing,
          followers: newFollowersCount,
        },
      },
      false,
    );

    try {
      const result = await toggleFollowMerchantAction(merchantId);
      if ("error" in result) {
        throw new Error(result.error);
      }
      toast.success(
          result.isFollowing
              ? t("merchant.followedSuccess")
              : t("merchant.unfollowedSuccess"),
      );
      mutateMerchant();
    } catch (error) {
      toast.error(t("common.error"));
      mutateMerchant(previousData);
      console.error(error);
    }
  };

  const isLoading =
    (!initialMerchant && merchantLoading) ||
    (!initialProductsData.products.length && productsLoading);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("messages.noResults")}
        </h1>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link
            href="/merchants"
            className="flex items-center gap-2 text-primary font-bold hover:translate-x-1 transition-all w-20"
          >
            <ArrowLeft size={20} />
            {t("common.back")}
          </Link>
        </div>
      </div>

      {/* Merchant Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Logo */}
            <div className="w-24 h-24 bg-gray-200 rounded-lg shrink-0 overflow-hidden relative">
              {merchant?.logo_url ? (
                <Image
                  src={merchant.logo_url}
                  alt={merchant.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold uppercase">
                  {merchant?.name?.charAt(0) || "M"}
                </div>
              )}
            </div>

            {/* Merchant Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {merchant.name}
                </h1>
                {merchant.isVerified && (
                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                    {t("kyc.verified")}
                  </div>
                )}
              </div>

              <p className="text-gray-600 mb-4">{merchant.description}</p>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 text-sm">
                {/* <div>
                  <p className="text-gray-600">{t("merchant.rating")}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={
                            i < Math.round(merchant.rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }
                        />
                      ))}
                    </div>
                    <span className="font-semibold text-gray-900">
                      {merchant.rating} ({merchant.totalReviews})
                    </span>
                  </div>
                </div> */}

                {/* <div>
                  <p className="text-gray-600">{t("merchant.followers")}</p>
                  <p className="font-semibold text-gray-900">
                    {merchant.followers.toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-gray-600">{t("merchant.totalSales")}</p>
                  <p className="font-semibold text-gray-900">
                    ${merchant.totalSales.toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-gray-600">{t("nav.products")}</p>
                  <p className="font-semibold text-gray-900">
                    {productsData?.products?.length || 0}
                  </p>
                </div> */}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <Link href={`/chat/${merchantId}`} className="w-full sm:w-auto">
                <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold bg-white border-2 border-primary text-primary hover:bg-primary/5 transition-colors w-full">
                  <MessageCircle size={20} />
                  {t("chat.chatWithMerchant")}
                </button>
              </Link>
              <button
                onClick={handleFollowToggle}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors shrink-0 w-full sm:w-auto ${
                  merchant.isFollowing
                    ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    : "bg-primary text-white hover:bg-primary/80"
                }`}
              >
                <Heart
                  size={20}
                  className={
                    merchant.isFollowing ? "fill-red-500 text-red-500" : ""
                  }
                />
                {merchant.isFollowing
                  ? t("common.unfollow")
                  : t("common.follow")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          {t("merchant.products")}
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : productsData?.products?.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600">{t("products.noResults")}</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {productsData?.products?.map(
                (variant: MerchantInventoryProduct) => {
                  const product = Array.isArray(variant.products)
                    ? variant.products[0]
                    : variant.products;

                  if (!product) return null;

                  return (
                    <ProductCard
                      key={variant.id}
                      product={product as Product}
                      lowestPrice={variant.selling_price}
                      merchantId={merchant.id}
                      merchantName={merchant.name}
                    />
                  );
                },
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center justify-center rounded-xl h-12 w-12 border-2 border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 cursor-pointer"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="font-bold text-gray-700">
                  {t("common.page")} {page} {t("common.of")} {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center justify-center rounded-xl h-12 w-12 border-2 border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 cursor-pointer"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
