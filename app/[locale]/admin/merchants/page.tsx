import LoadingSpinner from "@/components/LoadingSpinner";
import { getAdminMerchantsAction } from "@/app/actions/admin";
import { Suspense } from "react";
import MerchantsClient from "./client";

const AdminMerchantsPage = async () => {
  const initialMerchants = await getAdminMerchantsAction({ page: 1 });

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MerchantsClient initialMerchants={initialMerchants} />
    </Suspense>
  );
};

export default AdminMerchantsPage;
