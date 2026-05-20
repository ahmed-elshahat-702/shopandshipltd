import { getAdminWalletAction } from "@/app/actions/admin";
import WalletClient from "./client";

export default async function WalletManagementPage() {
  const initialData = await getAdminWalletAction({
    page: 1,
    limit: 10,
    status: "pending",
  });

  if (initialData && "error" in initialData) {
    return (
      <div className="flex justify-center py-24 text-red-500 font-bold">
        {initialData.error}
      </div>
    );
  }

  return <WalletClient initialData={initialData} />;
}
