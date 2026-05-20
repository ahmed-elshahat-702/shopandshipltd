import React, { Suspense } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import UsersClient from "./client";
import { getAdminUsersAction } from "@/app/actions/admin";

const UsersPage = async () => {
  const initialData = await getAdminUsersAction();

  if (initialData?.error) {
    return (
      <div className="flex justify-center py-24 text-red-500 font-bold">
        {initialData.error}
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <UsersClient initialData={initialData} />
    </Suspense>
  );
};

export default UsersPage;
