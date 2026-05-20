"use client";

import { useTranslations } from "next-intl";
import {
  Users,
  Store,
  ShoppingCart,
  Wallet,
  ArrowRight,
  Activity,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import AnalyticsCard from "@/components/merchant/AnalyticsCard";
import SalesChart from "@/components/merchant/SalesChart";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminStats {
  totalCustomers: number;
  customersChange: number;
  totalMerchants: number;
  merchantsChange: number;
  totalOrders: number;
  ordersChange: number;
  totalRevenue: number;
  revenueChange: number;
  pendingApplications: number;
  pendingWithdrawals: number;
  totalWalletBalance: number;
  walletBalanceChange: number;
  totalPlatformEarnings: number;
}

interface PlatformStat {
  date: string;
  revenue: number;
  orders: number;
}

export default function AdminDashboardClient({
  stats,
  platformStats,
}: {
  stats: AdminStats;
  platformStats: PlatformStat[];
}) {
  const t = useTranslations();

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck size={12} />
              {t("admin.systemSecure")}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
              {t("admin.dashboard")}
            </h1>
            <p className="text-muted-foreground font-medium text-lg max-w-xl">
              {t("admin.dashboardDesc")}
            </p>
          </div>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnalyticsCard
            title={t("admin.totalCustomers")}
            value={stats.totalCustomers?.toLocaleString() || "0"}
            change={stats.customersChange || 0}
            icon={<Users size={24} strokeWidth={2.5} />}
            color="orange"
          />
          <AnalyticsCard
            title={t("admin.totalMerchants")}
            value={stats.totalMerchants?.toLocaleString() || "0"}
            change={stats.merchantsChange || 0}
            icon={<Store size={24} strokeWidth={2.5} />}
            color="orange"
          />
          <AnalyticsCard
            title={t("admin.totalOrders")}
            value={stats.totalOrders?.toLocaleString() || "0"}
            change={stats.ordersChange || 0}
            icon={<ShoppingCart size={24} strokeWidth={2.5} />}
            color="orange"
          />
          <AnalyticsCard
            title={t("admin.totalRevenue")}
            value={`$${(stats.totalRevenue || 0).toLocaleString()}`}
            change={stats.revenueChange || 0}
            icon={<Wallet size={24} strokeWidth={2.5} />}
            color="orange"
          />
          <AnalyticsCard
            title={t("admin.walletBalances")}
            value={`$${(stats.totalWalletBalance || 0).toLocaleString()}`}
            change={stats.walletBalanceChange || 0}
            icon={<CreditCard size={24} strokeWidth={2.5} />}
            color="orange"
          />
          <AnalyticsCard
            title={t("admin.platformEarnings")}
            value={`$${(stats.totalPlatformEarnings || 0).toLocaleString()}`}
            change={0}
            icon={<Activity size={24} strokeWidth={2.5} />}
            color="orange"
          />
        </div>

        {/* Charts & Pending Actions */}
        <div
          className={`grid grid-cols-1 ${platformStats?.length > 0 ? "xl:grid-cols-3" : "xl:grid-cols-1"} gap-8`}
        >
          {/* Revenue Chart */}
          {platformStats?.length > 0 && (
            <div className="xl:col-span-2 bg-card rounded-[2.5rem] p-8 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-foreground">
                    {t("admin.revenueTrend")}
                  </h2>
                  <p className="text-sm text-muted-foreground font-medium">
                    {t("admin.platformGrowth")}
                  </p>
                </div>
                <div className="flex bg-muted/50 p-1 rounded-xl">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg text-[10px] font-black uppercase px-3 h-8 bg-background shadow-sm"
                  >
                    {t("merchant.revenue")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg text-[10px] font-black uppercase px-3 h-8"
                  >
                    {t("admin.platformGrowth")}
                  </Button>
                </div>
              </div>
              <div className="h-87.5 w-full">
                <SalesChart data={platformStats} />
              </div>
            </div>
          )}

          {/* Pending Actions */}
          <div className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                  <Activity size={20} />
                </div>
                <h2 className="text-xl font-black text-foreground">
                  {t("admin.pendingActions")}
                </h2>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <Link
                href="/admin/applications"
                className="group flex items-center justify-between p-5 rounded-[2rem] bg-amber-50 border border-amber-100 hover:border-amber-300 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="font-black text-foreground">
                      {t("admin.pendingApplications")}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {t("admin.awaitingApproval")}
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-black text-primary px-4">
                  {stats.pendingApplications?.toLocaleString() || "0"}
                </span>
              </Link>

              <Link
                href="/admin/wallet"
                className="group flex items-center justify-between p-5 rounded-[2rem] bg-blue-50 border border-blue-100 hover:border-blue-300 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <p className="font-black text-foreground">
                      {t("admin.pendingWithdrawals")}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {t("admin.awaitingProcessing")}
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-black text-primary px-4">
                  {stats.pendingWithdrawals?.toLocaleString() || "0"}
                </span>
              </Link>

              <div className="mt-8 pt-8 border-t border-border">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 opacity-50">
                  {t("admin.quickLinks")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/admin/settings">
                    <Button
                      variant="outline"
                      className="w-full rounded-2xl py-6 font-black border-2 gap-2 h-auto text-xs uppercase tracking-wider"
                    >
                      {t("admin.settings")}
                    </Button>
                  </Link>
                  <Link href="/admin/analytics">
                    <Button
                      variant="outline"
                      className="w-full rounded-2xl py-6 font-black border-2 gap-2 h-auto text-xs uppercase tracking-wider"
                    >
                      {t("admin.analytics")}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              name: t("admin.manageUsers"),
              href: "/admin/users",
              icon: Users,
              color: "orange",
            },
            {
              name: t("admin.manageApplications"),
              href: "/admin/applications",
              icon: ShieldCheck,
              color: "orange",
            },
            {
              name: t("admin.walletMgmt"),
              href: "/admin/wallet",
              icon: Wallet,
              color: "orange",
            },
            {
              name: t("admin.analytics"),
              href: "/admin/analytics",
              icon: Activity,
              color: "orange",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group p-6 bg-card border border-border rounded-[2rem] hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
            >
              <div
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-lg",
                  item.color === "orange" &&
                    "bg-orange-100 text-orange-600 shadow-orange-500/10",
                )}
              >
                <item.icon size={28} strokeWidth={2.5} />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-black text-foreground">{item.name}</span>
                <ArrowRight
                  size={20}
                  className="text-muted-foreground group-hover:text-primary group-hover:translate-x-2 transition-all"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
