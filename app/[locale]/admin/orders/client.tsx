"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import useSWR, { mutate } from "swr";
import {
  getAdminOrdersAction,
  getAdminOrderDetailAction,
  adminUpdateOrderStatusAction,
} from "@/app/actions/admin";
import {
  ShoppingBag,
  Search,
  Calendar,
  Eye,
  Activity,
  User,
  Store,
  MapPin,
  Phone,
  Mail,
  Receipt,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
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
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import OrderStatusBadge from "@/components/merchant/OrderStatusBadge";
import { cn } from "@/lib/utils";
import Image from "next/image";

type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

interface OrderItem {
  id: string;
  quantity: number;
  price_per_unit: number;
  subtotal: number;
  product_name?: string;
  product_sku?: string;
  product_image_url?: string;
  variant_id?: string | null;
  variant_details?: Record<string, string> | null;
  products?: {
    name: string;
    image_url: string;
    sku?: string;
  };
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  subtotal_amount: number;
  tax_amount: number;
  cod_fee: number;
  commission_amount: number;
  profit_amount: number;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    phone?: string;
  };
  merchant_profiles: {
    business_name: string;
    email?: { email: string };
  };
  shipping_address: {
    fullName: string;
    address: string;
    city: string;
    zipCode: string;
  };
  order_items: OrderItem[];
}

export type OrdersResponse =
  | {
      orders: Order[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      error?: undefined;
    }
  | {
      error: string;
      orders?: undefined;
      total?: undefined;
      page?: undefined;
      limit?: undefined;
      totalPages?: undefined;
    };

interface OrdersClientProps {
  initialOrders: OrdersResponse;
}

export default function OrdersClient({ initialOrders }: OrdersClientProps) {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusToConfirm, setStatusToConfirm] = useState<string | null>(null);

  const { data, isLoading } = useSWR(
    ["admin_orders", page, status, search],
    () => getAdminOrdersAction({ page, limit: 10, status, search }),
    { fallbackData: initialOrders, revalidateOnFocus: false },
  );

  const { data: orderDetailData, isLoading: isLoadingDetail } = useSWR(
    selectedOrderId ? ["admin_order_detail", selectedOrderId] : null,
    () => getAdminOrderDetailAction(selectedOrderId!),
    { revalidateOnFocus: false },
  );

  const orders: Order[] =
    data && "orders" in data && data.orders ? (data.orders as Order[]) : [];
  const totalPages: number =
    data && "totalPages" in data && typeof data.totalPages === "number"
      ? data.totalPages
      : 0;
  const order: Order | null =
    orderDetailData && "order" in orderDetailData && orderDetailData.order
      ? (orderDetailData.order as Order)
      : null;

  const handleUpdateStatus = (newStatus: string) => {
    if (newStatus === "delivered" || newStatus === "cancelled") {
      setStatusToConfirm(newStatus);
    } else {
      executeUpdate(newStatus);
    }
  };

  const executeUpdate = async (newStatus: string) => {
    if (!selectedOrderId) return;
    try {
      setIsUpdating(true);
      const res = await adminUpdateOrderStatusAction(
        selectedOrderId,
        newStatus,
      );
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(t("admin.orderStatusUpdated") || "Order status updated");
        mutate(["admin_orders", page, status, search]);
        mutate(["admin_order_detail", selectedOrderId]);
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
      setStatusToConfirm(null);
    }
  };

  return (
    <main className="space-y-8 pb-20">
      <AlertDialog
        open={!!statusToConfirm}
        onOpenChange={(open) => !open && setStatusToConfirm(null)}
      >
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.areYouSure")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.statusChangeWarning")} <strong>{statusToConfirm}</strong> {t("admin.statusChangeWarning2")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => statusToConfirm && executeUpdate(statusToConfirm)}
              className={
                statusToConfirm === "cancelled"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-primary text-primary-foreground"
              }
            >
              {t("admin.yesProceed")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">
            {t("admin.orders") || "Orders"}
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            {t("admin.manageOrdersDesc") ||
              "Manage and track all platform orders"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card p-6 rounded-[2rem] border border-border shadow-sm">
        <div className="relative col-span-2">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <Input
            placeholder={
              t("admin.searchOrders") || "Search by ID or Tracking..."
            }
            className="pl-12 h-14 rounded-2xl bg-muted/50 border-transparent focus:bg-background transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-14! rounded-2xl bg-muted/50 border-transparent">
            <SelectValue
              placeholder={t("admin.allStatuses") || "All Statuses"}
            />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="all">{t("merchant.allOrders")}</SelectItem>
            <SelectItem value="pending">{t("merchant.pending")}</SelectItem>
            <SelectItem value="processing">
              {t("merchant.processing")}
            </SelectItem>
            <SelectItem value="shipped">{t("merchant.shipped")}</SelectItem>
            <SelectItem value="delivered">{t("merchant.delivered")}</SelectItem>
            <SelectItem value="cancelled">{t("merchant.cancelled")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-card rounded-[3rem] border-2 border-dashed border-border py-24 text-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground/30">
            <ShoppingBag size={48} />
          </div>
          <h3 className="text-2xl font-black">{t("common.noOrdersFound")}</h3>
          <p className="text-muted-foreground mt-2">
            {t("common.adjustFilters")}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {t("order.orderNumber")}
                    </th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {t("admin.merchant")}
                    </th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {t("admin.customer")}
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
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      className="group hover:bg-muted/30 transition-all"
                    >
                      <td className="px-8 py-6">
                        <span className="font-black text-foreground tracking-tighter">
                          #{o.order_number || o.id.slice(0, 8).toUpperCase()}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          <Calendar size={12} />
                          {new Date(o.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <Store size={14} className="text-primary" />
                          <span className="font-bold">
                            {o.merchant_profiles?.business_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-bold">
                            {o.profiles?.full_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {o.profiles?.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-black text-lg">
                        ${Number(o.total_amount).toLocaleString()}
                      </td>
                      <td className="px-8 py-6">
                        <OrderStatusBadge status={o.status as OrderStatus} />
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-center">
                          <Button
                            variant="ghost"
                            className="rounded-xl h-11 px-4 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground font-black text-[10px] uppercase tracking-widest gap-2"
                            onClick={() => setSelectedOrderId(o.id)}
                          >
                            <Eye size={18} />
                            {t("common.view")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="bg-muted px-4 py-2 rounded-xl text-sm font-bold">
                {page} / {totalPages}
              </div>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog
        open={!!selectedOrderId}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
      >
        <DialogContent className="max-w-4xl rounded-[2rem] p-0 overflow-hidden text-left">
          <div className="max-h-[90vh] overflow-y-auto">
            {isLoadingDetail ? (
              <div className="flex justify-center py-24">
                <LoadingSpinner />
              </div>
            ) : !order ? (
              <div className="py-24 text-center">{t("common.orderNotFound")}</div>
            ) : (
              <div className="p-8 space-y-8">
                <DialogHeader className="flex flex-row items-center justify-between gap-4 text-left">
                  <div className="space-y-1">
                    <DialogTitle className="text-3xl font-black">
                      #
                      {order.order_number || order.id.slice(0, 8).toUpperCase()}
                    </DialogTitle>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground font-medium">
                        {new Date(order.created_at).toLocaleString()}
                      </span>
                      <OrderStatusBadge status={order.status as OrderStatus} />
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Status Update */}
                  <div className="md:col-span-3 bg-muted/30 p-6 rounded-[1.5rem] border border-border space-y-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <h3 className="font-black flex items-center gap-2 uppercase text-xs tracking-widest">
                        <Activity size={16} className="text-primary" />
                        Update Order Status
                      </h3>
                      {(order.status === "delivered" ||
                        order.status === "cancelled") && (
                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Status is final and cannot be changed.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "pending",
                        "processing",
                        "shipped",
                        "delivered",
                        "cancelled",
                      ].map((s) => (
                        <Button
                          key={s}
                          variant={order.status === s ? "default" : "outline"}
                          className={cn(
                            "rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest",
                            order.status === s
                              ? "shadow-lg shadow-primary/20 scale-105"
                              : "",
                          )}
                          onClick={() => handleUpdateStatus(s)}
                          disabled={
                            isUpdating ||
                            order.status === "delivered" ||
                            order.status === "cancelled"
                          }
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-card p-6 rounded-[1.5rem] border border-border space-y-4">
                    <h3 className="font-black flex items-center gap-2 uppercase text-xs tracking-widest">
                      <User size={16} className="text-primary" />
                      Customer
                    </h3>
                    <div className="space-y-2">
                      <p className="font-bold">{order.profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail size={14} /> {order.profiles?.email}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone size={14} /> {order.profiles?.phone || "--"}
                      </p>
                    </div>
                  </div>

                  {/* Merchant Info */}
                  <div className="bg-card p-6 rounded-[1.5rem] border border-border space-y-4">
                    <h3 className="font-black flex items-center gap-2 uppercase text-xs tracking-widest">
                      <Store size={16} className="text-primary" />
                      Merchant
                    </h3>
                    <div className="space-y-2">
                      <p className="font-bold">
                        {order.merchant_profiles?.business_name}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail size={14} />{" "}
                        {order.merchant_profiles?.email?.email || "--"}
                      </p>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="bg-card p-6 rounded-[1.5rem] border border-border space-y-4">
                    <h3 className="font-black flex items-center gap-2 uppercase text-xs tracking-widest">
                      <MapPin size={16} className="text-primary" />
                      Shipping
                    </h3>
                    <div className="text-sm space-y-1">
                      <p className="font-bold">
                        {order.shipping_address?.fullName}
                      </p>
                      <p>{order.shipping_address?.address}</p>
                      <p>
                        {order.shipping_address?.city},{" "}
                        {order.shipping_address?.zipCode}
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="md:col-span-2 bg-card rounded-[1.5rem] border border-border p-6 space-y-4">
                    <h3 className="font-black flex items-center gap-2 uppercase text-xs tracking-widest">
                      <Package size={16} className="text-primary" />
                      Order Items
                    </h3>
                    <div className="space-y-3">
                      {order.order_items?.map((item: OrderItem) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border"
                        >
                          <div className="flex items-center gap-4">
                            <div className="relative w-12 h-12 bg-white rounded-lg border border-border p-1 overflow-hidden">
                              {item.products?.image_url && (
                                <Image
                                  src={item.products.image_url}
                                  alt=""
                                  fill
                                  className="object-contain"
                                />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-sm">
                                {item.products?.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                                SKU: {item.products?.sku || "--"} | Qty:{" "}
                                {item.quantity}
                              </p>
                              {item.variant_details && (
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                                  {item.variant_details.color && (
                                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                                      {t("common.color") || "Color"}:{" "}
                                      {item.variant_details.color}
                                    </span>
                                  )}
                                  {item.variant_details.size && (
                                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                                      {t("common.size") || "Size"}:{" "}
                                      {item.variant_details.size}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="font-black">
                            ${Number(item.subtotal).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-card rounded-[1.5rem] border border-border p-6 space-y-4">
                    <h3 className="font-black flex items-center gap-2 uppercase text-xs tracking-widest">
                      <Receipt size={16} className="text-primary" />
                      Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("order.subtotal")}</span>
                        <span className="font-bold">
                          ${Number(order.subtotal_amount).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("order.tax")}</span>
                        <span className="font-bold">
                          ${Number(order.tax_amount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("order.codFee")}</span>
                        <span className="font-bold">
                          ${Number(order.cod_fee || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-border pt-3">
                        <span className="text-foreground font-black">
                          {t("order.total")}
                        </span>
                        <span className="text-primary font-black text-xl">
                          ${Number(order.total_amount).toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-orange-500/5 p-4 rounded-xl border border-orange-500/10 space-y-2 mt-4">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-orange-600">{t("order.commission")}</span>
                          <span className="text-orange-600">
                            ${Number(order.commission_amount).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-green-600">
                            {t("order.profit")}
                          </span>
                          <span className="text-green-600">
                            ${Number(order.profit_amount).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    className="rounded-xl h-12 px-8 font-black gap-2"
                    onClick={() => setSelectedOrderId(null)}
                  >
                    {t("common.close")}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
