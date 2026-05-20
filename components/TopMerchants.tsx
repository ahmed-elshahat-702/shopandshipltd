import { getTopMerchantsAction } from "@/app/actions/products";
import { TopMerchantsClient } from "./TopMerchantsClient";

// Async server component — fetches verified merchants from Supabase
export async function TopMerchants() {
  const { merchants } = await getTopMerchantsAction(4);
  return <TopMerchantsClient merchants={merchants} />;
}
