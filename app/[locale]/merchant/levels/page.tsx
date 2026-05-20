import { createClient } from "@/utils/supabase/server";
import {
  getMerchantDetailsByUserIdAction,
  getMerchantLevelsAction,
} from "@/app/actions/merchant";
import MerchantLevelsContent from "@/components/merchant/MerchantLevelsContent";
import { redirect } from "next/navigation";

export default async function MerchantLevelsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [result, levelsResult] = await Promise.all([
    getMerchantDetailsByUserIdAction(user.id),
    getMerchantLevelsAction(),
  ]);

  if (!result || "error" in result || !result.merchant) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground font-bold">
        Merchant profile not found. Please complete your merchant application.
      </div>
    );
  }

  const initialData = {
    merchant: {
      ...result.merchant,
      merchant_level_upgrades: result.merchant.merchant_level_upgrades ?? [],
    },
    levels: "error" in levelsResult ? [] : levelsResult.levels,
  };

  return <MerchantLevelsContent initialData={initialData} userId={user.id} />;
}
