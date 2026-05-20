"use client";

import {
  getUpgradeRequestsAction,
  respondToUpgradeRequestAction,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UpgradeRequestWithMerchant } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Search,
  Store,
  TrendingUp,
  User,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { z } from "zod";

type UpgradeRequestsData = Awaited<ReturnType<typeof getUpgradeRequestsAction>>;

interface ClientProps {
  initialData: UpgradeRequestsData;
}

const Client = ({ initialData }: ClientProps) => {
  const t = useTranslations();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const rejectSchema = z.object({
    reason: z
      .string()
      .min(5, t("admin.rejectionReasonMin"))
      .max(500, t("admin.rejectionReasonMax")),
  });

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | undefined>();
  const [rejectingRequest, setRejectingRequest] =
    useState<UpgradeRequestWithMerchant | null>(null);

  const { data, mutate, isLoading } = useSWR(
    "admin_upgrade_requests",
    getUpgradeRequestsAction,
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
    },
  );

  useEffect(() => {
    const supabase = createClient();
    const upgradesChannel = supabase
      .channel("admin-upgrade-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "merchant_level_upgrades",
        },
        () => {
          mutate();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(upgradesChannel);
    };
  }, [mutate]);

  const requests = (data?.requests as UpgradeRequestWithMerchant[]) || [];

  const handleResponse = async (
    requestId: string,
    status: "approved" | "rejected",
    merchantId: string,
    level: number,
    reason?: string,
  ) => {
    setProcessingId(requestId);
    try {
      const res = await respondToUpgradeRequestAction(
        requestId,
        status,
        merchantId,
        level,
        reason,
      );
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(
          status === "approved"
            ? t("admin.requestApproved")
            : t("admin.requestRejected"),
        );
        mutate();
      }
    } catch (err) {
      toast.error(t("common.errorOccurred"));
      console.error(err);
    } finally {
      setProcessingId(null);
      if (status === "rejected") {
        setIsRejectDialogOpen(false);
        setRejectingRequest(null);
        setRejectReason("");
      }
    }
  };

  const initReject = (request: UpgradeRequestWithMerchant) => {
    setRejectingRequest(request);
    setIsRejectDialogOpen(true);
  };

  return (
    <main className="min-h-screen bg-background pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight flex items-center gap-3">
              <TrendingUp className="text-primary" size={40} />
              {t("admin.upgradeRequests")}
            </h1>
            <p className="text-muted-foreground font-medium text-lg">
              {t("admin.upgradeRequestsDesc")}
            </p>
          </div>

          <div className="bg-card border border-border px-6 py-3 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {t("admin.pendingRequests")}
              </p>
              <p className="text-2xl font-black text-primary">
                {requests.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Clock size={20} />
            </div>
          </div>
        </div>

        {/* Filters/Search placeholder */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <input
              type="text"
              placeholder={t("admin.searchMerchants")}
              className="w-full h-14 pl-12 pr-4 bg-card border border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-muted-foreground font-black animate-pulse">
                {t("admin.loadingRequests")}
              </p>
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-[2.5rem] py-24 flex flex-col items-center justify-center text-center px-6">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6">
                <CheckCircle size={40} />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-2">
                {t("admin.queueIsClear")}
              </h3>
              <p className="text-muted-foreground font-medium max-w-sm">
                {t("admin.queueIsClearDesc")}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {requests.map((request) => (
                <motion.div
                  key={request.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card border border-border rounded-[2.5rem] p-6 sm:p-8 hover:shadow-xl hover:shadow-primary/5 transition-all group"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    {/* Merchant Info */}
                    <div className="flex items-start gap-6">
                      <div className="w-20 h-20 bg-muted rounded-[2rem] flex items-center justify-center text-muted-foreground shrink-0 border border-border shadow-inner group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                        <Store size={32} />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-2xl font-black text-foreground truncate">
                            {request.merchant?.store_name || t("admin.officialStore")}
                          </h3>
                          <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-[10px] font-black uppercase tracking-widest border border-border">
                            {t("admin.Current")}
                            {request.merchant?.level}
                          </span>
                        </div>
                        <p className="text-muted-foreground font-medium flex items-center gap-1.5 leading-none">
                          <User size={14} className="opacity-60" />
                          {request.merchant?.name || t("admin.merchantUser")}
                        </p>
                        <p className="text-xs text-muted-foreground font-black uppercase tracking-widest pt-2 flex items-center gap-1.5">
                          <Clock size={12} />
                          {t("admin.requested")}
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Request Details */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 lg:ml-auto">
                      <div className="flex flex-col items-center px-8 py-4 bg-primary/5 rounded-3xl border border-primary/10 min-w-35 relative overflow-hidden group/lvl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60 mb-1 z-10">
                          {t("admin.targetLevel")}
                        </p>
                        <p className="text-4xl font-black text-primary z-10">
                          L{request.requested_level}
                        </p>
                        <TrendingUp
                          size={60}
                          className="absolute -right-4 -bottom-4 text-primary opacity-5 rotate-12 group-hover/lvl:scale-110 transition-transform"
                        />
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button
                          variant="ghost"
                          className="flex-1 sm:flex-none h-14 px-6 rounded-2xl text-destructive font-black hover:bg-destructive/10 gap-2 border border-transparent hover:border-destructive/20"
                          onClick={() => initReject(request)}
                          disabled={!!processingId}
                        >
                          <XCircle size={20} />
                          {t("admin.reject")}
                        </Button>
                        <Button
                          className="flex-1 sm:flex-none h-14 px-10 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black shadow-xl shadow-primary/20 gap-2 overflow-hidden relative"
                          onClick={() =>
                            handleResponse(
                              request.id,
                              "approved",
                              request.merchant_id,
                              request.requested_level,
                            )
                          }
                          disabled={!!processingId}
                        >
                          {processingId === request.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle size={20} />
                              {t("admin.approve")}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Guidelines Card */}
        <div className="bg-muted/30 border border-border rounded-[2.5rem] p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-14 h-14 bg-background rounded-2xl flex items-center justify-center text-primary border border-border shadow-sm shrink-0">
            <AlertCircle size={28} />
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-lg font-black text-foreground">
              {t("admin.reviewPolicy")}
            </h4>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              {t("admin.reviewPolicyDesc")}
            </p>
          </div>
        </div>
      </div>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("admin.rejectReason")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.provideRejectionReason", {
                name: rejectingRequest?.merchant?.store_name || "",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">{t("admin.rejectionReason")}</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectError) setRejectError(undefined);
                }}
                placeholder={t("admin.rejectionReasonPlaceholder")}
                rows={4}
                className={
                  rejectError
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
              />
              {rejectError && (
                <p className="text-xs text-destructive mt-1">{rejectError}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={!!processingId}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={!!processingId || !rejectReason.trim()}
              onClick={() => {
                if (rejectingRequest) {
                  const result = rejectSchema.safeParse({
                    reason: rejectReason,
                  });
                  if (!result.success) {
                    setRejectError(result.error.issues[0].message);
                    return;
                  }
                  handleResponse(
                    rejectingRequest.id,
                    "rejected",
                    rejectingRequest.merchant_id,
                    rejectingRequest.requested_level,
                    rejectReason,
                  );
                }
              }}
            >
              {processingId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("admin.confirmRejection")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Client;
