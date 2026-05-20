"use client";

import {
  approveMerchantApplicationAction,
  getAdminMerchantApplicationsAction,
  rejectMerchantApplicationAction,
} from "@/app/actions/admin";
import LoadingSpinner from "@/components/LoadingSpinner";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Heart,
  Maximize2,
  MoreVertical,
  RotateCw,
  Store,
  User,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useEffect } from "react";
import useSWR, { mutate } from "swr";
import { z } from "zod";

const rejectSchema = z.object({
  reason: z
    .string()
    .min(5, "Rejection reason must be at least 5 characters long")
    .max(500, "Reason is too long"),
});

interface Application {
  id: string;
  user_id: string;
  store_type: string;
  store_name: string;
  store_description: string;
  store_category: string;
  store_logo: string | null;
  nationality: string;
  id_type: string;
  id_number: string;
  id_expiry: string;
  issuing_country: string;
  id_front_url: string;
  id_back_url: string;
  selfie_url: string;
  status: string;
  created_at: string;
  user: {
    full_name: string;
    email: string;
  };
}

interface ApplicationsClientProps {
  initialApplications: Application[];
  totalCount: number;
  totalPages: number;
}

export default function ApplicationsClient({
  initialApplications,
  totalCount: initialTotal,
  totalPages: initialTotalPages,
}: ApplicationsClientProps) {
  const t = useTranslations();
  const [activeStatus, setActiveStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [appToApprove, setAppToApprove] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [viewingDocumentTitle, setViewingDocumentTitle] = useState("");
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const viewerRef = useRef<HTMLDivElement>(null);

  const handleFullscreen = () => {
    if (viewerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        viewerRef.current.requestFullscreen().catch((err) => {
          toast.error(
            `Error attempting to enable full-screen mode: ${err.message}`,
          );
        });
      }
    }
  };

  const handleViewDocument = (url: string, title: string) => {
    setViewingDocument(url);
    setViewingDocumentTitle(title);
    setRotation(0);
    setIsDocViewerOpen(true);
  };

  const { data: appsData, isLoading } = useSWR(
    ["admin-merchant-applications", activeStatus, page],
    () => getAdminMerchantApplicationsAction({ page, status: activeStatus }),
    {
      revalidateOnFocus: false,
      fallbackData:
        page === 1 && activeStatus === "pending"
          ? {
              applications: initialApplications,
              total: initialTotal,
              totalPages: initialTotalPages,
              page: 1,
              limit: 10,
            }
          : undefined,
    },
  );

  const apps =
    appsData && "applications" in appsData ? appsData.applications || [] : [];
  const totalPages =
    appsData && "totalPages" in appsData ? appsData.totalPages || 1 : 1;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-applications-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "merchant_applications",
        },
        () => {
          mutate(["admin-merchant-applications", activeStatus, page]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeStatus, page]);

  const handleApprove = (id: string) => {
    setAppToApprove(id);
    setIsApproveOpen(true);
  };

  const onConfirmApprove = async () => {
    if (!appToApprove) return;

    setIsSubmitting(true);
    try {
      const res = await approveMerchantApplicationAction(appToApprove);
      if (res.success) {
        toast.success(
          t("admin.merchantApproved") || "Merchant approved successfully",
        );
        mutate(["admin-merchant-applications", activeStatus, page]);
        setIsDetailOpen(false);
        setIsApproveOpen(false);
        setAppToApprove(null);
      } else {
        throw new Error(res.error);
      }
    } catch (error) {
      toast.error(t("common.error"));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectReason) return;
    const result = rejectSchema.safeParse({ reason: rejectReason });
    if (!result.success) {
      setRejectError(result.error.issues[0].message);
      return;
    }
    setRejectError(undefined);

    setIsSubmitting(true);
    try {
      const res = await rejectMerchantApplicationAction(
        selectedApp.id,
        rejectReason,
      );
      if (res.success) {
        toast.success(
          t("admin.merchantRejected") || "Merchant application rejected",
        );
        mutate(["admin-merchant-applications", activeStatus, page]);
        setIsRejectOpen(false);
        setIsDetailOpen(false);
        setRejectReason("");
      } else {
        throw new Error(res.error);
      }
    } catch (error) {
      toast.error(t("common.error"));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStoreTypeIcon = (type: string) => {
    switch (type) {
      case "personal":
        return <User className="text-blue-500" size={16} />;
      case "enterprise":
        return <Building2 className="text-purple-500" size={16} />;
      case "charity":
        return <Heart className="text-red-500" size={16} />;
      default:
        return <Store className="text-gray-500" size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            {t("admin.applications") || "Merchant Applications"}
          </h1>
          <p className="text-muted-foreground font-medium">
            {t("admin.manageApplicationsDesc") ||
              "Review and approve new merchant requests"}
          </p>
        </div>
      </div>

      <Tabs
        defaultValue="pending"
        onValueChange={(v) => {
          setActiveStatus(v);
          setPage(1);
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl h-auto border-2">
            <TabsTrigger
              value="pending"
              className="rounded-lg px-6 py-2 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {t("merchant.kyc.pending")}
            </TabsTrigger>
            <TabsTrigger
              value="approved"
              className="rounded-lg px-6 py-2 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {t("merchant.kyc.approved")}
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="rounded-lg px-6 py-2 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {t("merchant.kyc.rejected")}
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="rounded-lg px-6 py-2 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {t("common.all")}
            </TabsTrigger>
          </TabsList>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <LoadingSpinner />
          </div>
        ) : (
          <Card className="rounded-[2rem] border-2 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-4">
                    {t("admin.applicant")}
                  </TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-4">
                    {t("admin.store")}
                  </TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-4">
                    {t("admin.type")}
                  </TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-4">
                    {t("admin.status")}
                  </TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-4">
                    {t("admin.date")}
                  </TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-4 text-right">
                    {t("admin.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-48 text-center text-muted-foreground font-medium italic"
                    >
                      {t("admin.noPendingApplications") ||
                        "No applications found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  apps.map((app) => (
                    <TableRow
                      key={app.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-sm">
                            {app.user.full_name}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            {app.user.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden relative border shadow-sm">
                            {app.store_logo ? (
                              <Image
                                src={app.store_logo}
                                alt={app.store_name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <Store
                                size={18}
                                className="text-muted-foreground"
                              />
                            )}
                          </div>
                          <span className="font-bold text-sm">
                            {app.store_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted w-fit border text-[10px] font-black uppercase tracking-wider shadow-sm">
                          {getStoreTypeIcon(app.store_type)}
                          {t(`merchant.apply.${app.store_type}Store`)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(app.status)}`}
                        >
                          {t(`merchant.kyc.${app.status}`)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                          <Calendar size={12} />
                          {new Date(app.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl hover:bg-muted"
                            >
                              <MoreVertical size={18} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="rounded-xl border-2 p-2 min-w-40 shadow-xl"
                          >
                            <DropdownMenuItem
                              className="font-black text-xs uppercase tracking-widest gap-3 p-3 cursor-pointer rounded-lg"
                              onClick={() => {
                                setSelectedApp(app);
                                setIsDetailOpen(true);
                              }}
                            >
                              <Eye size={16} className="text-primary" />{" "}
                              {t("common.view")}
                            </DropdownMenuItem>
                            {app.status === "pending" && (
                              <>
                                <DropdownMenuItem
                                  className="font-black text-xs uppercase tracking-widest gap-3 p-3 cursor-pointer text-green-600 focus:text-green-600 focus:bg-green-50 rounded-lg"
                                  onClick={() => handleApprove(app.id)}
                                >
                                  <CheckCircle2 size={16} />{" "}
                                  {t("common.approve")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="font-black text-xs uppercase tracking-widest gap-3 p-3 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg"
                                  onClick={() => {
                                    setSelectedApp(app);
                                    setIsRejectOpen(true);
                                  }}
                                >
                                  <XCircle size={16} /> {t("common.reject")}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </Tabs>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 1 || isLoading}
            className="rounded-xl h-12 border-2 px-6 font-black"
          >
            <ChevronLeft size={20} className="mr-2" /> {t("common.prev")}
          </Button>
          <div className="bg-muted/50 px-4 py-2 rounded-xl border-2 font-black text-sm">
            {page} / {totalPages}
          </div>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages || isLoading}
            className="rounded-xl h-12 border-2 px-6 font-black"
          >
            {t("common.next")} <ChevronRight size={20} className="ml-2" />
          </Button>
        </div>
      )}

      {/* Application Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="min-w-fit max-h-[90vh] rounded-[2.5rem] overflow-y-auto">
          {selectedApp && (
            <div className="space-y-8 p-4">
              <DialogHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center shrink-0 overflow-hidden relative border-2">
                    {selectedApp.store_logo ? (
                      <Image
                        src={selectedApp.store_logo}
                        alt={selectedApp.store_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Store size={24} className="text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black">
                      {selectedApp.store_name}
                    </DialogTitle>
                    <DialogDescription className="font-bold flex items-center gap-2">
                      {getStoreTypeIcon(selectedApp.store_type)}
                      {t(
                        `merchant.apply.${selectedApp.store_type}Store`,
                      )} • {selectedApp.store_category}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Applicant Info */}
                <div className="space-y-4">
                  <h3 className="font-black uppercase tracking-widest text-xs text-primary">
                    {t("admin.applicantInfo") || "Applicant Information"}
                  </h3>
                  <div className="space-y-3 bg-muted/30 p-6 rounded-3xl border-2">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground text-sm font-bold">
                        {t("merchant.apply.fullName") || "Full Name"}
                      </span>
                      <span className="font-black text-sm">
                        {selectedApp.user.full_name}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground text-sm font-bold">
                        {t("common.email")}
                      </span>
                      <span className="font-black text-sm">
                        {selectedApp.user.email}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground text-sm font-bold">
                        {t("merchant.apply.nationality")}
                      </span>
                      <span className="font-black text-sm">
                        {selectedApp.nationality}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground text-sm font-bold">
                        {t("merchant.apply.issuingCountry")}
                      </span>
                      <span className="font-black text-sm">
                        {selectedApp.issuing_country}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Identity Info */}
                <div className="space-y-4">
                  <h3 className="font-black uppercase tracking-widest text-xs text-primary">
                    {t("admin.identityInfo") || "Identity Information"}
                  </h3>
                  <div className="space-y-3 bg-muted/30 p-6 rounded-3xl border-2">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground text-sm font-bold">
                        {t("merchant.apply.idType")}
                      </span>
                      <span className="font-black text-sm uppercase">
                        {selectedApp.id_type}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground text-sm font-bold">
                        {t("merchant.apply.idNumber")}
                      </span>
                      <span className="font-black text-sm">
                        {selectedApp.id_number}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground text-sm font-bold">
                        {t("merchant.apply.idExpiry")}
                      </span>
                      <span className="font-black text-sm">
                        {selectedApp.id_expiry}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Store Description */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="font-black uppercase tracking-widest text-xs text-primary">
                    {t("merchant.storeDescription")}
                  </h3>
                  <div className="bg-muted/30 p-6 rounded-3xl border-2">
                    <p className="text-sm font-medium leading-relaxed">
                      {selectedApp.store_description ||
                        t("messages.noDescription")}
                    </p>
                  </div>
                </div>

                {/* Verification Documents */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="font-black uppercase tracking-widest text-xs text-primary">
                    {t("merchant.apply.uploadVerification")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      {
                        id: "front",
                        label: t("merchant.apply.idFront"),
                        url: selectedApp.id_front_url,
                      },
                      {
                        id: "back",
                        label: t("merchant.apply.idBack"),
                        url: selectedApp.id_back_url,
                      },
                      {
                        id: "selfie",
                        label: t("merchant.apply.selfie"),
                        url: selectedApp.selfie_url,
                      },
                    ]
                      .filter((doc) => doc.url)
                      .map((doc) => (
                        <div key={doc.id} className="space-y-2">
                          <Label className="font-bold text-[10px] uppercase tracking-widest">
                            {doc.label}
                          </Label>
                          <div className="relative aspect-video rounded-2xl border-2 overflow-hidden bg-muted group">
                            <Image
                              src={doc.url}
                              alt={doc.label}
                              fill
                              className="object-cover transition-transform group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button
                                variant="secondary"
                                size="icon"
                                className="rounded-full"
                                onClick={() =>
                                  handleViewDocument(doc.url, doc.label)
                                }
                              >
                                <Maximize2 size={16} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t-2">
                <Button
                  variant="outline"
                  className="rounded-2xl h-12 px-8 font-black"
                  onClick={() => setIsRejectOpen(true)}
                  disabled={isSubmitting}
                >
                  <XCircle className="mr-2" size={18} /> {t("common.reject")}
                </Button>
                <Button
                  className="rounded-2xl h-12 px-12 font-black shadow-xl shadow-primary/20"
                  onClick={() => handleApprove(selectedApp.id)}
                  disabled={isSubmitting}
                >
                  <CheckCircle2 className="mr-2" size={18} />{" "}
                  {t("common.approve")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="rounded-[2.5rem] border-4">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              {t("admin.rejectApplication") || "Reject Application"}
            </DialogTitle>
            <DialogDescription className="font-bold">
              {t("admin.rejectReasonDesc") ||
                "Please provide a reason for rejecting this merchant application. The user will see this."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="font-black uppercase tracking-widest text-[10px] mb-2 block">
              {t("admin.rejectionReason")}
            </Label>
            <Textarea
              placeholder={
                t("admin.placeholderRejectionReason") ||
                "e.g. Identity document is not clear"
              }
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (rejectError) setRejectError(undefined);
              }}
              className={cn(
                "rounded-2xl border-2 min-h-30 font-medium",
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
            <Button
              variant="ghost"
              className="rounded-xl font-bold"
              onClick={() => setIsRejectOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl font-black"
              onClick={handleReject}
              disabled={!rejectReason || isSubmitting}
            >
              {t("admin.confirmReject") || "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black">
              {t("common.confirm") || "Confirm Action"}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-bold">
              {t("admin.confirmApproveMerchant") ||
                "Are you sure you want to approve this merchant?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl font-black shadow-lg shadow-primary/20"
              onClick={onConfirmApprove}
              disabled={isSubmitting}
            >
              {isSubmitting ? t("common.submitting") : t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Viewer Dialog */}
      <Dialog open={isDocViewerOpen} onOpenChange={setIsDocViewerOpen}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden flex flex-col rounded-[2.5rem] border-4 border-white/20 shadow-2xl bg-background">
          <DialogHeader className="px-8 py-5 border-b border-border flex flex-row items-center justify-between bg-card shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <ExternalLink size={28} />
              </div>
              <div className="flex flex-col text-left">
                <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground">
                  {viewingDocumentTitle || t("admin.document")}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {selectedApp?.store_name || "Verification Document"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="rounded-2xl h-12 w-12 border-2 hover:bg-muted transition-all active:scale-95"
                title="Rotate Clockwise"
              >
                <RotateCw size={22} className="text-muted-foreground" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={handleFullscreen}
                className="rounded-2xl h-12 w-12 border-2 hover:bg-primary hover:text-white transition-all active:scale-95"
                title="View Full Screen"
              >
                <Maximize2 size={22} />
              </Button>
            </div>
          </DialogHeader>

          <div
            ref={viewerRef}
            className="flex-1 bg-[#121212] relative overflow-hidden flex items-center justify-center p-8 group"
          >
            {/* mesh background for contrast */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: "24px 24px",
              }}
            />

            {viewingDocument ? (
              <div
                className={cn(
                  "relative w-full h-full transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)",
                  rotation === 90 && "rotate-90",
                  rotation === 180 && "rotate-180",
                  rotation === 270 && "rotate-270",
                )}
              >
                <Image
                  src={viewingDocument}
                  alt="KYC Document"
                  fill
                  className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                  priority
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-white/50">
                <ExternalLink size={48} className="opacity-20 translate-y-2" />
                <p className="font-black uppercase tracking-widest text-xs">
                  {t("messages.noResults") || "No document available"}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
