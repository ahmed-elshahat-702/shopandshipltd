import React, { Suspense } from "react";
import AdminDashboardClient from "./client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getAdminDashboardAction } from "@/app/actions/admin";

const AdminDashboard = async () => {
  const data = await getAdminDashboardAction();

  if (data && "error" in data) {
    return (
      <div className="flex justify-center py-24 text-red-500 font-bold">
        {data.error}
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminDashboardClient
        stats={data.stats}
        platformStats={data.platformStats}
      />
    </Suspense>
  );
};

export default AdminDashboard;
