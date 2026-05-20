import { getAdminAnalyticsAction } from "@/app/actions/admin";
import AnalyticsClient from "./client";
import { Suspense } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

export default async function AnalyticsPage() {
  const initialData = await getAdminAnalyticsAction();

  if ("error" in initialData) {
    return (
      <div className="flex justify-center py-24 text-red-500 font-bold">
        {initialData.error}
      </div>
    );
  }

  // Use a proper type cast for the non-error case
  type AnalyticsData = Exclude<
    Awaited<ReturnType<typeof getAdminAnalyticsAction>>,
    { error: string }
  >;

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AnalyticsClient initialData={initialData as AnalyticsData} />
    </Suspense>
  );
}
