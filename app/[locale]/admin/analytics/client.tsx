"use client";

import { useTranslations } from "next-intl";
import useSWR from "swr";
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Timer,
  Users,
  Inbox,
} from "lucide-react";
import AnalyticsCard from "@/components/merchant/AnalyticsCard";
import { getAdminAnalyticsAction } from "@/app/actions/admin";

const EmptyState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 bg-muted/20 rounded-[2.5rem] border border-dashed border-border/60 min-h-100 w-full">
      <div className="w-20 h-20 bg-background rounded-3xl flex items-center justify-center shadow-sm border border-border/40 mb-2">
        <Inbox
          className="w-10 h-10 text-muted-foreground/40"
          strokeWidth={1.5}
        />
      </div>
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-62.5 mx-auto leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};

export default function AnalyticsClient({
  initialData,
}: {
  initialData: {
    avgOrderValue: number;
    avgOrderValueChange: number;
    conversionRate: number;
    conversionChange: number;
    customerRetention: number;
    retentionChange: number;
    platformStats: { date: string; revenue: number; orders: number }[];
    categoryData: { name: string; value: number }[];
    totalVisits?: number;
    activeUsers?: number;
  };
}) {
  const t = useTranslations();

  type AnalyticsData = typeof initialData;

  const { data = initialData } = useSWR<AnalyticsData>(
    "admin-analytics",
    async () => {
      const res = await getAdminAnalyticsAction();
      if ("error" in res) throw new Error(res.error);
      return res as AnalyticsData;
    },
    {
      revalidateOnFocus: false,
      fallbackData: initialData,
    },
  );

  const platformStats = data?.platformStats ?? initialData.platformStats;
  const categoryData = data?.categoryData ?? initialData.categoryData;

  const COLORS = [
    "oklch(0.705 0.213 47.604)",
    "oklch(0.646 0.222 41.116)",
    "oklch(0.553 0.195 38.402)",
    "oklch(0.47 0.157 37.304)",
    "oklch(0.6 0.2 250)",
    "oklch(0.7 0.1 200)",
  ];

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
              <BarChart3 size={12} />
              {t("admin.performanceInsights")}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
              {t("admin.analytics")}
            </h1>
            <p className="text-muted-foreground font-medium text-lg max-w-xl">
              {t("admin.analyticsDesc")}
            </p>
          </div>
        </div>

        {/* Top Level Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnalyticsCard
            title={t("admin.avgOrderValue")}
            value={`$${Number(data.avgOrderValue || 0).toFixed(2)}`}
            change={data.avgOrderValueChange}
            icon={<TrendingUp size={24} />}
            color="orange"
          />
          <AnalyticsCard
            title={t("admin.conversionRate")}
            value={`${Number(data.conversionRate || 0).toFixed(1)}%`}
            change={data.conversionChange}
            icon={<Activity size={24} />}
            color="orange"
          />
          <AnalyticsCard
            title={t("admin.customerRetention")}
            value={`${Number(data.customerRetention || 0).toFixed(1)}%`}
            change={data.retentionChange}
            icon={<Users size={24} />}
            color="orange"
          />
        </div>

        {/* Detailed Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Platform Revenue Area Chart */}
          {platformStats.length > 0 ? (
            <div className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-foreground">
                    {t("admin.revenueFlow")}
                  </h2>
                  <p className="text-sm text-muted-foreground font-medium">
                    {t("admin.revenueFlowDesc")}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <TrendingUp size={24} />
                </div>
              </div>
              <div className="h-100 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minHeight={400}>
                  <AreaChart data={platformStats}>
                    <defs>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#F97316"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#F97316"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        borderRadius: "16px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#F97316"
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm flex items-center justify-center min-h-100">
              <EmptyState
                title={t("admin.revenueFlow")}
                description={t("admin.revenueFlowDesc")}
              />
            </div>
          )}

          {/* Distribution Pie Chart */}
          {categoryData.length > 0 ? (
            <div className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-foreground">
                    {t("admin.salesByCategory")}
                  </h2>
                  <p className="text-sm text-muted-foreground font-medium">
                    {t("admin.salesByCategoryDesc")}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <PieChartIcon size={24} />
                </div>
              </div>
              <div className="h-100 flex items-center justify-center relative w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minHeight={400}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={8}
                      cornerRadius={10}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-black text-foreground">
                    100%
                  </span>
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                    {t("admin.totalSales")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                {categoryData.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-transparent hover:border-border transition-all"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-xs font-black text-foreground uppercase">
                      {item.name}
                    </span>
                    <span className="ml-auto font-black text-primary">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm flex items-center justify-center min-h-100">
              <EmptyState
                title={t("admin.salesByCategory")}
                description={t("admin.salesByCategoryDesc")}
              />
            </div>
          )}
        </div>

        {/* Engagement / Time Metrics */}
        <div className="bg-card rounded-[2.5rem] p-10 border border-border shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-primary/10 transition-colors" />
          <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10 justify-between">
            <div className="flex items-center gap-8 w-full lg:w-auto">
              <div className="w-24 h-24 bg-primary text-primary-foreground rounded-[2.2rem] flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform duration-500 shadow-xl shadow-primary/20 shrink-0">
                <Timer size={48} strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-foreground italic tracking-tight uppercase">
                  &ldquo;{t("admin.engagementIsUp")}.&rdquo;
                </h2>
                <p className="text-muted-foreground font-medium text-lg flex items-center gap-2">
                  {t("admin.keepMonitoring")}
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                </p>
              </div>
            </div>
            
            {(data.totalVisits !== undefined || data.activeUsers !== undefined) && (
              <div className="flex gap-12 mt-6 lg:mt-0 border-t lg:border-t-0 lg:border-l border-border pt-8 lg:pt-2 lg:pl-12 w-full lg:w-auto justify-center lg:justify-start">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground font-black uppercase tracking-[0.2em]">{t("admin.visitors") || "Platform Visits"}</p>
                  <p className="text-4xl font-black text-foreground">{data.totalVisits?.toLocaleString() || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground font-black uppercase tracking-[0.2em]">{t("admin.activeUsers") || "Active Shoppers"}</p>
                  <p className="text-4xl font-black text-foreground">{data.activeUsers?.toLocaleString() || 0}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
