import LoadingSpinner from "@/components/LoadingSpinner";
import { getAdminProductsAction } from "@/app/actions/admin";
import { getCategoriesAction } from "@/app/actions/products";
import { Suspense } from "react";
import ProductsClient from "./client";

const AdminProductsPage = async () => {
  const [initialData, categoriesData] = await Promise.all([
    getAdminProductsAction({ page: 1, limit: 12 }),
    getCategoriesAction(),
  ]);

  const categories =
    categoriesData && "categories" in categoriesData
      ? categoriesData.categories || []
      : [];

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProductsClient initialData={initialData} categories={categories} />
    </Suspense>
  );
};

export default AdminProductsPage;
