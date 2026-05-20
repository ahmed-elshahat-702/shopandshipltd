import { Metadata } from "next";
import {
  getProductByIdAction,
  getProductsAction,
} from "@/app/actions/products";
import ProductClient from "./ProductClient";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { product } = await getProductByIdAction(id);

  if (!product) {
    return {
      title: "Product Not Found",
    };
  }

  return {
    title: `${product.name} | Shop & Ship LTD`,
    description:
      product.description || `Buy ${product.name} at the best price.`,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.image_url ? [product.image_url] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const { product } = await getProductByIdAction(id, true);
  // const initialDistribution: Record<number, number> = distribution ?? {
  //   1: 0,
  //   2: 0,
  //   3: 0,
  //   4: 0,
  //   5: 0,
  // };

  if (!product) {
    notFound();
  }

  // Related products (fetch on server for initial load)
  const categoryId = Array.isArray(product.categories)
    ? product.categories[0]?.slug || product.categories[0]?.id
    : product.categories?.slug || product.categories?.id;

  const { products: relatedProducts } = await getProductsAction({
    category: categoryId ? String(categoryId) : undefined,
    limit: 5,
  });

  const filteredRelated = (relatedProducts || [])
    .filter((p) => p.id !== id)
    .slice(0, 4);

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.image_url,
    description: product.description,
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: "Shop & Ship LTD",
    },
    offers: {
      "@type": "AggregateOffer",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      price: product.lowestPrice,
      priceCurrency: "USD",
      offerCount: product.merchant_count || 1,
      lowPrice: product.lowestPrice,
      highPrice: product.originalPrice || product.lowestPrice,
    },
    aggregateRating: product.average_rating
      ? {
          "@type": "AggregateRating",
          ratingValue: product.average_rating,
          reviewCount: product.total_reviews || 0,
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductClient
        initialProduct={product}
        // initialReviews={reviews as Review[]}
        // initialDistribution={initialDistribution}
        relatedProducts={filteredRelated}
      />
    </>
  );
}
