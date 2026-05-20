"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import useSWR from "swr";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  Activity,
  ShoppingBag,
  Target,
  Users,
  Timer,
} from "lucide-react";
import AnalyticsCard from "@/components/merchant/AnalyticsCard";
import { cn } from "@/lib/utils";
import { getMerchantAnalyticsAction } from "@/app/actions/merchant";
import { AnalyticsData, AnalyticsPeriod } from "@/lib/types";
import LoadingSpinner from "@/components/LoadingSpinner";

interface AnalyticsDashboardProps {
  merchantId: string;
  initialData?: AnalyticsData;
}

export function AnalyticsDashboard({
  merchantId,
  initialData,
}: AnalyticsDashboardProps) {
  const t = useTranslations();
  const [timeframe, setTimeframe] = useState<AnalyticsPeriod>("monthly");

  const { data: analyticsData, isLoading } = useSWR(
    merchantId ? ["merchant_analytics", merchantId, timeframe] : null,
    () => getMerchantAnalyticsAction(merchantId, timeframe),
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
      refreshInterval: 60000,
    },
  );

  const hasRealData =
    analyticsData &&
    !("error" in analyticsData) &&
    (analyticsData as AnalyticsData).chartData !== undefined;

  const data = hasRealData ? (analyticsData as AnalyticsData) : null;

  const salesData: {
    date: string;
    revenue: number;
    orders: number;
    sales?: number;
  }[] = data?.chartData?.length
    ? data.chartData.map((d) => ({ ...d, sales: d.revenue }))
    : [];

  const totalRevenue = data?.totalRevenue ?? 0;
  const totalOrders = data?.totalOrders ?? 0;
  const avgOrderValue = data?.averageOrderValue ?? 0;
  const avgOrderValueChange = data?.averageOrderValueChange ?? 0;
  const revenueChange = data?.revenueChange ?? 0;
  const ordersChange = data?.ordersChange ?? 0;
  const customerRetention = data?.customerRetention ?? 0;

  const categoryData = data?.revenueByCategory?.length
    ? data.revenueByCategory
    : [];

  const colors = [
    "oklch(0.837 0.128 66.29)",
    "oklch(0.705 0.213 47.604)",
    "oklch(0.646 0.222 41.116)",
    "oklch(0.553 0.195 38.402)",
    "oklch(0.47 0.157 37.304)",
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10">
      {/* Timeframe Selector */}
      <div className="flex justify-end">
        <div className="flex overflow-x-auto no-scrollbar bg-muted/50 p-1.5 rounded-[1.25rem] border border-border shadow-inner shrink-0">
          {(["weekly", "monthly", "yearly"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setTimeframe(item)}
              className={cn(
                "px-5 md:px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap",
                timeframe === item
                  ? "bg-background shadow-lg shadow-black/5 text-primary scale-100"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50 scale-95 opacity-70",
              )}
            >
              {t(`merchant.${item}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsCard
          title={t("merchant.totalSales")}
          value={`$${totalRevenue.toLocaleString()}`}
          change={revenueChange}
          icon={<ShoppingBag size={24} className="text-primary" />}
          color="orange"
        />
        <AnalyticsCard
          title={t("merchant.averageOrderValue")}
          value={`$${avgOrderValue.toFixed(2)}`}
          change={avgOrderValueChange}
          icon={<Target size={24} className="text-primary" />}
          color="orange"
        />
        <AnalyticsCard
          title={t("merchant.totalOrders")}
          value={totalOrders.toLocaleString()}
          change={ordersChange}
          icon={<Activity size={24} className="text-primary" />}
          color="orange"
        />
        <AnalyticsCard
          title={t("merchant.customerRetention")}
          value={`${customerRetention.toFixed(0)}%`}
          icon={<Users size={24} className="text-primary" />}
          color="orange"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card rounded-[2.5rem] p-8 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-foreground">
              {t("merchant.salesTrend")}
            </h2>
            <TrendingUp size={24} className="text-primary" />
          </div>
          {salesData.length > 0 ? (
            <div className="h-62.5 sm:h-75 lg:h-100">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E2E8F0"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: "16px", border: "none" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name={t("merchant.sales")}
                    stroke="#F97316"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-62.5 sm:h-75 lg:h-100 flex items-center justify-center">
              <p className="text-muted-foreground font-medium">
                {t("messages.noResults")}
              </p>
            </div>
          )}
        </div>

        <div className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm flex flex-col items-center">
          <h2 className="text-xl font-black text-foreground mb-8 w-full">
            {t("merchant.revenueByCategory")}
          </h2>
          {categoryData.length > 0 ? (
            <>
              <div className="h-62.5 sm:h-75 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={colors[index % colors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full space-y-3 mt-4">
                {categoryData.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <span className="text-[10px] font-black uppercase text-foreground truncate flex-1">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-black text-primary">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-62.5 sm:h-75 flex items-center justify-center w-full">
              <p className="text-muted-foreground font-medium">
                {t("messages.noResults")}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm">
          <h2 className="text-xl font-black text-foreground mb-8">
            {t("merchant.monthlyRevenue")}
          </h2>
          {salesData.length > 0 ? (
            <div className="h-62.5 sm:h-75">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E2E8F0"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                  />
                  <Tooltip cursor={{ fill: "#F8FAFC" }} />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {salesData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={colors[index % colors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-62.5 sm:h-75 flex items-center justify-center">
              <p className="text-muted-foreground font-medium">
                {t("messages.noResults")}
              </p>
            </div>
          )}
        </div>

        <div className="bg-primary rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-2xl shadow-primary/20">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                <Timer size={24} />
              </div>
              <h2 className="text-2xl font-black">
                {t("merchant.summaryStats")}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
                  {t("merchant.totalOrders")}
                </p>
                <p className="text-3xl font-black">
                  {totalOrders.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
                  {t("merchant.averageOrderValue")}
                </p>
                <p className="text-3xl font-black">
                  ${avgOrderValue.toFixed(0)}
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-10 mt-10 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60">
                  {t("merchant.totalRevenue")}
                </p>
                <p className="text-2xl font-black">
                  ${totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
