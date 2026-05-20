import { getAdminMerchantApplicationsAction } from "@/app/actions/admin";
import ApplicationsClient from "./client";
import { MerchantApplication } from "@/lib/types";

export default async function MerchantApplicationsPage() {
  const result = await getAdminMerchantApplicationsAction({ page: 1, limit: 10, status: "pending" });
  
  const initialApplications = "applications" in result ? (result.applications as MerchantApplication[]) || [] : [];
  const total = "total" in result ? result.total || 0 : 0;
  const totalPages = "totalPages" in result ? result.totalPages || 1 : 1;

  return (
    <ApplicationsClient
      initialApplications={initialApplications}
      totalCount={total}
      totalPages={totalPages}
    />
  );
}
