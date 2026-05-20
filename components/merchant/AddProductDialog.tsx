"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Info } from "lucide-react";
import useSWR from "swr";
import {
  getMerchantLevelInfoAction,
  addProductToStoreAction,
} from "@/app/actions/merchant";
import { toast } from "sonner";
import { mutate } from "swr";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface AddProductDialogProps {
  merchantId: string;
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AddProductDialog({
  merchantId,
  product,
  isOpen,
  onClose,
}: AddProductDialogProps) {
  const t = useTranslations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: levelInfo, isLoading } = useSWR(
    isOpen && merchantId ? ["merchant_level_info", merchantId] : null,
    () => getMerchantLevelInfoAction(merchantId),
  );

  const commission =
    levelInfo && !("error" in levelInfo) ? levelInfo.commissionPercentage : 15;
  const adminPrice = product?.price || 0;
  const customerPrice = adminPrice * (1 + commission / 100);

  const handleConfirm = async () => {
    if (!merchantId || !product) return;
    setIsSubmitting(true);
    try {
      const res = await addProductToStoreAction(merchantId, product.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(
          t("merchant.addedToStore") || "Added to store successfully",
        );
        mutate(["merchant_store", merchantId]);
        onClose();
      }
    } catch (error) {
      console.error(error);
      toast.error(t("messages.operationFailed") || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-[2rem] p-6 gap-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-foreground">
            {t("merchant.addToStore") || "Add to Store"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            {product.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <>
              {/* Pricing Details */}
              <div className="bg-muted/50 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-sm font-bold text-muted-foreground">
                  <span>{t("merchant.adminPrice") || "Base Price"}:</span>
                  <span className="text-foreground">
                    ${adminPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-muted-foreground">
                  <span>
                    {t("merchant.commission") || "Your Margin"} ({commission}%):
                  </span>
                  <span className="text-green-600">
                    +${((adminPrice * commission) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="pt-3 border-t border-border flex justify-between items-center text-base font-black text-foreground">
                  <span>
                    {t("merchant.customerPrice") || "Customer Price"}:
                  </span>
                  <span className="text-primary">
                    ${customerPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <div className="flex gap-3 text-sm font-medium text-muted-foreground leading-relaxed">
                  <Info className="text-primary shrink-0 mt-0.5" size={18} />
                  <p>
                    {t("merchant.addProductInfo") ||
                      "Adding this product to your store will allow customers to purchase it. You don't need to pay upfront; the product cost will be deducted from your wallet only when an order is placed."}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl font-bold w-full sm:w-auto"
          >
            {t("common.cancel") || "Cancel"}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || isLoading}
            className="rounded-xl font-black shadow-xl shadow-primary/20 w-full sm:w-auto"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin mr-2" size={18} />
            ) : (
              <Plus className="mr-2" size={18} strokeWidth={3} />
            )}
            {t("merchant.addToStoreConfirm") || "Add to Store"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
