import { createClient } from "@/utils/supabase/server";
import {
  getMerchantDetailsByUserIdAction,
  getMerchantAnalyticsAction,
} from "@/app/actions/merchant";
import { AnalyticsDashboard } from "@/components/merchant/AnalyticsDashboard";
import { getTranslations } from "next-intl/server";
import { BarChart3 } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AnalyticsPage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let merchantId = "";
  let initialData = undefined;

  try {
    const { merchant } = await getMerchantDetailsByUserIdAction(user.id);
    merchantId = merchant?.id ?? "";
    if (merchantId) {
      const analyticsResult = await getMerchantAnalyticsAction(
        merchantId,
        "monthly",
      );
      if (analyticsResult && !("error" in analyticsResult)) {
        initialData = analyticsResult;
      }
    }
  } catch {
    // Merchant profile not found or analytics fetch failed — AnalyticsDashboard shows mock data
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
              <BarChart3 size={12} />
              {t("merchant.performanceInsights")}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight">
              {t("merchant.analytics")}
            </h1>
            <p className="text-muted-foreground font-medium text-lg max-w-xl">
              {t("merchant.analyticsDesc")}
            </p>
          </div>
        </div>

        <AnalyticsDashboard merchantId={merchantId} initialData={initialData} />
      </div>
    </main>
  );
}
