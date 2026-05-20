"use client";

import { useTranslations } from "next-intl";
import useSWR from "swr";
import {
  Package,
  ShoppingCart,
  Wallet,
  ArrowRight,
  Clock,
  Star,
  BarChart3,
  Calendar,
} from "lucide-react";
import AnalyticsCard from "@/components/merchant/AnalyticsCard";
import SalesChart from "@/components/merchant/SalesChart";
import OrderStatusBadge from "@/components/merchant/OrderStatusBadge";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMerchantDashboardAction } from "@/app/actions/merchant";
import { MerchantDashboardData } from "@/lib/types";

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
}

interface Product {
  id: string;
  name: string;
  stock: number;
  price: number;
}

interface MerchantStats {
  total_sales?: number;
  total_profit?: number;
  wallet_balance?: number;
  product_count?: number;
  order_count?: number;
  revenue_change?: number;
  orders_change?: number;
  products_change?: number;
  wallet_change?: number;
}

interface RevenueEntry {
  total_amount: number;
  created_at: string;
}

interface MerchantDashboardContentProps {
  initialData: MerchantDashboardData | { error: string };
  merchantId: string;
}

export default function MerchantDashboardContent({
  initialData,
  merchantId,
}: MerchantDashboardContentProps) {
  const t = useTranslations();

  const { data } = useSWR(
    ["merchant_dashboard", merchantId],
    () => getMerchantDashboardAction(merchantId),
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
      refreshInterval: 30000,
    },
  );

  if (data && "error" in data) {
    return (
      <div className="flex justify-center py-24 text-red-500 font-bold">
        {data.error}
      </div>
    );
  }

  const stats = (data && "stats" in data ? data.stats : {}) as MerchantStats;
  const recentOrders = (
    data && "recentOrders" in data ? data.recentOrders : []
  ) as Order[];
  const topProducts = (
    data && "topProducts" in data ? data.topProducts : []
  ) as Product[];
  const monthlyRevenue = (
    data && "monthlyRevenue" in data ? data.monthlyRevenue : []
  ) as RevenueEntry[];

  // Build chart data from real DB revenue entries
  const chartDataMap = new Map<string, { revenue: number; orders: number }>();
  for (const entry of monthlyRevenue) {
    const date = new Date(entry.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const existing = chartDataMap.get(date) || { revenue: 0, orders: 0 };
    chartDataMap.set(date, {
      revenue: existing.revenue + Number(entry.total_amount),
      orders: existing.orders + 1,
    });
  }
  const chartData =
    chartDataMap.size > 0
      ? Array.from(chartDataMap.entries()).map(([date, vals]) => ({
          date,
          ...vals,
        }))
      : [{ date: "–", revenue: 0, orders: 0 }];

  const totalRevenue = Number(stats?.total_sales ?? 0);
  const totalOrdersCount =
    Number(stats?.order_count ?? recentOrders.length);
  const totalProductsCount =
    Number(stats?.product_count ?? topProducts?.length ?? 0);

  return (
    <main className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 px-0 sm:px-4">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight">
              {t("merchant.dashboard")}
            </h1>
            <p className="text-muted-foreground font-medium text-lg">
              {t("merchant.dashboardDesc")}
            </p>
          </div>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnalyticsCard
            title={t("merchant.totalRevenue")}
            value={`$${totalRevenue.toLocaleString()}`}
            change={Number(stats?.revenue_change ?? 0)}
            icon={<BarChart3 size={24} className="text-primary" />}
            color="orange"
          />
          <AnalyticsCard
            title={t("merchant.totalOrders")}
            value={totalOrdersCount.toLocaleString()}
            change={Number(stats?.orders_change ?? 0)}
            icon={<ShoppingCart size={24} className="text-primary" />}
            color="orange"
          />
          <AnalyticsCard
            title={t("merchant.activeProducts")}
            value={totalProductsCount.toLocaleString()}
            change={Number(stats?.products_change ?? 0)}
            icon={<Package size={24} className="text-primary" />}
            color="orange"
          />
          <AnalyticsCard
            title={t("merchant.walletBalance")}
            value={`$${Number(stats?.wallet_balance ?? 0).toLocaleString()}`}
            change={Number(stats?.wallet_change ?? 0)}
            icon={<Wallet size={24} className="text-primary" />}
            color="orange"
          />
        </div>

        {/* Charts & Trends */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-card rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-8 border border-border shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-black text-foreground">
                  {t("merchant.salesPerformance")}
                </h2>
                <p className="text-sm text-muted-foreground font-medium">
                  {t("merchant.salesPerformanceDesc")}
                </p>
              </div>
              <Select defaultValue="30">
                <SelectTrigger className="w-40 bg-primary text-white border-none rounded-xl h-10 font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <SelectValue placeholder={t("merchant.timeframe")} />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border shadow-2xl">
                  <SelectItem
                    value="7"
                    className="font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-primary/5"
                  >
                    {t("merchant.last7Days")}
                  </SelectItem>
                  <SelectItem
                    value="30"
                    className="font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-primary/5"
                  >
                    {t("merchant.last30Days")}
                  </SelectItem>
                  <SelectItem
                    value="90"
                    className="font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-primary/5"
                  >
                    {t("merchant.last90Days")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="h-87.5 w-full">
              <SalesChart data={chartData} />
            </div>
          </div>

          <div className="bg-primary rounded-[2.5rem] p-8 text-primary-foreground relative overflow-hidden shadow-2xl shadow-primary/30">
            <div className="relative z-10 h-full flex flex-col">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                <Star size={28} fill="currentColor" />
              </div>
              <h2 className="text-3xl font-black mb-4 leading-tight">
                {t("merchant.proTips")}
              </h2>
              <p className="text-primary-foreground/80 font-medium mb-8">
                {t("merchant.proTipsDesc")}
              </p>
              <div className="mt-auto">
                <Link href="/merchant/products">
                  <Button className="w-full bg-white text-primary hover:bg-white/90 rounded-2xl h-14 font-black text-lg gap-2 shadow-xl">
                    {t("merchant.exploreCatalogue")}
                    <ArrowRight size={20} />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          </div>
        </div>

        {/* Global Summary Bar */}
        {/*<div className="bg-foreground text-background rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-black/10">
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 text-center sm:text-left">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">
                {t("merchant.weeklyVolume")}
              </p>
              <p className="text-3xl sm:text-4xl font-black tracking-tighter">
                ${totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-px bg-white/10 hidden sm:block" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">
                {t("merchant.totalOrders")}
              </p>
              <p className="text-3xl sm:text-4xl font-black tracking-tighter">
                {totalOrdersCount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white hover:text-black rounded-2xl h-12 sm:h-14 px-8 font-black uppercase tracking-widest text-xs"
            >
              {t("merchant.printReport")}
            </Button>
            <Button className="w-full sm:w-auto bg-primary text-white hover:scale-105 transition-all shadow-xl shadow-primary/20 rounded-2xl h-12 sm:h-14 px-10 font-black uppercase tracking-widest text-xs">
              {t("merchant.batchProcess")}
            </Button>
          </div>
        </div>*/}

        {/* Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-primary rounded-xl flex items-center justify-center shrink-0">
                  <Clock size={20} />
                </div>
                <h2 className="text-xl font-black text-foreground truncate">
                  {t("merchant.recentOrders")}
                </h2>
              </div>
              <Link href="/merchant/orders">
                <Button
                  variant="ghost"
                  className="text-primary font-black text-xs uppercase tracking-widest hover:bg-primary/5"
                >
                  {t("home.viewAll")}
                </Button>
              </Link>
            </div>

            <div className="space-y-4 flex-1">
              {!recentOrders?.length ? (
                <div className="text-center py-12 text-muted-foreground font-medium opacity-50 italic">
                  {t("messages.noResults")}
                </div>
              ) : (
                recentOrders.slice(0, 5).map((order: Order) => (
                  <div
                    key={order.id}
                    className="group flex items-center justify-between p-4 rounded-2xl hover:bg-muted/50 transition-all border border-transparent hover:border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center font-black text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        #{order.id.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-foreground">
                          {t("merchant.orderPrefix")}{order.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-foreground text-lg">
                        ${order.total_amount}
                      </p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-primary rounded-xl flex items-center justify-center">
                  <Star size={20} />
                </div>
                <h2 className="text-xl font-black text-foreground">
                  {t("merchant.topProducts")}
                </h2>
              </div>
              <Link href="/merchant/products">
                <Button
                  variant="ghost"
                  className="text-primary font-black text-xs uppercase tracking-widest hover:bg-primary/5"
                >
                  {t("home.viewAll")}
                </Button>
              </Link>
            </div>

            <div className="space-y-4 flex-1">
              {!topProducts?.length ? (
                <div className="text-center py-12 text-muted-foreground font-medium opacity-50 italic">
                  {t("messages.noResults")}
                </div>
              ) : (
                topProducts.map((product: Product) => (
                  <div
                    key={product.id}
                    className="group flex items-center justify-between p-4 rounded-2xl hover:bg-muted/50 transition-all border border-transparent hover:border-border"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                        <Package size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-foreground truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-black uppercase opacity-60">
                          {t("merchant.stockLabel")}: {product.stock}
                        </p>
                      </div>
                    </div>
                    <p className="font-black text-foreground text-lg shrink-0">
                      ${product.price}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
