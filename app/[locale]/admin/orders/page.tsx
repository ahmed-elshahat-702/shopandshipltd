import { getAdminOrdersAction } from "@/app/actions/admin";
import OrdersClient, { type OrdersResponse } from "./client";

export default async function AdminOrdersPage() {
  const initialData = await getAdminOrdersAction();

  // Ensure initialData matches the OrdersResponse union type
  const initialOrders: OrdersResponse =
    "error" in initialData
      ? {
          error: initialData.error as string,
        }
      : {
          orders: initialData.orders,
          total: initialData.total,
          page: initialData.page,
          limit: initialData.limit,
          totalPages: initialData.totalPages,
          error: undefined,
        };

  return <OrdersClient initialOrders={initialOrders} />;
}
