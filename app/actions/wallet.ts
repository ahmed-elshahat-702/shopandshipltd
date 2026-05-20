"use server";

import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";

export interface SavedWallet {
  id: string;
  walletNumber: string;
  label: string;
  createdAt?: string;
}

export async function getSavedWalletsAction() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("saved_wallets")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    const wallets = (profile?.saved_wallets as unknown as SavedWallet[]) || [];
    
    return { wallets };
  } catch (error: unknown) {
    console.error("[getSavedWalletsAction Error]:", error);
    return { error: error instanceof Error ? error.message : "Failed to fetch saved wallets" };
  }
}

export async function saveWalletAction(walletNumber: string, label?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("saved_wallets")
      .eq("id", user.id)
      .single();

    if (fetchError) throw fetchError;

    const currentWallets = (profile?.saved_wallets as unknown as SavedWallet[]) || [];
    
    // Check if already exists
    if (currentWallets.find((a) => a.walletNumber === walletNumber)) {
        return { success: true, message: "Wallet already saved" };
    }

    const newWallet: SavedWallet = {
      id: crypto.randomUUID(),
      walletNumber,
      label: label || `Wallet ${walletNumber.substring(0, 4)}...`,
      createdAt: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        saved_wallets: [...currentWallets, newWallet]
      })
      .eq("id", user.id);

    if (updateError) throw updateError;
    return { success: true };
  } catch (error: unknown) {
    console.error("[saveWalletAction Error]:", error);
    return { error: error instanceof Error ? error.message : "Failed to save wallet" };
  }
}

export async function deleteWalletAction(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("saved_wallets")
      .eq("id", user.id)
      .single();

    if (fetchError) throw fetchError;

    const currentWallets = (profile?.saved_wallets as unknown as SavedWallet[]) || [];
    const updatedWallets = currentWallets.filter((a) => a.id !== id);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        saved_wallets: updatedWallets
      })
      .eq("id", user.id);

    if (updateError) throw updateError;
    return { success: true };
  } catch (error: unknown) {
    console.error("[deleteWalletAction Error]:", error);
    return { error: error instanceof Error ? error.message : "Failed to delete wallet" };
  }
}
