import React, { Suspense } from "react";
import Client from "./client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getUpgradeRequestsAction } from "@/app/actions/admin";

export default async function AdminUpgradesPage() {
  const data = await getUpgradeRequestsAction();

  if ("error" in data) {
    return (
      <div className="flex justify-center py-24 text-red-500 font-bold">
        {data.error}
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Client initialData={data} />
    </Suspense>
  );
}
