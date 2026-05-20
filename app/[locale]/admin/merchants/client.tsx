"use client";

import {
  deleteMerchantAction,
  getAdminMerchantsAction,
  updateAdminMerchantAction,
} from "@/app/actions/admin";
import { AdminMerchantsResponse, MerchantProfile } from "@/lib/types";
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
import {
  Dialog,
  DialogContent,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  MoreVertical,
  Pencil,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { useDebounce } from "@/hooks/use-debounce";
import { useUser } from "@/hooks/use-auth";
import Image from "next/image";
import { z } from "zod";
import { cn } from "@/lib/utils";

const editMerchantSchema = z.object({
  business_name: z
    .string()
    .min(2, "Store name must be at least 2 characters")
    .max(100, "Store name is too long"),
});

interface MerchantsClientProps {
  initialMerchants: AdminMerchantsResponse;
}

export default function MerchantsClient({
  initialMerchants,
}: MerchantsClientProps) {
  const t = useTranslations();
  const { user } = useUser();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [merchantToDelete, setMerchantToDelete] = useState<string | null>(null);
  const [editingMerchant, setEditingMerchant] = useState<{
    id: string;
    business_name: string;
    is_active: boolean;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ business_name?: string }>(
    {},
  );

  // Reset page to 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Fetch Active Merchants with SWR
  const { data: merchantsData, isLoading: loadingMerchants } = useSWR(
    ["admin-merchants", page, debouncedSearch],
    () => getAdminMerchantsAction({ page, search: debouncedSearch }),
    {
      revalidateOnFocus: false,
      fallbackData:
        page === 1 && !debouncedSearch ? initialMerchants : undefined,
    },
  );

  const merchants = merchantsData?.merchants || [];
  const totalPages = merchantsData?.totalPages || 1;

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await deleteMerchantAction(id);
      if ("error" in res && res.error) throw new Error(res.error);
      toast.success(t("messages.merchantDeleteSuccess") || "Merchant deleted");
      mutate(["admin-merchants", page, debouncedSearch]);
      setMerchantToDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error deleting merchant",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const MerchantSkeleton = () => (
    <div className="bg-card rounded-[2.5rem] border border-border overflow-hidden p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="py-3 border-y border-dashed border-border flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="py-1 flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Skeleton className="h-12 flex-1 rounded-2xl" />
        <Skeleton className="h-12 w-12 rounded-2xl" />
      </div>
    </div>
  );

  const handleUpdateMerchant = async () => {
    if (!editingMerchant) return;
    const result = editMerchantSchema.safeParse({
      business_name: editingMerchant.business_name,
    });
    if (!result.success) {
      setFieldErrors({ business_name: result.error.issues[0].message });
      return;
    }
    setFieldErrors({});

    setIsUpdating(true);
    try {
      const res = await updateAdminMerchantAction(editingMerchant.id, {
        business_name: editingMerchant.business_name,
        is_active: editingMerchant.is_active,
      });
      if ("error" in res) throw new Error(res.error);
      toast.success(t("messages.merchantUpdateSuccess") || "Merchant updated");
      setEditingMerchant(null);
      mutate(["admin-merchants", page, debouncedSearch]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error updating merchant",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
              <ShoppingBag size={12} />
              {t("admin.merchantManagement")}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
              {t("admin.merchants")}
            </h1>
            <p className="text-muted-foreground font-medium text-lg max-w-xl">
              {t("admin.activeMerchants")}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative max-w-2xl mx-auto mb-8">
            <Search
              size={22}
              className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder={t("admin.searchMerchants")}
              className="pl-16 h-16 rounded-[2rem] bg-card border-2 border-border shadow-2xl shadow-primary/5 font-medium text-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loadingMerchants ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <MerchantSkeleton key={i} />
              ))}
            </div>
          ) : merchants.length === 0 ? (
            <div className="text-center py-32 bg-card rounded-[3rem] border-2 border-dashed border-border">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground/20">
                <Users size={48} />
              </div>
              <h2 className="text-2xl font-black">{t("admin.noUsersMatch")}</h2>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {merchants.map((merchant: MerchantProfile) => (
                <div
                  key={merchant.id}
                  className="group bg-card rounded-[2.5rem] border border-border overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative flex flex-col"
                >
                  <div className="p-8 space-y-6 flex-1">
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 bg-muted">
                        <div className="relative w-full h-full flex items-center justify-center text-primary bg-primary/5">
                          {merchant.logo_url ? (
                            <Image
                              src={merchant.logo_url}
                              alt="merchant logo"
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <Store size={28} />
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-black tracking-tight">
                          {merchant.business_name ||
                            merchant.profiles?.full_name ||
                            "Unnamed Merchant"}
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                          {merchant.business_category || "Merchant"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-3 border-y border-dashed border-border">
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                          {t("admin.memberSince")}
                        </span>
                        <span className="text-xs font-bold">
                          {new Date(merchant.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${merchant.profiles?.is_active ? "bg-green-500" : "bg-red-400"}`}
                          />
                          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                            {merchant.profiles?.is_active
                              ? t("admin.activeStatus")
                              : t("admin.inactiveStatus")}
                          </span>
                        </div>
                        <span className="text-xs font-bold truncate max-w-35">
                          {merchant.profiles?.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0 flex gap-3">
                    <Button
                      asChild
                      className="flex-1 rounded-2xl h-12 font-black gap-2 shadow-lg shadow-primary/20"
                    >
                      <Link
                        href={
                          user?.role === "merchant" && user.merchantId === merchant.id
                            ? "/merchant/dashboard"
                            : `/merchants/${merchant.id}`
                        }
                        target="_blank"
                      >
                        <ExternalLink size={16} />
                        {t("admin.enterMerchant")}
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-2xl h-12 w-12 border-2"
                        >
                          <MoreVertical size={20} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="rounded-xl border-2 p-2 min-w-40">
                        <DropdownMenuItem
                          onClick={() =>
                            setEditingMerchant({
                              id: merchant.profiles?.id || "",
                              business_name: merchant.business_name || "",
                              is_active: merchant.profiles?.is_active ?? true,
                            })
                          }
                          className="rounded-lg font-bold p-3 cursor-pointer gap-2"
                        >
                          <Pencil size={16} />
                          {t("admin.editProfile")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setMerchantToDelete(merchant.profiles?.id || null)
                          }
                          className="rounded-lg font-bold p-3 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50 gap-2"
                        >
                          <Trash2 size={16} />
                          {t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="rounded-xl h-12 border-2"
              >
                <ChevronLeft size={20} />
              </Button>
              <span className="font-bold">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="rounded-xl h-12 border-2"
              >
                <ChevronRight size={20} />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog
        open={!!merchantToDelete}
        onOpenChange={(open) =>
          !open && !isDeleting && setMerchantToDelete(null)
        }
      >
        <AlertDialogContent className="rounded-[2.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.areYouSure")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.revokeWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 min-w-30"
              onClick={(e) => {
                e.preventDefault();
                if (merchantToDelete) {
                  handleDelete(merchantToDelete);
                }
              }}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("admin.deleteMerchant")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Edit Merchant Dialog */}
      <Dialog
        open={!!editingMerchant}
        onOpenChange={(open) =>
          !open && !isUpdating && setEditingMerchant(null)
        }
      >
        <DialogContent className="rounded-[2.5rem] p-8 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic">
              {t("admin.editMerchant")}
            </DialogTitle>
          </DialogHeader>
          {editingMerchant && (
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {t("admin.businessName")}
                </label>
                <Input
                  className={cn(
                    "h-14 rounded-2xl border-2 font-medium",
                    fieldErrors.business_name &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                  value={editingMerchant.business_name}
                  onChange={(e) => {
                    setEditingMerchant({
                      ...editingMerchant,
                      business_name: e.target.value,
                    });
                    if (fieldErrors.business_name) setFieldErrors({});
                  }}
                  disabled={isUpdating}
                />
                {fieldErrors.business_name && (
                  <p className="text-xs text-destructive mt-1">
                    {fieldErrors.business_name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {t("admin.status")}
                </label>
                <Select
                  disabled={isUpdating}
                  value={editingMerchant.is_active ? "active" : "inactive"}
                  onValueChange={(val) =>
                    setEditingMerchant({
                      ...editingMerchant,
                      is_active: val === "active",
                    })
                  }
                >
                  <SelectTrigger className="h-14 rounded-2xl border-2 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="active">{t("admin.activeStatus")}</SelectItem>
                    <SelectItem value="inactive">{t("admin.inactiveStatus")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="mt-8">
            <Button
              variant="outline"
              className="h-12 rounded-xl font-black"
              onClick={() => setEditingMerchant(null)}
              disabled={isUpdating}
            >
              {t("common.cancel")}
            </Button>
            <Button
              className="h-12 rounded-xl font-black min-w-35"
              onClick={handleUpdateMerchant}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isUpdating ? t("common.saving") : t("admin.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
