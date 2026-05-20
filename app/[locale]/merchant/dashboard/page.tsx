import { createClient } from "@/utils/supabase/server";
import { getMerchantDashboardByUserIdAction } from "@/app/actions/merchant";
import MerchantDashboardContent from "@/components/merchant/MerchantDashboardContent";
import { getTranslations } from "next-intl/server";

export default async function MerchantDashboardPage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex justify-center py-24 text-red-500 font-bold">
        {t("merchant.unauthorized")}
      </div>
    );
  }

  const initialData = await getMerchantDashboardByUserIdAction(user.id);
  const merchantId = initialData && 'merchantId' in initialData ? initialData.merchantId : "";

  return (
    <MerchantDashboardContent 
      initialData={initialData} 
      merchantId={merchantId} 
    />
  );
}
