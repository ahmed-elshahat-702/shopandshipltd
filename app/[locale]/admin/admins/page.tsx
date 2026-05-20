import React, { Suspense } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import AdminsClient from "./client";
import { getAdminUsersAction, getCurrentUserAction } from "@/app/actions/admin";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

const AdminsPage = async () => {
  const user = await getCurrentUserAction();

  if (!user || user.role !== "superadmin") {
    const locale = await getLocale();
    redirect({ href: "/admin/dashboard", locale });
  }

  const initialData = await getAdminUsersAction({
    role: ["admin", "superadmin"],
  });

  if (initialData?.error) {
    return (
      <div className="flex justify-center py-24 text-red-500 font-bold">
        {initialData.error}
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminsClient initialData={initialData} />
    </Suspense>
  );
};

export default AdminsPage;
