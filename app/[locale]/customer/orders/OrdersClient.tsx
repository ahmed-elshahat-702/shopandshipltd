"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Clock, CheckCircle, Truck, Package, Loader2, ChevronRight } from "lucide-react";
import useSWR from "swr";
import { getCustomerOrdersAction } from "@/app/actions/orders";
import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";

export default function OrdersClient() {
  const t = useTranslations();
  const supabase = createClient();

  const { data, error, isLoading, mutate } = useSWR(
    "customer-orders",
    getCustomerOrdersAction,
    {
      revalidateOnFocus: false,
    }
  );

  useEffect(() => {
    const channel = supabase
      .channel("customer-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, mutate]);

  const orders = data?.orders || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="text-green-600" size={20} />;
      case "processing":
        return <Truck className="text-blue-600" size={20} />;
      case "pending":
        return <Clock className="text-yellow-600" size={20} />;
      default:
        return <Package className="text-gray-600" size={20} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "delivered":
        return t("order.delivered");
      case "processing":
        return t("order.processing");
      case "pending":
        return t("order.pending");
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-50 text-green-700 border-green-200";
      case "processing":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
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

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("customer.myOrders")}
          </h1>
          <p className="text-gray-600">
            {orders.length}{" "}
            {orders.length === 1 ? t("cart.item") : t("cart.items")}
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg mb-6">
              {t("customer.noOrders")}
            </p>
            <Link
              href="/products"
              className="inline-block bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              {t("home.browseProducts")}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order: {
              id: string;
              order_number: string;
              created_at: string;
              status: string;
              total_amount: number;
              order_items: {
                id: string;
                products: { id: string; name: string; image_url: string };
                quantity: number;
                price_per_unit: number;
                subtotal: number;
                variant_id?: string | null;
                variant_details?: Record<string, string> | null;
              }[];
            }) => (
              <div key={order.id} className="bg-white rounded-[2rem] shadow-sm border border-transparent overflow-hidden group">
                {/* Order Summary Header */}
                <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                        {t("order.orderNumber")}
                      </p>
                      <p className="font-bold text-gray-900">
                        {order.order_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                        {t("order.date")}
                      </p>
                      <p className="font-bold text-gray-900">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                        {t("order.status")}
                      </p>
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border transition-colors ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="text-xs font-black uppercase tracking-wider">
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                    </div>
                    <div className="md:text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                        {t("order.total")}
                      </p>
                      <p className="text-xl font-black text-primary">
                        ${Number(order.total_amount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Items List */}
                <div className="p-6 space-y-4">
                  {order.order_items?.map((item: {
                    id: string;
                    products: { id: string; name: string; image_url: string };
                    quantity: number;
                    price_per_unit: number;
                    subtotal: number;
                    variant_id?: string | null;
                    variant_details?: Record<string, string> | null;
                  }) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <Link href={`/products/${item.products?.id}`} className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 hover:opacity-80 transition-opacity">
                        {item.products?.image_url ? (
                          <Image
                            src={item.products.image_url}
                            alt={item.products.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package size={24} />
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/products/${item.products?.id}`} className="font-bold text-gray-900 truncate hover:text-primary transition-colors block">
                          {item.products?.name}
                        </Link>
                        {item.variant_details && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {item.variant_details.color && (
                              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-black text-gray-500 uppercase">
                                {t("common.color") || "Color"}: {item.variant_details.color}
                              </span>
                            )}
                            {item.variant_details.size && (
                              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-black text-gray-500 uppercase">
                                {t("common.size") || "Size"}: {item.variant_details.size}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground font-medium">
                          {item.quantity} × ${Number(item.price_per_unit).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right font-black text-gray-900">
                        ${Number(item.subtotal).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* View Details Footer */}
                <div className="px-6 py-4 bg-gray-50/50 flex justify-end">
                  <Link 
                    href={`/customer/orders/${order.id}`}
                    className="flex items-center gap-2 text-primary font-bold text-sm hover:gap-3 transition-all"
                  >
                    {t("order.viewDetails") || "View Full Details"}
                    <ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
