import { createClient } from "@/utils/supabase/server";
import { getMerchantDetailsByUserIdAction } from "@/app/actions/merchant";
import { StoreInventory } from "@/components/merchant/StoreInventory";
import { getTranslations } from "next-intl/server";
import { Plus, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";

export default async function MyStorePage() {
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
    const { merchant } = await getMerchantDetailsByUserIdAction(user.id);
    merchantId = merchant?.id ?? "";
  } catch {
    // Merchant profile not found — StoreInventory will show empty state
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Premium Header Section */}
        <div className="relative overflow-hidden bg-primary rounded-[2.5rem] p-8 md:p-12 text-primary-foreground shadow-2xl shadow-primary/30">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-sm font-black uppercase tracking-widest">
                <StoreIcon size={16} />
                {t("merchant.myStore")}
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight">
                {t("merchant.storeInventory")}
              </h1>
              <p className="text-primary-foreground/80 font-medium text-lg md:text-xl leading-relaxed">
                {t("merchant.myStoreDesc")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/merchant/products">
                <Button className="w-full sm:w-auto rounded-2xl h-14 px-8 font-black gap-2 bg-white text-primary hover:bg-white/90 shadow-xl transition-all hover:scale-105 active:scale-95">
                  <Plus size={20} />
                  {t("merchant.addProduct")}
                </Button>
              </Link>
            </div>
          </div>

          {/* Abstract Decorations */}
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-white/10 rounded-full blur-3xl opacity-50" />
          <div className="absolute right-40 -bottom-40 w-64 h-64 bg-black/10 rounded-full blur-3xl opacity-50" />
        </div>

        <StoreInventory merchantId={merchantId} />
      </div>
    </main>
  );
}
