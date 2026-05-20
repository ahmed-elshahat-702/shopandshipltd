import { CatalogueList } from "@/components/merchant/CatalogueList";
import { getMerchantDetailsByUserIdAction } from "@/app/actions/merchant";
import { createClient } from "@/utils/supabase/server";
import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function MerchantCataloguePage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let merchantId = "";
  try {
    const merchantResponse = await getMerchantDetailsByUserIdAction(user.id);
    const merchant = "merchant" in merchantResponse ? merchantResponse.merchant : null;
    merchantId = merchant?.id ?? "";
  } catch {
    // Merchant profile not found — CatalogueList will still show catalogue
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-primary rounded-[2rem] p-6 md:p-12 text-primary-foreground shadow-2xl shadow-primary/30">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
              <Sparkles size={14} />
              {t("merchant.newArrivals")}
            </div>
            <h1 className="text-3xl md:text-6xl font-black mb-4 leading-tight">
              {t("merchant.catalogue")}
            </h1>
            <p className="text-primary-foreground/80 text-base md:text-lg font-medium leading-relaxed mb-6 md:mb-8">
              {t("merchant.catalogueDesc")}
            </p>
          </div>
        </div>

        <CatalogueList merchantId={merchantId} />
      </div>
    </main>
  );
}
