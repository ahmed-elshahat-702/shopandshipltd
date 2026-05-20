"use client";

import { getPlatformSettingsAction } from "@/app/actions/admin";
import {
  getMerchantWalletAction,
  submitWalletTransactionAction,
} from "@/app/actions/merchant";
import { saveWalletAction } from "@/app/actions/wallet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlatformSettings } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowUpRight,
  Bookmark,
  Coins,
  Copy,
  Image as ImageIcon,
  Info,
  Loader2,
  PiggyBank,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";
import { WalletSelector } from "./WalletSelector";

interface WalletActionDialogProps {
  type: "recharge" | "withdrawal";
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userRole?: string;
  adminWalletAddress?: string;
  userWalletAddress?: string;
}

export default function WalletActionDialog({
  type,
  isOpen,
  onClose,
  userId,
  userRole = "customer",
  adminWalletAddress,
  userWalletAddress,
}: WalletActionDialogProps) {
  const t = useTranslations();
  const { mutate } = useSWRConfig();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState(userWalletAddress || "");
  const [saveToPortfolio, setSaveToPortfolio] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    amount?: string;
    description?: string;
    proof?: string;
  }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isRecharge = type === "recharge";

  const { data: settings } = useSWR(
    "platform_settings",
    getPlatformSettingsAction,
  );
  const { data: walletData } = useSWR(
    userId ? ["merchant_wallet", userId] : null,
    () => getMerchantWalletAction(userId),
  );

  const walletBalance =
    (walletData && !("error" in walletData) ? walletData.wallet?.balance : 0) ||
    0;
  const isWalletLocked = Boolean(
    walletData && !("error" in walletData) && walletData.wallet?.is_locked,
  );

  const platformSettings: PlatformSettings | null =
    settings && !("error" in settings) ? settings : null;

  const canWithdraw =
    userRole === "merchant"
      ? (platformSettings?.allowMerchantWithdrawal ?? true) !== false
      : (platformSettings?.allowCustomerWithdrawal ?? true) !== false;

  const minWithdraw = platformSettings?.minWithdrawalAmount || 10;

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setDescription(userWalletAddress || "");
      setProofFile(null);
      setProofPreview(null);
      setFieldErrors({});
      setSaveToPortfolio(false);
    }
  }, [isOpen, userWalletAddress]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProofPreview(reader.result as string);
      reader.readAsDataURL(file);
      if (fieldErrors.proof)
        setFieldErrors((prev) => ({ ...prev, proof: undefined }));
    }
  };

  const handleCopy = () => {
    if (adminWalletAddress) {
      navigator.clipboard.writeText(adminWalletAddress);
      toast.success(t("common.linkCopied"));
    }
  };

  const handleSubmit = async () => {
    if (isWalletLocked) {
      toast.error(t("wallet.lockedByAdmin"));
      return;
    }

    const errors: typeof fieldErrors = {};
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
      errors.amount = t("auth.errors.invalidAmount") || "Invalid amount";

    if (!description)
      errors.description =
        t("auth.errors.walletRequired") || "Wallet address is required";

    if (isRecharge && !proofFile)
      errors.proof =
        t("auth.errors.proofRequired") || "Proof image is required";

    const numAmount = parseFloat(amount);
    if (!isRecharge) {
      if (!canWithdraw) {
        toast.error(
          t("wallet.withdrawalDisabled") ||
            "Withdrawals are currently disabled",
        );
        return;
      }
      if (walletBalance <= 0) {
        toast.error(t("wallet.noBalance") || "You have no balance to withdraw");
        return;
      }
      if (numAmount > walletBalance) {
        toast.error(t("wallet.insufficientBalance") || "Insufficient balance");
        return;
      }
      if (numAmount < minWithdraw) {
        toast.error(
          `${t("wallet.minWithdrawalError") || "Minimum withdrawal amount is"} $${minWithdraw}`,
        );
        return;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      // 1. Save wallet if requested
      if (saveToPortfolio && description) {
        await saveWalletAction(description);
      }

      // 2. Submit transaction
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("type", type);
      formData.append("amount", amount);
      formData.append("description", description);
      if (proofFile) formData.append("proofFile", proofFile);

      const res = await submitWalletTransactionAction(formData);

      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("messages.walletActionSuccess"));
        mutate(["merchant_wallet", userId]);
        mutate(["merchant_transactions", userId]);
        mutate([
          userRole === "merchant" ? "merchant-wallet" : "customer-wallet",
          userId,
        ]);
        onClose();
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none rounded-[2.5rem] shadow-2xl">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-8 md:p-12 space-y-10">
            <DialogHeader className="space-y-4">
              <div className="flex items-center gap-4 text-left">
                <div
                  className={cn(
                    "w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl",
                    isRecharge
                      ? "bg-primary text-white shadow-primary/20 rotate-3"
                      : "bg-orange-500 text-white shadow-orange-500/20 -rotate-3",
                  )}
                >
                  {isRecharge ? (
                    <PiggyBank size={32} />
                  ) : (
                    <ArrowUpRight size={32} />
                  )}
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-3xl md:text-4xl font-black tracking-tight">
                    {isRecharge
                      ? t("wallet.rechargeTitle")
                      : t("wallet.withdrawTitle")}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground font-medium">
                    {isRecharge
                      ? t("wallet.rechargeDesc")
                      : t("wallet.withdrawDesc")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {isWalletLocked && (
                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex gap-3 items-start">
                  <AlertTriangle
                    size={18}
                    className="text-destructive shrink-0 mt-0.5"
                  />
                  <p className="text-xs font-bold text-destructive uppercase leading-relaxed">
                    {t("wallet.lockedByAdmin")}
                  </p>
                </div>
              )}

              <div className="space-y-8">
                <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest pl-1 text-muted-foreground">
                    {t("wallet.amount")}
                  </Label>
                  <div className="relative group">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        if (fieldErrors.amount)
                          setFieldErrors((prev) => ({
                            ...prev,
                            amount: undefined,
                          }));
                      }}
                      className={cn(
                        "h-16 rounded-2xl border-2 pl-12 text-2xl font-black transition-all bg-muted/30 focus:bg-background",
                        fieldErrors.amount
                          ? "border-destructive focus-visible:ring-destructive"
                          : "focus-visible:ring-primary",
                      )}
                    />
                    <Coins
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
                      size={24}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground/30 text-xl">
                      $
                    </span>
                  </div>
                  {fieldErrors.amount && (
                    <p className="text-[10px] font-bold text-destructive pl-1 uppercase tracking-wider">
                      {fieldErrors.amount}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <WalletSelector
                    label={
                      isRecharge ? t("wallet.fromWallet") : t("wallet.toWallet")
                    }
                    value={description}
                    onChange={setDescription}
                    placeholder={t("wallet.walletAddress")}
                    error={fieldErrors.description}
                  />

                  <div className="flex items-center space-x-3 px-1">
                    <Checkbox
                      id="savePortfolio"
                      checked={saveToPortfolio}
                      onCheckedChange={(checked) =>
                        setSaveToPortfolio(!!checked)
                      }
                      className="rounded-md h-5 w-5 border-2"
                    />
                    <label
                      htmlFor="savePortfolio"
                      className="text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer select-none flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <Bookmark size={12} />
                      {t("wallet.saveToPortfolio")}
                    </label>
                  </div>
                </div>
              </div>

              {isRecharge ? (
                <div className="space-y-6">
                  <div className="p-6 rounded-[2rem] bg-muted/30 border-2 border-dashed border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                        {t("admin.adminWalletAddress")}
                      </Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl"
                        onClick={handleCopy}
                      >
                        <Copy size={14} />
                      </Button>
                    </div>
                    <p className="font-bold text-xs break-all bg-card p-4 rounded-xl border border-border">
                      {adminWalletAddress || "Loading..."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase tracking-widest pl-1 text-muted-foreground">
                      {t("wallet.receiptImage")}
                    </Label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "relative aspect-video rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-muted/50 transition-all overflow-hidden group",
                        fieldErrors.proof
                          ? "border-destructive bg-destructive/5"
                          : "border-border",
                      )}
                    >
                      {proofPreview ? (
                        <>
                          <Image
                            src={proofPreview}
                            alt="Receipt Preview"
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Upload className="text-white" size={32} />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                            <ImageIcon size={32} />
                          </div>
                          <div className="text-center px-4">
                            <p className="font-black text-xs uppercase tracking-widest">
                              {t("common.clickToUpload")}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-tighter">
                              JPG, PNG, PDF (MAX 5MB)
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    {fieldErrors.proof && (
                      <p className="text-[10px] font-bold text-destructive pl-1 uppercase tracking-wider">
                        {fieldErrors.proof}
                      </p>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*,.pdf"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-orange-500/5 rounded-[2.5rem] p-8 border-2 border-orange-500/10 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg">
                      <Info size={24} />
                    </div>
                    <h4 className="text-xl font-black tracking-tight">
                      {t("wallet.limitInfo")}
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-orange-500/10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          {t("wallet.min")}
                        </span>
                        <span className="font-black text-orange-600">
                          ${minWithdraw.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {!canWithdraw && (
                      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex gap-2 items-start">
                        <AlertTriangle
                          size={14}
                          className="text-destructive shrink-0 mt-0.5"
                        />
                        <p className="text-[10px] font-bold text-destructive uppercase leading-relaxed">
                          {t("wallet.withdrawalDisabledMsg")}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed tracking-wider opacity-60">
                    * {t("wallet.withdrawDesc")}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="pt-6">
              <Button
                disabled={loading || isWalletLocked || (!isRecharge && !canWithdraw)}
                onClick={handleSubmit}
                className={cn(
                  "w-full h-16 rounded-2xl text-lg font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95",
                  isRecharge
                    ? "bg-primary hover:bg-primary/90 shadow-primary/20"
                    : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20",
                )}
              >
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  t("common.confirm")
                )}
              </Button>
            </DialogFooter>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
