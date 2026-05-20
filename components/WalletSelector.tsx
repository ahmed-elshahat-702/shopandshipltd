"use client";

import React, { useState, useEffect, Fragment } from "react";
import { useTranslations } from "next-intl";
import { Wallet, Plus, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getSavedWalletsAction, deleteWalletAction } from "@/app/actions/wallet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SavedWallet {
  id: string;
  walletNumber: string;
  label: string;
}

interface WalletSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  error?: string;
}

export function WalletSelector({ value, onChange, label, placeholder, error }: WalletSelectorProps) {
  const t = useTranslations();
  const [wallets, setWallets] = useState<SavedWallet[]>([]);
  const [isManual, setIsManual] = useState(false);

  useEffect(() => {
    async function loadWallets() {
      const res = await getSavedWalletsAction();
      if ("wallets" in res) {
        setWallets(res.wallets as SavedWallet[]);
      }
    }
    loadWallets();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const res = await deleteWalletAction(id);
    if ("success" in res) {
      setWallets(prev => prev.filter(w => w.id !== id));
      if (wallets.find(w => w.id === id)?.walletNumber === value) {
        onChange("");
      }
      toast.success("Wallet removed");
    }
  };

  const selectedWallet = wallets.find(w => w.walletNumber === value);

  return (
    <div className="space-y-2">
      <Label className="font-black text-[10px] uppercase tracking-widest pl-1 text-muted-foreground">
        {label}
      </Label>
      
      {!isManual ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className={cn(
                "w-full h-12 rounded-2xl justify-between px-4 border-2 font-bold transition-all",
                error ? "border-destructive" : "hover:border-primary/50",
                !value && "text-muted-foreground font-medium"
              )}
            >
              <div className="flex items-center gap-3 truncate">
                <Wallet size={18} className={cn(value ? "text-primary" : "text-muted-foreground")} />
                <span className="truncate">
                  {selectedWallet ? selectedWallet.label : (value || placeholder || t("wallet.selectWallet"))}
                </span>
              </div>
              <ChevronDown size={16} className="opacity-50 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-2xl p-2 border-2 shadow-xl">
            {wallets.length > 0 && (
              <Fragment key="saved-wallets-section">
                <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {t("wallet.savedWallets")}
                </div>
                {wallets.map((wallet) => (
                  <DropdownMenuItem 
                    key={wallet.id}
                    onClick={() => onChange(wallet.walletNumber)}
                    className="rounded-xl flex items-center justify-between p-3 cursor-pointer group"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-sm">{wallet.label}</span>
                      <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[200px]">
                        {wallet.walletNumber}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                      onClick={(e) => handleDelete(e, wallet.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="my-2" />
              </Fragment>
            )}
            
            <DropdownMenuItem 
              key="manual-entry-button"
              onClick={() => setIsManual(true)}
              className="rounded-xl p-3 cursor-pointer flex items-center gap-3 text-primary font-bold"
            >
              <Plus size={18} />
              {t("wallet.enterManually")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="relative group">
            <Input
              placeholder={placeholder || t("wallet.newWallet")}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={cn(
                "h-12 rounded-2xl border-2 pl-11 font-bold transition-all",
                error ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-primary"
              )}
            />
            <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
                setIsManual(false);
                if (wallets.length > 0 && !wallets.find(w => w.walletNumber === value)) {
                   // Keep the manual value if it was typed, or clear it if it's empty
                }
            }}
            className="self-end text-[10px] font-black uppercase tracking-widest h-auto py-1 px-2 opacity-60 hover:opacity-100"
          >
            {t("wallet.savedWallets")}
          </Button>
        </div>
      )}
      
      {error && <p className="text-[10px] font-bold text-destructive pl-1 uppercase tracking-wider">{error}</p>}
    </div>
  );
}
