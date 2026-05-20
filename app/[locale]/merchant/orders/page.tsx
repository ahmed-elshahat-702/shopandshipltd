import { createClient } from "@/utils/supabase/server";
import { getMerchantDetailsByUserIdAction } from "@/app/actions/merchant";
import { OrderList } from "@/components/merchant/OrderList";
import { getTranslations } from "next-intl/server";
import { Receipt } from "lucide-react";
import { redirect } from "next/navigation";

export default async function OrdersPage() {
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
    // Merchant profile not found — show empty state in OrderList
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
              <Receipt size={12} />
              {t("merchant.salesReport")}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight">
              {t("merchant.orders")}
            </h1>
            <p className="text-muted-foreground font-medium text-lg max-w-xl">
              {t("merchant.manageOrders")}
            </p>
          </div>
        </div>

        <OrderList merchantId={merchantId} />
      </div>
    </main>
  );
}
