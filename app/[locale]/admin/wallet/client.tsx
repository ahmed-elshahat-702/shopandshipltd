"use client";

import { useTranslations } from "next-intl";
import useSWR from "swr";
import { useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Wallet,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Store,
  CreditCard,
  Calendar,
  PiggyBank,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAdminWalletAction,
  approveWithdrawalAction,
  rejectWithdrawalAction,
} from "@/app/actions/admin";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { z } from "zod";

interface WithdrawalRequest {
  id: string;
  merchant_id: string | null;
  user_id: string;
  amount: number;
  type: string;
  proof_image_url: string | null;
  wallet_address: string;
  created_at: string;
  status: string;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
  merchants:
    | {
        store_name: string;
        contact_email: string;
      }[]
    | null;
}

export default function WalletClient({
  initialData,
}: {
  initialData: {
    requests: WithdrawalRequest[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    stats: {
      pending: number;
      approved: number;
      rejected: number;
      totalRecharged: number;
      totalWithdrawn: number;
    };
  };
}) {
  const t = useTranslations();

  const rejectSchema = z.object({
    reason: z
      .string()
      .min(5, t("admin.rejectionReasonMin"))
      .max(500, t("admin.rejectionReasonMax")),
  });

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | undefined>();
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const {
    data: walletData,
    isLoading: walletLoading,
    mutate,
  } = useSWR(
    ["admin-wallet", page, statusFilter],
    () =>
      getAdminWalletAction({
        page,
        limit: 10,
        status: statusFilter === "all" ? null : statusFilter,
      }),
    {
      revalidateOnFocus: false,
      refreshInterval: 60000,
      fallbackData:
        page === 1 && statusFilter === "pending" ? initialData : undefined,
    },
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("wallet_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_transactions" },
        () => mutate(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutate]);

  const requests = walletData?.requests || [];
  const totalPages = walletData?.totalPages || 1;

  const stats = (
    walletData && "stats" in walletData
      ? walletData.stats
      : {
          pending: 0,
          approved: 0,
          rejected: 0,
          totalRecharged: 0,
          totalWithdrawn: 0,
        }
  ) as {
    pending: number;
    approved: number;
    rejected: number;
    totalRecharged: number;
    totalWithdrawn: number;
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await approveWithdrawalAction(id);
      if ("error" in res) toast.error(res.error);
      else {
        toast.success(t("admin.withdrawalApproved"));
        mutate();
      }
    } catch {
      toast.error(t("admin.withdrawalFailed"));
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason) return;
    const result = rejectSchema.safeParse({ reason: rejectReason });
    if (!result.success) {
      setRejectError(result.error.issues[0].message);
      return;
    }
    setRejectError(undefined);

    try {
      const res = await rejectWithdrawalAction(rejectId, rejectReason);
      if ("error" in res) toast.error(res.error);
      else {
        toast.success("Request rejected");
        setRejectId(null);
        setRejectReason("");
        mutate();
      }
    } catch {
      toast.error("Operation failed");
    }
  };

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
              <PiggyBank size={12} />
              {t("admin.financialGovernance")}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
              {t("admin.walletMgmt")}
            </h1>
            <p className="text-muted-foreground font-medium text-lg max-w-xl">
              {t("admin.walletDesc")}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-amber-500 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-amber-500/20">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                  {t("admin.pendingRequests") || "Pending Requests"}
                </p>
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
              </div>
              <p className="text-5xl font-black tracking-tighter">
                {stats.pending}
              </p>
              <p className="text-xs font-medium opacity-70">
                {t("admin.awaitingProcessing") ||
                  "Awaiting processing and approval"}
              </p>
            </div>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          </div>

          <div className="bg-primary rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-primary/20">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                  {t("admin.approvedTransactions") || "Approved Transactions"}
                </p>
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <p className="text-5xl font-black tracking-tighter">
                {stats.approved}
              </p>
              <p className="text-xs font-medium opacity-70">
                {t("admin.processedWalletRequests") ||
                  "Processed wallet requests"}
              </p>
            </div>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          </div>

          <div className="bg-green-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-green-600/20">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                  {t("admin.totalRecharged") || "Total Charged"}
                </p>
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                  <PiggyBank size={20} />
                </div>
              </div>
              <p className="text-4xl font-black tracking-tighter">
                ${(stats.totalRecharged || 0).toLocaleString()}
              </p>
              <p className="text-xs font-medium opacity-70">
                {t("admin.totalFundsAdded") || "Total funds added"}
              </p>
            </div>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          </div>

          <div className="bg-orange-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-orange-600/20">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                  {t("admin.totalWithdrawn") || "Total Withdrawn"}
                </p>
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                  <ArrowUpRight size={20} />
                </div>
              </div>
              <p className="text-4xl font-black tracking-tighter">
                ${(stats.totalWithdrawn || 0).toLocaleString()}
              </p>
              <p className="text-xs font-medium opacity-70">
                {t("admin.totalFundsWithdrawn") || "Total funds withdrawn"}
              </p>
            </div>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          </div>
        </div>

        {/* Requests Content */}
        <div className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-inner">
                <ArrowUpRight size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground tracking-tight">
                  {t("admin.withdrawalRequestsDesc") || "Wallet Requests Queue"}
                </h2>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                  {t("admin.withdrawalRequestsDesc")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden sm:block">
                {t("admin.filterByStatus")}
              </span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-45 h-12 rounded-2xl border-2 font-black text-xs uppercase tracking-widest bg-muted/30">
                  <SelectValue placeholder={t("admin.selectStatus")} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-2">
                  <SelectItem
                    value="pending"
                    className="font-black text-xs uppercase"
                  >
                    {t("admin.pendingOnly")}
                  </SelectItem>
                  <SelectItem
                    value="all"
                    className="font-black text-xs uppercase"
                  >
                    {t("admin.allRequests")}
                  </SelectItem>
                  <SelectItem
                    value="approved"
                    className="font-black text-xs uppercase"
                  >
                    {t("admin.approved")}
                  </SelectItem>
                  <SelectItem
                    value="rejected"
                    className="font-black text-xs uppercase"
                  >
                    {t("admin.rejected")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {walletLoading && page !== 1 ? (
            <div className="flex justify-center py-24">
              <LoadingSpinner />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-24 flex flex-col items-center bg-muted/10 rounded-[2.5rem] border-2 border-dashed border-border">
              <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 text-primary shadow-sm rotate-3">
                <Wallet size={48} />
              </div>
              <h3 className="text-xl font-black text-foreground mb-1">
                {t("messages.noResults")}
              </h3>
              <p className="text-muted-foreground font-medium max-w-xs mx-auto">
                {t("messages.noResultsDesc")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto lg:overflow-visible">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {t("common.user") || "User"}
                    </th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {t("common.amount")}
                    </th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {t("admin.walletAddress")}
                    </th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {t("common.date")}
                    </th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground text-center">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((request: WithdrawalRequest) => (
                    <tr
                      key={request.id}
                      className="group hover:bg-muted/30 transition-all"
                    >
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-card border-2 border-border flex items-center justify-center text-primary shadow-sm group-hover:border-primary/30 group-hover:scale-105 transition-all duration-300">
                            {request.merchant_id ? (
                              <Store size={22} strokeWidth={2.5} />
                            ) : (
                              <User size={22} strokeWidth={2.5} />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-foreground">
                              {request.merchant_id
                                ? request.merchants?.[0]?.store_name || "N/A"
                                : request.profiles?.full_name || "N/A"}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                              {request.merchant_id
                                ? "Verified Merchant"
                                : "Customer"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span
                            className={cn(
                              "text-xl font-black",
                              request.type === "recharge"
                                ? "text-green-500"
                                : "text-orange-500",
                            )}
                          >
                            {request.type === "recharge" ? "+" : "-"}$
                            {request.amount?.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            {request.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/50 border border-border/50 max-w-50">
                            <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center text-muted-foreground shrink-0 border border-border">
                              <Wallet size={14} />
                            </div>
                            <span className="text-xs font-black text-foreground truncate">
                              {request.wallet_address || t("common.na")}
                            </span>
                          </div>
                          {request.proof_image_url && (
                            <Button
                              variant="link"
                              onClick={() =>
                                setProofUrl(request.proof_image_url!)
                              }
                              className="text-xs h-auto p-0 font-bold self-start"
                            >
                              {t("admin.viewProof") || "View Proof"}
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-muted-foreground font-medium whitespace-nowrap">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <Calendar size={14} className="opacity-50" />
                          </div>
                          <span className="text-xs font-bold text-foreground">
                            {new Date(request.created_at).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex items-center justify-center gap-3">
                          {request.status === "pending" ? (
                            <>
                              <Button
                                onClick={() => handleApprove(request.id)}
                                variant="ghost"
                                size="icon"
                                className="rounded-2xl h-12 w-12 bg-green-500/10 text-green-600 border border-green-200 hover:bg-green-500 hover:text-white transition-all shadow-lg hover:shadow-green-500/20"
                              >
                                <CheckCircle2 size={24} strokeWidth={2.5} />
                              </Button>
                              <Button
                                onClick={() => setRejectId(request.id)}
                                variant="ghost"
                                size="icon"
                                className="rounded-2xl h-12 w-12 bg-red-500/10 text-red-500 border border-red-200 hover:bg-red-500 hover:text-white transition-all shadow-lg hover:shadow-red-500/20"
                              >
                                <XCircle size={24} strokeWidth={2.5} />
                              </Button>
                            </>
                          ) : (
                            <span
                              className={cn(
                                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                                request.status === "approved"
                                  ? "bg-green-500/10 text-green-600 border-green-200"
                                  : "bg-red-500/10 text-red-500 border-red-200",
                              )}
                            >
                              {request.status}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Section */}
              <div className="p-8 border-t border-border flex items-center justify-between bg-muted/10">
                <Button
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="rounded-[1.25rem] h-12 px-6 font-black gap-2 border-2 transition-all hover:bg-card disabled:opacity-30"
                >
                  <ArrowLeft size={18} />
                  {t("common.previous")}
                </Button>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mr-2">
                    {t("common.page")}
                  </span>
                  <div className="w-11 h-11 rounded-[1.125rem] bg-card border-2 border-primary flex items-center justify-center font-black text-primary shadow-xl shadow-primary/10 transition-transform hover:scale-110">
                    {page}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">
                    {t("common.of")} {totalPages}
                  </span>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="rounded-[1.25rem] h-12 px-6 font-black gap-2 border-2 transition-all hover:bg-card disabled:opacity-30"
                >
                  {t("common.next")}
                  <ArrowRight size={18} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <DialogContent className="sm:max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("admin.rejectReason") || "Rejection Reason"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (rejectError) setRejectError(undefined);
              }}
              placeholder={
                t("admin.rejectionReasonPlaceholder") ||
                "Enter reason for rejection"
              }
              className={cn(
                "w-full font-medium",
                rejectError
                  ? "border-destructive focus-visible:ring-destructive"
                  : "",
              )}
            />
            {rejectError && (
              <p className="text-xs text-destructive mt-1">{rejectError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleReject} disabled={!rejectReason}>
              {t("admin.confirmReject") || "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!proofUrl} onOpenChange={() => setProofUrl(null)}>
        <DialogContent className="sm:max-w-xl p-0 border-none bg-transparent shadow-none">
          {proofUrl && (
            <div className="relative w-full h-[80vh] rounded-2xl overflow-hidden bg-black/50">
              <Image
                src={proofUrl}
                alt="Transaction Proof"
                fill
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
