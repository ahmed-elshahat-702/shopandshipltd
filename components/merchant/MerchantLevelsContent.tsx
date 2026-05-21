"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  Shield,
  TrendingUp,
  Package,
  DollarSign,
  CheckCircle2,
  Clock,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  getMerchantDetailsByUserIdAction,
  submitUpgradeRequestAction,
} from "@/app/actions/merchant";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { MerchantDetail } from "@/lib/types";
import type { MerchantLevel } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";

const levelColors = [
  "from-slate-400 to-slate-600",
  "from-blue-400 to-blue-600",
  "from-indigo-400 to-indigo-600",
  "from-purple-400 to-purple-600",
  "from-pink-400 to-pink-600",
  "from-orange-400 to-amber-600",
];

interface MerchantLevelsContentProps {
  initialData: { merchant: MerchantDetail; levels: MerchantLevel[] };
  userId: string;
}

export default function MerchantLevelsContent({
  initialData,
  userId,
}: MerchantLevelsContentProps) {
  const t = useTranslations();
  const [submitting, setSubmitting] = useState(false);

  const { data, mutate } = useSWR(
    ["merchant_details", userId],
    () => getMerchantDetailsByUserIdAction(userId),
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
    },
  );

  const levels = initialData.levels || [];
  const merchant = data?.merchant as MerchantDetail | undefined;
  const currentLevel = merchant?.level_id || 0;
  const pendingRequests =
    merchant?.merchant_level_upgrades?.filter((r) => r.status === "pending") ||
    [];
  const hasPending = pendingRequests.length > 0;

  useEffect(() => {
    const supabase = createClient();

    const profilesChannel = supabase
      .channel("merchant-profile-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "merchant_profiles",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          mutate();
        },
      )
      .subscribe();

    const upgradesChannel = supabase
      .channel("merchant-upgrade-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "merchant_level_upgrades",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          mutate();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(upgradesChannel);
    };
  }, [userId, mutate]);

  const handleUpgrade = async (level: number) => {
    setSubmitting(true);
    try {
      const res = await submitUpgradeRequestAction(userId, level);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(t("common.success"));
        mutate();
      }
    } catch (err) {
      toast.error(t("merchant.errorOccurred"));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background pb-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
              <TrendingUp size={24} />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              {t("merchant.level") || "Merchant Levels"}
            </h1>
          </div>
          <p className="text-muted-foreground font-medium text-lg max-w-2xl">
            {t("merchant.levelDescription")}
          </p>
        </div>

        {/* Current Level Info */}
        <div className="bg-primary rounded-[2.5rem] p-8 text-primary-foreground relative overflow-hidden shadow-2xl shadow-primary/20">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-[2rem] flex items-center justify-center border border-white/30 shadow-2xl">
                <Shield size={40} className="text-white drop-shadow-lg" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] opacity-70 mb-1">
                  {t("merchant.currentLevel")}
                </p>
                <h2 className="text-4xl font-black leading-none flex items-center gap-2">
                  {t("merchant.level")} {currentLevel}
                  <CheckCircle2 size={24} className="text-green-300" />
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 shrink-0">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  {t("merchant.profitRatio")}
                </p>
                <p className="text-2xl font-black">
                  {levels.find((l) => l.id === currentLevel)
                    ?.commission_percentage || 0}
                  %
                </p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  {t("merchant.maxProducts")}
                </p>
                <p className="text-2xl font-black">
                  {levels.find((l) => l.id === currentLevel)?.max_products || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        </div>

        {/* Levels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {levels.map((level) => {
            const isCurrent = currentLevel === level.id;
            const isNext = currentLevel + 1 === level.id;
            const isLocked = level.id > currentLevel;
            const isPrev = level.id < currentLevel;
            const levelColor =
              levelColors[level.id] || "from-slate-400 to-slate-600";

            return (
              <motion.div
                key={level.id}
                whileHover={{ y: -5 }}
                className={cn(
                  "relative group bg-card border border-border rounded-[2.5rem] p-8 shadow-sm transition-all duration-300",
                  isCurrent &&
                    "border-primary/50 shadow-xl shadow-primary/5 ring-1 ring-primary/20",
                  isLocked && "opacity-80",
                )}
              >
                <div
                  className={cn(
                    "absolute top-6 right-6 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
                    isCurrent
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {isCurrent
                    ? t("merchant.currentBadge")
                    : isPrev
                      ? t("merchant.unlockedBadge")
                      : isLocked
                        ? t("merchant.lockedBadge")
                        : ""}
                </div>

                <div className="flex items-center gap-4 mb-8">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg bg-linear-to-br",
                      levelColor,
                    )}
                  >
                    {level.name}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-foreground">
                      {t("merchant.level")} {level.id}
                    </h3>
                    <p className="text-sm text-muted-foreground font-bold">
                      {isCurrent
                        ? t("merchant.activeBenefits")
                        : isNext
                          ? t("merchant.nextMilestone")
                          : t("merchant.programTier")}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-transparent hover:border-border transition-colors group/item">
                    <div className="flex items-center gap-3">
                      <DollarSign
                        size={18}
                        className="text-primary opacity-60 group-hover/item:opacity-100"
                      />
                      <span className="text-sm font-bold text-muted-foreground">
                        {t("merchant.minWalletBalance")}
                      </span>
                    </div>
                    <span className="text-sm font-black text-foreground">
                      ${level.min_wallet_balance?.toLocaleString() || "0"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-transparent hover:border-border transition-colors group/item">
                    <div className="flex items-center gap-3">
                      <TrendingUp
                        size={18}
                        className="text-primary opacity-60 group-hover/item:opacity-100"
                      />
                      <span className="text-sm font-bold text-muted-foreground">
                        {t("merchant.profitRatio")}
                      </span>
                    </div>
                    <span className="text-sm font-black text-foreground">
                      {level.commission_percentage}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-transparent hover:border-border transition-colors group/item">
                    <div className="flex items-center gap-3">
                      <Package
                        size={18}
                        className="text-primary opacity-60 group-hover/item:opacity-100"
                      />
                      <span className="text-sm font-bold text-muted-foreground">
                        {t("merchant.maxProducts")}
                      </span>
                    </div>
                    <span className="text-sm font-black text-foreground">
                      {level.max_products}
                    </span>
                  </div>
                </div>

                {isNext && (
                  <Button
                    onClick={() => !hasPending && handleUpgrade(level.id)}
                    disabled={submitting || hasPending}
                    className={cn(
                      "w-full h-14 rounded-2xl font-black text-lg shadow-xl gap-2 overflow-hidden relative transition-all",
                      hasPending
                        ? "bg-muted text-muted-foreground border border-border cursor-not-allowed shadow-none"
                        : "bg-primary text-white hover:bg-primary/90 shadow-primary/20",
                    )}
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : hasPending ? (
                      <>
                        <Clock size={20} />
                        {t("merchant.upgradeProcessing") || "Pending Approval"}
                      </>
                    ) : (
                      <>
                        {t("merchant.upgradeNow")}
                        <ChevronRight
                          size={20}
                          className="group-hover:translate-x-1 transition-transform"
                        />
                      </>
                    )}
                  </Button>
                )}

                {isCurrent && (
                  <div className="w-full h-14 rounded-2xl bg-muted text-muted-foreground font-black text-lg flex items-center justify-center gap-2 border border-border">
                    <CheckCircle2 size={20} />
                    {t("merchant.activeLevel")}
                  </div>
                )}

                {level.id > currentLevel + 1 && (
                  <div className="w-full h-14 rounded-2xl bg-muted/50 text-muted-foreground/50 font-black text-lg flex items-center justify-center gap-2 border border-dashed border-muted-foreground/20">
                    <AlertTriangle size={18} className="opacity-50" />
                    {t("merchant.required")} {level.id - 1}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="bg-muted/50 border border-border rounded-[2.5rem] p-8 flex items-start gap-4">
          <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center shrink-0 border border-border shadow-sm">
            <Clock size={20} className="text-primary" />
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-black text-foreground">
              {t("merchant.upgradeProcessing")}
            </h4>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              {t("merchant.upgradeProcessingDescription")}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
