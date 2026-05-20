import { getMerchantsAction, getMerchantLevelsAction } from "@/app/actions/merchant";
import MerchantsClient from "./MerchantsClient";

export default async function MerchantsPage() {
  const [merchantsData, levelsData] = await Promise.all([
    getMerchantsAction({ page: 1, limit: 9 }),
    getMerchantLevelsAction()
  ]);

  return (
    <MerchantsClient
      initialMerchants={merchantsData.merchants || []}
      initialTotalPages={merchantsData.totalPages || 1}
      initialTotal={merchantsData.total || 0}
      initialLevels={levelsData.levels || []}
    />
  );
}
