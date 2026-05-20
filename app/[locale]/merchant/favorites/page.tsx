import { createClient } from "@/utils/supabase/server";
import { getMerchantDetailsByUserIdAction } from "@/app/actions/merchant";
import { FavoritesList } from "@/components/merchant/FavoritesList";
import { getTranslations } from "next-intl/server";
import { Heart, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

export default async function MerchantFavoritesPage() {
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
    // Merchant profile not found — FavoritesList will still show favorites
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">
        {/* Header Section */}
        <div className="relative overflow-hidden bg-primary rounded-[2rem] p-6 md:p-12 text-white shadow-2xl shadow-primary/30">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
              <Heart size={14} fill="white" />
              {t("merchant.curatedList") || "Your Favorites"}
            </div>
            <h1 className="text-3xl md:text-6xl font-black mb-4 leading-tight">
              {t("merchant.favorites") || "Favorites"}
            </h1>
            <p className="text-white/80 text-base md:text-lg font-medium leading-relaxed">
              {t("merchant.favoritesDesc") ||
                "Access your bookmarked products and add them to your store with one click."}
            </p>
          </div>
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-white/10 rounded-full blur-3xl opacity-50" />
          <div className="absolute right-20 -bottom-20 w-64 h-64 bg-black/10 rounded-full blur-3xl opacity-50" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10">
            <Sparkles size={300} />
          </div>
        </div>

        <FavoritesList merchantId={merchantId} />
      </div>
    </main>
  );
}
