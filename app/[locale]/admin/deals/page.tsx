import { Suspense } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getAdminDealsAction } from "@/app/actions/admin";
import DealsClient from "./client";

const AdminDealsPage = async () => {
  const dealsData = await getAdminDealsAction();
  const deals = "deals" in dealsData ? dealsData.deals || [] : [];

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DealsClient initialDeals={deals} />
    </Suspense>
  );
};

export default AdminDealsPage;
