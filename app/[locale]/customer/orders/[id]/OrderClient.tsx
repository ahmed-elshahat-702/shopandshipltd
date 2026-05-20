"use client";

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Download, Loader2, Package } from "lucide-react";
import useSWR from "swr";
import { getOrderDetailsAction } from "@/app/actions/orders";
import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";

export default function OrderClient() {
  const t = useTranslations();
  const params = useParams();
  const orderId = params.id as string;
  const supabase = createClient();

  const { data, error, isLoading, mutate } = useSWR(
    orderId ? `order-${orderId}` : null,
    () => getOrderDetailsAction(orderId),
    {
      revalidateOnFocus: false,
    }
  );

  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-detail-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        () => {
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, mutate, orderId]);

  const handleDownloadInvoice = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (error || (data && "error" in data)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">
        {error?.message || (data as { error: string }).error}
      </div>
    );
  }

  const order = data?.order as {
    id: string;
    order_number: string;
    created_at: string;
    status: string;
    total_amount: number;
    subtotal_amount: number;
    tax_amount: number;
    shipping_cost: number;
    cod_fee: number;
    tracking_number: string | null;
    shipping_address: {
      fullName: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
      phone?: string;
    };
    merchant_profiles: {
      business_name: string;
    };
    order_items: {
      id: string;
      products: { id: string; name: string; image_url: string };
      price_per_unit: number;
      quantity: number;
      subtotal: number;
      variant_id?: string | null;
      variant_details?: Record<string, string> | null;
    }[];
  };

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">
        {t("order.notFound") || "Order not found"}
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "text-green-600";
      case "processing":
        return "text-blue-600";
      case "pending":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  const shippingAddress = order.shipping_address;

  return (
    <main className="min-h-screen bg-gray-50 py-8 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto px-4 print:px-0">
        {/* Back Button */}
        <Link
          href="/customer/orders"
          className="group flex items-center gap-2 text-primary hover:text-primary/80 mb-8 font-bold transition-all print:hidden"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:-translate-x-1 transition-transform">
            <ArrowLeft size={18} />
          </div>
          {t("common.back")}
        </Link>

        {/* Invoice Printable Header (Only visible on print) */}
        <div className="hidden print:flex justify-between items-start mb-12 border-b-4 border-primary pb-8">
          <div>
            <h1 className="text-4xl font-black text-primary mb-2">{t("common.appName")}</h1>
            <p className="text-muted-foreground font-bold">Official Invoice</p>
          </div>
          <div className="text-right space-y-1">
            <p className="font-black text-xl">{order.order_number}</p>
            <p className="text-sm font-bold text-muted-foreground">
              {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="space-y-6 print:space-y-8">
          {/* Order Header */}
          <div className="bg-white rounded-[2.5rem] shadow-sm p-8 border-2 border-transparent print:shadow-none print:p-0">
            <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 print:text-xs">
                  {t("order.orderNumber")}
                </p>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
                  {order.order_number}
                </h1>
                <p className="text-muted-foreground font-medium mt-2">
                  {new Date(order.created_at).toLocaleDateString()} at{" "}
                  {new Date(order.created_at).toLocaleTimeString()}
                </p>
              </div>
              <button 
                onClick={handleDownloadInvoice}
                className="flex items-center gap-2 bg-primary/10 text-primary px-6 py-3 rounded-2xl font-black hover:bg-primary/20 transition-all print:hidden"
              >
                <Download size={20} />
                {t("common.download")}
              </button>
            </div>

            <div
              className={`inline-flex items-center gap-2 px-6 py-2 rounded-full font-black uppercase tracking-widest text-xs border ${getStatusColor(order.status)} bg-opacity-10 print:border-2`}
            >
              {t(`order.${order.status}`)}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-[2.5rem] shadow-sm p-8 print:shadow-none print:p-0 print:border-0">
            <h2 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3 print:mb-4">
              <div className="w-2 h-8 bg-primary rounded-full print:hidden" />
              {t("order.items")}
            </h2>

            <div className="space-y-6">
              {order.order_items?.map((item: {
                id: string;
                products: { id: string; name: string; image_url: string };
                price_per_unit: number;
                quantity: number;
                subtotal: number;
                variant_id?: string | null;
                variant_details?: Record<string, string> | null;
              }) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 last:border-0 last:pb-0 gap-4"
                >
                  <div className="flex items-center gap-4">
                    <Link href={`/products/${item.products?.id}`} className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100 hover:opacity-80 transition-opacity print:w-16 print:h-16">
                      {item.products?.image_url ? (
                        <Image
                          src={item.products.image_url}
                          alt={item.products.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Package size={32} />
                        </div>
                      )}
                    </Link>
                    <div className="space-y-1">
                      <Link href={`/products/${item.products?.id}`} className="font-black text-gray-900 text-lg hover:text-primary transition-colors print:text-base line-clamp-1 block">
                        {item.products?.name}
                      </Link>
                      <p className="text-xs font-bold text-muted-foreground bg-muted inline-block px-2 py-1 rounded-md print:bg-transparent print:p-0">
                        {t("common.merchant")}: {order.merchant_profiles?.business_name}
                      </p>
                      {item.variant_details && (
                        <div className="flex flex-wrap items-center gap-1.5 print:gap-2">
                          {item.variant_details.color && (
                            <span className="px-2 py-1 rounded-md bg-primary/10 text-[10px] font-black text-primary uppercase print:bg-transparent print:p-0 print:text-gray-700">
                              {t("common.color") || "Color"}: {item.variant_details.color}
                            </span>
                          )}
                          {item.variant_details.size && (
                            <span className="px-2 py-1 rounded-md bg-primary/10 text-[10px] font-black text-primary uppercase print:bg-transparent print:p-0 print:text-gray-700">
                              {t("common.size") || "Size"}: {item.variant_details.size}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-bold text-muted-foreground print:text-xs">
                      ${Number(item.price_per_unit).toFixed(2)} × {item.quantity}
                    </p>
                    <p className="text-2xl font-black text-primary print:text-lg">
                      ${Number(item.subtotal).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Details & Shipping Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Order Summary */}
            <div className="bg-white rounded-[2.5rem] shadow-sm p-8">
              <h2 className="text-xl font-black text-gray-900 mb-6">
                {t("order.details")}
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between font-bold text-muted-foreground">
                  <span>{t("order.subtotal")}</span>
                  <span>${Number(order.subtotal_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-muted-foreground">
                  <span>{t("order.tax")}</span>
                  <span>${Number(order.tax_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-muted-foreground">
                  <span>{t("order.shipping")}</span>
                  <span className={order.shipping_cost === 0 ? "text-green-600" : ""}>
                    {Number(order.shipping_cost) === 0
                      ? t("common.free")
                      : `$${Number(order.shipping_cost).toFixed(2)}`}
                  </span>
                </div>
                {order.cod_fee > 0 && (
                  <div className="flex justify-between font-bold text-orange-600">
                    <span>{t("order.codFee") || "COD Fee"}</span>
                    <span>+${Number(order.cod_fee).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t-2 border-dashed pt-6 mt-6">
                  <div className="flex justify-between text-2xl font-black text-gray-900 tracking-tighter">
                    <span>{t("order.total")}</span>
                    <span className="text-primary">
                      ${Number(order.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Side Info */}
            <div className="space-y-6">
              {/* Shipping Address */}
              <div className="bg-white rounded-[2.5rem] shadow-sm p-8 border-2 border-primary/5">
                <h3 className="text-lg font-black text-gray-900 mb-4">
                  {t("order.shippingAddress")}
                </h3>
                <div className="space-y-1 text-muted-foreground font-bold italic">
                  <p className="text-gray-900 not-italic">
                    {shippingAddress?.fullName}
                  </p>
                  <p>{shippingAddress?.address}</p>
                  <p>
                    {shippingAddress?.city}, {shippingAddress?.state}{" "}
                    {shippingAddress?.zipCode}
                  </p>
                  <p>{shippingAddress?.country}</p>
                  {shippingAddress?.phone && <p>{shippingAddress.phone}</p>}
                </div>
              </div>

              {/* Tracking */}
              {order.tracking_number && (
                <div className="bg-linear-to-br from-primary to-primary/90 text-white rounded-[2.5rem] shadow-xl shadow-primary/20 p-8">
                  <h3 className="text-lg font-black mb-4 opacity-90">
                    {t("order.trackingNumber")}
                  </h3>
                  <p className="font-black text-2xl tracking-widest bg-white/20 p-4 rounded-2xl block text-center border-2 border-white/30 truncate">
                    {order.tracking_number}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
