import { TopMerchants } from "@/components/TopMerchants";
import { HomeClient } from "@/components/HomeClient";
import { getProductsAction, getCategoriesAction } from "@/app/actions/products";
import { getActiveDealsAction } from "@/app/actions/deals";

// Server component — pre-fetches all home-page data from Supabase
export default async function HomePage() {
  const [
    initialNewProducts,
    // initialTopRated,
    initialDiscounted,
    initialCategories,
    initialDealsData,
  ] = await Promise.all([
    getProductsAction({ limit: 5, sortBy: "newest" }),
    // getProductsAction({ limit: 5, sortBy: "popular" }),
    getProductsAction({ limit: 5, sortBy: "discount" }),
    getCategoriesAction(),
    getActiveDealsAction(),
  ]);

  const initialDeals = initialDealsData.deals || [];

  return (
    <main className="min-h-screen bg-background">
      {/* Client sections: category strip, banners, product grids */}
      <HomeClient
        initialNewProducts={initialNewProducts}
        // initialTopRated={initialTopRated}
        initialDiscounted={initialDiscounted}
        initialCategories={initialCategories.categories}
        initialDeals={initialDeals}
      />

      {/* Server component: fetches verified merchants from Supabase */}
      <TopMerchants />
    </main>
  );
}
