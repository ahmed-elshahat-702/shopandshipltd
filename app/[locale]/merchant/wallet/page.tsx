import { createClient } from "@/utils/supabase/server";
import {
  getMerchantWalletAction,
  getMerchantTransactionsAction,
  getMerchantDetailsByUserIdAction,
} from "@/app/actions/merchant";
import { getPlatformSettingsAction } from "@/app/actions/admin";
import MerchantWalletClient from "./client";
import { redirect } from "next/navigation";

export default async function WalletPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Wallet is keyed on user_id, NOT merchant profile id
  const [initialWallet, initialTransactions, initialSettings, merchantResponse] = await Promise.all([
    getMerchantWalletAction(user.id),
    getMerchantTransactionsAction(user.id),
    getPlatformSettingsAction(),
    getMerchantDetailsByUserIdAction(user.id),
  ]);

  const adminWalletAddress = "error" in initialSettings ? "" : initialSettings.adminWalletAddress || "";
  const userWalletAddress = "merchant" in merchantResponse ? merchantResponse.merchant?.wallet_address || "" : "";

  return (
    <MerchantWalletClient
      userId={user.id}
      initialWallet={initialWallet}
      initialTransactions={initialTransactions}
      adminWalletAddress={adminWalletAddress}
      userWalletAddress={userWalletAddress}
    />
  );
}
