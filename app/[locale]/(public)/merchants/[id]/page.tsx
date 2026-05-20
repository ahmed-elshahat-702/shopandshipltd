import { getMerchantPublicDetailsAction } from "@/app/actions/merchant";
import { getMerchantProductsAction } from "@/app/actions/products";
import MerchantClient from "./MerchantClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MerchantDetailsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const merchantId = resolvedParams.id;

  const [merchantData, productsData] = await Promise.all([
    getMerchantPublicDetailsAction(merchantId),
    getMerchantProductsAction(merchantId, 1, 12)
  ]);

  const merchant = (merchantData && "merchant" in merchantData ? merchantData.merchant : null) ?? null;
  const products = productsData?.products || [];

  return (
    <MerchantClient
      merchantId={merchantId}
      initialMerchant={merchant}
      initialProducts={products}
    />
  );
}
