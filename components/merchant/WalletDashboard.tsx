"use client";

import { useTranslations } from "next-intl";
import useSWR, { useSWRConfig } from "swr";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Receipt,
  ShoppingBag,
  Lock,
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { cn } from "@/lib/utils";
import {
  getMerchantWalletAction,
  getMerchantTransactionsAction,
} from "@/app/actions/merchant";
import type { MerchantWallet, MerchantWalletTransaction } from "@/lib/types";

function TransactionStatusBadge({
  status,
}: {
  status: MerchantWalletTransaction["status"];
}) {
  const t = useTranslations();
  const styles = {
    pending: "bg-yellow-100 text-yellow-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={cn(
        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
        styles[status],
      )}
    >
      {t(`merchant.${status}`)}
    </span>
  );
}

export function WalletDashboard({
  userId,
  initialWallet,
  initialTransactions,
  userRole = "customer",
}: {
  userId: string;
  initialWallet?:
    | { wallet: MerchantWallet | null; error?: undefined }
    | { error: string; wallet?: undefined };
  initialTransactions?:
    | { transactions: MerchantWalletTransaction[]; error?: undefined }
    | { error: string; transactions?: undefined };
  userRole?: string;
}) {
  const t = useTranslations();
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all");
  const { mutate } = useSWRConfig();

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("merchant_wallet_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_transactions" },
        () => {
          mutate(["merchant_wallet", userId]);
          mutate(["merchant_transactions", userId]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, mutate]);

  const { data: walletData, isLoading: walletLoading } = useSWR(
    userId ? ["merchant_wallet", userId] : null,
    () => getMerchantWalletAction(userId),
    {
      revalidateOnFocus: false,
      fallbackData: initialWallet,
    },
  );

  const { data: transactionsData, isLoading: txLoading } = useSWR(
    userId ? ["merchant_transactions", userId] : null,
    () => getMerchantTransactionsAction(userId),
    {
      revalidateOnFocus: false,
      fallbackData: initialTransactions,
    },
  );

  const isLoading = walletLoading || txLoading;

  const wallet: MerchantWallet | null = walletData?.wallet ?? null;
  const allTransactions: MerchantWalletTransaction[] =
    transactionsData?.transactions ?? [];

  const filteredTransactions = allTransactions.filter((tx) => {
    if (filter === "all") return true;
    if (filter === "credit")
      return tx.type !== "withdrawal" && tx.type !== "order_payment";
    if (filter === "debit")
      return tx.type === "withdrawal" || tx.type === "order_payment";
    return true;
  });

  const earningsChange = wallet?.earnings_change || 0;

  return (
    <div className="space-y-10 overflow-x-hidden">
      {/* Balance Cards Grid */}
      <div
        className={cn(
          "grid grid-cols-1 gap-6 sm:gap-8",
          userRole === "merchant"
            ? "sm:grid-cols-2 lg:grid-cols-3"
            : "sm:grid-cols-2",
        )}
      >
        {/* Available Balance */}
        <div className="bg-primary rounded-[2.5rem] p-8 text-primary-foreground relative overflow-hidden shadow-2xl shadow-primary/30">
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                {t("merchant.availableBalance")}
              </p>
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                <Wallet size={20} />
              </div>
            </div>
            <p className="text-4xl md:text-5xl font-black tracking-tighter">
              $
              {wallet?.balance?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || "0.00"}
            </p>
            <div className="pt-4 flex items-center justify-between border-t border-white/10">
              <span className="text-xs font-medium opacity-70">
                {t("merchant.readyToWithdraw")}
              </span>
            </div>
          </div>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        </div>

        {/* Outstanding Balance - Only for merchants */}
        {userRole === "merchant" && (
          <div className="bg-card rounded-[2.5rem] p-8 border border-border relative overflow-hidden shadow-sm">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  {t("merchant.outstandingBalance") || "Locked Balance"}
                </p>
                <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
                  <Lock size={20} />
                </div>
              </div>
              <p className="text-4xl md:text-5xl font-black tracking-tighter text-foreground">
                $
                {wallet?.outstanding_balance?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0.00"}
              </p>
              <div className="pt-4 flex items-center justify-between border-t border-border">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("merchant.lockedUntilDelivered") ||
                    "Locked until delivery"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Total Earnings - Only for merchants */}
        {userRole === "merchant" && (
          <div className="bg-card rounded-[2.5rem] p-8 border border-border relative overflow-hidden shadow-sm shadow-green-500/5">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  {t("merchant.totalEarnings")}
                </p>
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                  <Receipt size={20} />
                </div>
              </div>
              <p className="text-4xl md:text-5xl font-black tracking-tighter text-foreground">
                $
                {wallet?.total_earnings?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0.00"}
              </p>
              <div className="pt-4 flex items-center justify-between border-t border-border">
                <span className="text-xs font-medium text-muted-foreground">
                  {earningsChange >= 0 ? t("merchant.upFromLastMonth") : t("merchant.downFromLastMonth")}
                </span>
                <span
                  className={cn(
                    "font-bold text-xs",
                    earningsChange >= 0 ? "text-green-600" : "text-red-500",
                  )}
                >
                  {earningsChange === 0 ? "" : earningsChange > 0 ? "▲ " : "▼ "}
                  {earningsChange.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transactions Section */}
      <div className="bg-card rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-8 border border-border shadow-sm flex flex-col overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center shrink-0">
              <History size={20} />
            </div>
            <h2 className="text-xl font-black text-foreground">
              {t("merchant.transactionHistory")}
            </h2>
          </div>

          <div className="flex bg-muted/50 p-1 rounded-2xl border border-border overflow-x-auto no-scrollbar max-w-full">
            {[
              { id: "all", label: t("merchant.all"), icon: History },
              {
                id: "debit",
                label: t("merchant.withdrawals"),
                icon: ArrowUpRight,
              },
              {
                id: "credit",
                label: t("merchant.deposits"),
                icon: ArrowDownLeft,
              },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id as "all" | "credit" | "debit")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  filter === item.id
                    ? "bg-background shadow-sm text-primary scale-100"
                    : "text-muted-foreground hover:text-foreground scale-95 opacity-70",
                )}
              >
                <item.icon size={12} strokeWidth={3} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6 text-muted-foreground/20">
              <ShoppingBag size={48} />
            </div>
            <p className="text-muted-foreground font-bold italic">
              {t("merchant.noTransactionsFound")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-200">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {t("common.date")}
                    </th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {t("merchant.transactionType")}
                    </th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {t("merchant.description")}
                    </th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {t("common.amount")}
                    </th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground text-center">
                      {t("order.status")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTransactions.map((transaction) => {
                    const isCredit =
                      transaction.type !== "withdrawal" &&
                      transaction.type !== "order_payment";
                    return (
                      <tr
                        key={transaction.id}
                        className="group hover:bg-muted/30 transition-all"
                      >
                        <td className="px-8 py-6">
                          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                            {new Date(
                              transaction.created_at,
                            ).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "p-2 rounded-xl group-hover:scale-110 transition-transform",
                                isCredit
                                  ? "bg-green-100 text-green-600"
                                  : "bg-red-100 text-red-600",
                              )}
                            >
                              {isCredit ? (
                                <ArrowDownLeft size={16} strokeWidth={3} />
                              ) : (
                                <ArrowUpRight size={16} strokeWidth={3} />
                              )}
                            </div>
                            <span className="font-black text-foreground uppercase text-xs tracking-wider whitespace-nowrap">
                              {transaction.type === "withdrawal"
                                ? t("merchant.withdrawal")
                                : transaction.type === "recharge"
                                  ? t("merchant.deposit")
                                  : transaction.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-medium text-muted-foreground line-clamp-1 max-w-xs">
                            {transaction.description || "-"}
                          </p>
                        </td>
                        <td className="px-8 py-6">
                          <span
                            className={cn(
                              "text-lg font-black whitespace-nowrap",
                              isCredit ? "text-green-600" : "text-red-500",
                            )}
                          >
                            {isCredit ? "+" : "-"}$
                            {Math.abs(transaction.amount)}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <TransactionStatusBadge status={transaction.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {filteredTransactions.map((transaction) => {
                const isCredit =
                  transaction.type !== "withdrawal" &&
                  transaction.type !== "order_payment";
                return (
                  <div
                    key={transaction.id}
                    className="bg-muted/20 rounded-[1.5rem] p-6 border border-border flex flex-col gap-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "p-1.5 rounded-lg",
                            isCredit
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600",
                          )}
                        >
                          {isCredit ? (
                            <ArrowDownLeft size={14} strokeWidth={3} />
                          ) : (
                            <ArrowUpRight size={14} strokeWidth={3} />
                          )}
                        </div>
                        <span className="font-black text-foreground uppercase text-xs tracking-wider">
                          {transaction.type === "withdrawal"
                            ? t("merchant.withdrawal")
                            : transaction.type === "recharge"
                              ? t("merchant.deposit")
                              : transaction.type}
                        </span>
                      </div>
                      <TransactionStatusBadge status={transaction.status} />
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground line-clamp-1">
                        {transaction.description || "-"}
                      </p>
                      <span
                        className={cn(
                          "text-lg font-black",
                          isCredit ? "text-green-600" : "text-red-500",
                        )}
                      >
                        {isCredit ? "+" : "-"}${Math.abs(transaction.amount)}
                      </span>
                    </div>

                    <div className="h-px bg-border/50 w-full" />

                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      <History size={12} />
                      {new Date(transaction.created_at).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
