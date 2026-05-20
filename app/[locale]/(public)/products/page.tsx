import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ProductsClient from "./ProductsClient";
import { getCategoriesAction } from "@/app/actions/products";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("products.title")} | Shop & Ship LTD`,
    description: t("products.subtitle"),
  };
}

export default async function ProductsPage() {
  const { categories } = await getCategoriesAction();

  return <ProductsClient initialCategories={categories} />;
}
