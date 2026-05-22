"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import useSWR, { mutate } from "swr";
import { useState, useEffect } from "react";
import {
  ShoppingBag,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Activity,
  Receipt,
  Package,
  MapPin,
  Phone,
  Mail,
  Hash,
  Eye,
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import OrderStatusBadge from "@/components/merchant/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { SearchInput } from "./SearchInput";
import {
  getOrderDetailsForMerchantAction,
  getMerchantDetailsByMerchantIdAction,
  getMerchantWalletAction,
  getOrdersForMerchantAction,
  shipOrderAction,
  updateOrderStatusAction,
} from "@/app/actions/merchant";
import type { MerchantOrderDetails } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  items_count?: number;
  commission_amount: number;
}

interface OrderListProps {
  merchantId: string;
}

function OrderCountdown({
  createdAt,
  status,
}: {
  createdAt: string;
  status: string;
}) {
  const t = useTranslations();
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (status !== "pending") return;

    const deadline = new Date(createdAt).getTime() + 48 * 60 * 60 * 1000;

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = deadline - now;
      setTimeLeft(Math.max(0, diff));
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [createdAt, status]);

  if (status !== "pending") return null;

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const isExpired = timeLeft <= 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider",
        isExpired
          ? "bg-destructive/10 text-destructive"
          : "bg-orange-500/10 text-orange-600",
      )}
    >
      <Clock size={12} strokeWidth={3} />
      {isExpired
        ? t("merchant.deadlineExpired") || "Deadline Expired"
        : `${hours}h ${minutes}m ${seconds}s`}
    </div>
  );
}

export function OrderList({ merchantId }: OrderListProps) {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [orderToAccept, setOrderToAccept] = useState<string | null>(null);

  const { data, isLoading } = useSWR(
    ["merchant_orders", merchantId, statusFilter, search],
    () =>
      getOrdersForMerchantAction(merchantId, {
        limit: 50,
        status: statusFilter === "all" ? null : statusFilter,
        search: search || undefined,
      }),
    { revalidateOnFocus: false, refreshInterval: 60000 },
  );

  const orders = data?.orders || [];
  const orderBeingAccepted = orders.find((o: Order) => o.id === orderToAccept);

  const { data: merchantData } = useSWR(
    merchantId ? ["merchant_details", merchantId] : null,
    () => getMerchantDetailsByMerchantIdAction(merchantId),
    { revalidateOnFocus: false },
  );

  const merchantUserId =
    merchantData && "merchant" in merchantData
      ? merchantData?.merchant?.user_id
      : null;

  const { data: walletData, isLoading: isWalletLoading } = useSWR(
    merchantUserId ? ["merchant_wallet", merchantUserId] : null,
    () => getMerchantWalletAction(merchantUserId!),
    { revalidateOnFocus: false },
  );

  const isWalletLocked = Boolean(
    walletData && !("error" in walletData) && walletData.wallet?.is_locked,
  );

  useEffect(() => {
    if (!merchantId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`merchant-orders-${merchantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `merchant_id=eq.${merchantId}`,
        },
        () => {
          mutate(["merchant_orders", merchantId, statusFilter, search]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [merchantId, statusFilter, search]);

  const { data: orderDetailsData, isLoading: isOrderDetailsLoading } = useSWR(
    merchantId && selectedOrderId
      ? ["merchant_order_details", merchantId, selectedOrderId]
      : null,
    () => getOrderDetailsForMerchantAction(merchantId, selectedOrderId!),
    { revalidateOnFocus: false },
  );

  const handleShipOrder = (orderId: string) => {
    if (isWalletLocked) {
      toast.error(t("wallet.lockedByAdmin"));
      return;
    }
    setOrderToAccept(orderId);
  };

  const handleShipConfirm = async () => {
    if (!orderToAccept) return;
    if (isWalletLocked) {
      toast.error(t("wallet.lockedByAdmin"));
      return;
    }
    try {
      setIsProcessing(orderToAccept);
      const res = await shipOrderAction(merchantId, orderToAccept);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(
          t("merchant.orderShipped") || "Order marked as processing",
        );
        mutate(["merchant_orders", merchantId, statusFilter, search]);
      }
    } catch (error) {
      toast.error("Failed to ship order");
      console.error(error);
    } finally {
      setIsProcessing(null);
      setOrderToAccept(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      setIsProcessing(orderId);
      const res = await updateOrderStatusAction(
        merchantId,
        orderId,
        "cancelled",
      );
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(t("merchant.orderCancelled") || "Order cancelled");
        mutate(["merchant_orders", merchantId, statusFilter, search]);
      }
    } catch (error) {
      toast.error("Failed to cancel order");
      console.error(error);
    } finally {
      setIsProcessing(null);
    }
  };

  const selectedOrder =
    orderDetailsData && "order" in orderDetailsData
      ? (orderDetailsData.order as MerchantOrderDetails)
      : null;
  const shippingAddress = selectedOrder?.shipping_address;

  const statuses = [
    { id: "all", label: t("merchant.allOrders"), icon: Receipt },
    { id: "pending", label: t("merchant.pending"), icon: Clock },
    { id: "processing", label: t("merchant.processing"), icon: Activity },
    { id: "shipped", label: t("merchant.shipped"), icon: Truck },
    { id: "delivered", label: t("merchant.delivered"), icon: CheckCircle2 },
    { id: "cancelled", label: t("merchant.cancelled"), icon: XCircle },
  ];

  return (
    <div className="space-y-10 overflow-x-hidden">
      <AlertDialog
        open={!!orderToAccept}
        onOpenChange={(open) => !open && setOrderToAccept(null)}
      >
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("merchant.acceptOrder") || "Accept Order"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isWalletLocked
                ? t("wallet.lockedByAdmin")
                : t("merchant.commissionAlert", {
                    amount: orderBeingAccepted?.commission_amount || 0,
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common.cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleShipConfirm}
              className="bg-primary text-primary-foreground"
              disabled={isWalletLoading || isWalletLocked}
            >
              {isProcessing === orderToAccept
                ? t("merchant.processing") || "Processing..."
                : t("merchant.acceptAndShip") || "Accept & Ship"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!selectedOrderId}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
      >
        <DialogContent className=" rounded-[2rem] p-0 overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto">
            {isOrderDetailsLoading ? (
              <div className="flex justify-center py-20">
                <LoadingSpinner />
              </div>
            ) : !selectedOrder ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground font-medium">
                  {t("messages.noResults")}
                </p>
              </div>
            ) : (
              <>
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-3xl font-black tracking-tight">
                    #
                    {(
                      selectedOrder.order_number || selectedOrder.id.slice(0, 8)
                    ).toUpperCase()}
                  </DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-3 text-sm font-medium">
                    <span>
                      {new Date(selectedOrder.created_at).toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </span>
                    <OrderStatusBadge status={selectedOrder.status} />
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {t("order.total")}
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      ${selectedOrder.total_amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {t("order.items")}
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {selectedOrder.items.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {t("order.tax")}
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      ${Number(selectedOrder.tax_amount || 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      COD Fee
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      ${Number(selectedOrder.cod_fee || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="rounded-[1.5rem] border border-border p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Package size={18} className="text-primary" />
                      <h3 className="font-black text-lg">
                        {t("order.itemsLabel")}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl bg-muted/30 border border-border p-4 flex items-center gap-4 transition-all hover:bg-muted/50"
                        >
                          <div className="h-16 w-16 rounded-xl bg-background border border-border overflow-hidden shrink-0 flex items-center justify-center shadow-sm relative">
                            {item.products?.image_url ? (
                              <Image
                                src={item.products.image_url}
                                alt={item.products.name}
                                fill
                                className="object-cover transition-transform hover:scale-110"
                              />
                            ) : (
                              <Package
                                className="text-muted-foreground/30"
                                size={24}
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-black text-foreground truncate">
                                {item.products?.name || "Product"}
                              </p>
                              <p className="font-black text-foreground shrink-0">
                                ${item.subtotal.toLocaleString()}
                              </p>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              <span className="bg-muted px-2 py-0.5 rounded-md">
                                {t("order.qty")}: {item.quantity}
                              </span>
                              <span className="bg-muted px-2 py-0.5 rounded-md">
                                {t("order.unit")}: $
                                {item.price_per_unit.toLocaleString()}
                              </span>
                              {item.variant_details?.color ? (
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                                  {t("common.color") || "Color"}:{" "}
                                  {item.variant_details.color}
                                </span>
                              ) : null}
                              {item.variant_details?.size ? (
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                                  {t("common.size") || "Size"}:{" "}
                                  {item.variant_details.size}
                                </span>
                              ) : null}
                              {item.products?.sku ? (
                                <span className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md">
                                  <Hash size={10} />
                                  {item.products.sku}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-[1.5rem] border border-border p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-primary" />
                        <h3 className="font-black text-lg">
                          {t("order.shippingAddress")}
                        </h3>
                      </div>
                      {shippingAddress ? (
                        <div className="space-y-2 text-sm font-medium text-muted-foreground">
                          {shippingAddress.fullName ? (
                            <p className="font-black text-foreground">
                              {shippingAddress.fullName}
                            </p>
                          ) : null}
                          {shippingAddress.address ? (
                            <p>{shippingAddress.address}</p>
                          ) : null}
                          <p>
                            {[shippingAddress.city, shippingAddress.zipCode]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                          {shippingAddress.phone ? (
                            <p className="inline-flex items-center gap-2">
                              <Phone size={14} className="text-primary" />
                              {shippingAddress.phone}
                            </p>
                          ) : null}
                          {shippingAddress.email ? (
                            <p className="inline-flex items-center gap-2">
                              <Mail size={14} className="text-primary" />
                              {shippingAddress.email}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t("order.noShippingAddress")}
                        </p>
                      )}
                    </div>

                    <div className="rounded-[1.5rem] border border-border p-5 space-y-3">
                      <h3 className="font-black text-lg">
                        {t("order.summary")}
                      </h3>
                      <div className="space-y-2 text-sm font-medium text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>{t("order.trackingNumber")}</span>
                          <span className="font-black text-foreground">
                            {selectedOrder.tracking_number || "--"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{t("order.commission")}</span>
                          <span className="font-black text-foreground">
                            ${selectedOrder.commission_amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{t("order.profit")}</span>
                          <span className="font-black text-foreground">
                            ${selectedOrder.profit_amount.toLocaleString()}
                          </span>
                        </div>
                        {selectedOrder.notes ? (
                          <div className="pt-2">
                            <p className="text-[10px] font-black uppercase tracking-widest">
                              {t("order.notes")}
                            </p>
                            <p className="mt-1 text-foreground">
                              {selectedOrder.notes}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter showCloseButton />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Search & Filters */}
      <div className="flex-1 w-full lg:w-auto">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("merchant.searchByOrderNumberTrackingOrCustomer")}
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto no-scrollbar pb-1 flex-wrap lg:flex-nowrap">
        {statuses.map((status) => (
          <button
            key={status.id}
            onClick={() => setStatusFilter(status.id)}
            className={cn(
              "flex items-center gap-2 px-4 md:px-6 h-10 md:h-14 cursor-pointer rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap border-2",
              statusFilter === status.id
                ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                : "bg-card border-border text-muted-foreground hover:border-primary/50",
            )}
          >
            {status.label}
          </button>
        ))}
      </div>

      {/* Orders Content */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-32 bg-card rounded-[3rem] border-2 border-dashed border-border flex flex-col items-center">
          <div className="w-28 h-28 bg-muted rounded-full flex items-center justify-center mb-8 text-muted-foreground/20">
            <ShoppingBag size={56} />
          </div>
          <h2 className="text-3xl font-black text-foreground mb-2">
            {t("merchant.noOrdersYet")}
          </h2>
          <p className="text-muted-foreground font-medium text-lg max-w-sm mx-auto mb-10">
            {t("merchant.noOrdersDesc")}
          </p>
          <Link href="/merchant/products">
            <Button className="rounded-2xl h-14 px-10 font-black shadow-xl shadow-primary/20 gap-3 hover:scale-105 transition-all">
              {t("merchant.browseCatalogue")}
              <ArrowRight size={20} strokeWidth={2.5} />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-card rounded-[2.5rem] border border-border shadow-sm overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t("order.orderNumber")}
                  </th>
                  <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t("customer.orderDate")}
                  </th>
                  <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t("order.items")}
                  </th>
                  <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t("order.total")}
                  </th>
                  <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t("order.status")}
                  </th>
                  <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground text-center">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order: Order) => {
                  const deadline =
                    new Date(order.created_at).getTime() + 48 * 60 * 60 * 1000;
                  const isExpired = deadline < new Date().getTime();

                  return (
                    <tr
                      key={order.id}
                      className="group hover:bg-muted/30 transition-all"
                    >
                      <td className="px-8 py-6 whitespace-nowrap">
                        <span className="font-black text-foreground tracking-tighter">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-muted-foreground font-medium whitespace-nowrap">
                          <Calendar size={14} className="opacity-50" />
                          {new Date(order.created_at).toLocaleDateString(
                            undefined,
                            { year: "numeric", month: "short", day: "numeric" },
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-muted-foreground font-medium whitespace-nowrap">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-black text-[10px] text-foreground">
                            {order.items_count || 1}
                          </div>
                          <span>{t("common.item")}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xl font-black text-foreground">
                          ${order.total_amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-2">
                          <OrderStatusBadge status={order.status} />
                          <OrderCountdown
                            createdAt={order.created_at}
                            status={order.status}
                          />
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-center gap-3">
                          {order.status === "pending" && (
                            <>
                              {!isExpired ? (
                                <Button
                                  className="rounded-xl h-11 px-4 bg-green-600 text-white hover:bg-green-700 group-hover:scale-105 transition-all shadow-sm font-black text-[10px] uppercase tracking-widest gap-2"
                                  onClick={() => handleShipOrder(order.id)}
                                  disabled={
                                    isProcessing === order.id ||
                                    isWalletLoading ||
                                    isWalletLocked
                                  }
                                >
                                  <Truck size={18} strokeWidth={2.5} />
                                  {t("merchant.ship") || "Ship"}
                                </Button>
                              ) : (
                                <div className="flex gap-2">
                                  <Button
                                    variant="destructive"
                                    className="rounded-xl h-11 px-4 group-hover:scale-105 transition-all shadow-sm font-black text-[10px] uppercase tracking-widest gap-2"
                                    onClick={() => handleCancelOrder(order.id)}
                                    disabled={isProcessing === order.id}
                                  >
                                    <XCircle size={18} strokeWidth={2.5} />
                                    {t("common.cancel")}
                                  </Button>
                                  <Link href="/merchant/customer-service">
                                    <Button
                                      variant="outline"
                                      className="rounded-xl h-11 px-4 group-hover:scale-105 transition-all shadow-sm font-black text-[10px] uppercase tracking-widest gap-2"
                                    >
                                      <Mail size={18} strokeWidth={2.5} />
                                      {t("merchant.contactSupport") ||
                                        "Support"}
                                    </Button>
                                  </Link>
                                </div>
                              )}
                            </>
                          )}
                          <Button
                            variant="ghost"
                            className="rounded-xl h-11 px-4 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground group-hover:scale-105 transition-all shadow-sm font-black text-[10px] uppercase tracking-widest gap-2"
                            onClick={() => setSelectedOrderId(order.id)}
                          >
                            <Eye size={18} strokeWidth={2.5} />
                            {t("common.view")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {orders.map((order: Order) => {
              const deadline =
                new Date(order.created_at).getTime() + 48 * 60 * 60 * 1000;
              const isExpired = deadline < new Date().getTime();

              return (
                <div
                  key={order.id}
                  className="bg-card rounded-[2rem] border border-border p-6 shadow-sm flex flex-col gap-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-foreground tracking-tighter text-lg">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <div className="flex flex-col items-end gap-2">
                      <OrderStatusBadge status={order.status} />
                      <OrderCountdown
                        createdAt={order.created_at}
                        status={order.status}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {t("customer.orderDate")}
                      </p>
                      <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                        <Calendar size={14} className="text-primary" />
                        {new Date(order.created_at).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" },
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {t("order.total")}
                      </p>
                      <span className="text-lg font-black text-foreground">
                        ${order.total_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-border w-full" />

                  <div className="flex flex-col gap-4">
                    {order.status === "pending" && (
                      <div className="flex flex-wrap gap-2">
                        {!isExpired ? (
                          <Button
                            className="flex-1 rounded-xl h-12 bg-green-600 text-white hover:bg-green-700 font-black text-[10px] uppercase tracking-widest gap-2"
                            onClick={() => handleShipOrder(order.id)}
                            disabled={
                              isProcessing === order.id ||
                              isWalletLoading ||
                              isWalletLocked
                            }
                          >
                            <Truck size={18} strokeWidth={2.5} />
                            {t("merchant.ship") || "Ship"}
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="destructive"
                              className="flex-1 rounded-xl h-12 font-black text-[10px] uppercase tracking-widest gap-2"
                              onClick={() => handleCancelOrder(order.id)}
                              disabled={isProcessing === order.id}
                            >
                              <XCircle size={18} strokeWidth={2.5} />
                              {t("common.cancel")}
                            </Button>
                            <Link href="/support" className="flex-1">
                              <Button
                                variant="outline"
                                className="w-full rounded-xl h-12 font-black text-[10px] uppercase tracking-widest gap-2"
                              >
                                <Mail size={18} strokeWidth={2.5} />
                                {t("merchant.contactSupport") || "Support"}
                              </Button>
                            </Link>
                          </>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground font-bold text-xs">
                        <ShoppingBag size={14} />
                        <span>
                          {order.items_count || 1} {t("common.items")}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        className="rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest gap-2 border-primary/20 text-primary"
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        {t("common.view")}
                        <Eye size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
