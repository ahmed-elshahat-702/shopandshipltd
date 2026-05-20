"use server";

import {
  Product,
  ProductFilters,
  Category,
  MerchantVariant,
  MerchantInventoryProduct,
  ProductVariant,
} from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

export interface HomeMerchant {
  id: string;
  business_name: string;
  store_slug: string;
  logo_url: string | null;
  rating: number;
  followers: number | null;
  total_sales: number | null;
  is_verified: boolean;
  merchant_products: { count: number }[];
}

interface DbMerchantProduct {
  id: string;
  merchant_id: string;
  selling_price: number;
  merchant_profiles: {
    id: string;
    business_name: string;
    logo_url: string | null;
  } | null;
  product_id: string;
}

interface DbProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string | null;
  image_urls: string[];
  reviews_locked?: boolean;
  rating?: number;
  has_variants?: boolean;
  variants?: ProductVariant[];
  colors?: string[];
  sizes?: string[];
  merchant_products?: DbMerchantProduct[];
  categories?: { id: number; name: string; slug: string }[];
}

export async function getProductsAction(options?: {
  search?: string;
  category?: string | string[];
  priceMin?: number;
  priceMax?: number;
  rating?: number | number[];
  sortBy?: ProductFilters["sortBy"];
  page?: number;
  limit?: number;
}): Promise<{
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  try {
    const search = options?.search || "";
    const category = options?.category;
    const priceMin = options?.priceMin;
    const priceMax = options?.priceMax;
    const rating = options?.rating;
    const sortBy = options?.sortBy || "newest";
    const page = options?.page || 1;
    let limit = options?.limit || 12;

    if (sortBy === "discount") {
      limit = 50;
    }

    const supabase = await createClient();

    let query = supabase
      .from("products")
      .select(
        `
        id,
        name,
        description,
        price,
        stock,
        image_url,
        image_urls,
        reviews_locked,
        category_id,
        rating,
        has_variants,
        variants,
        colors,
        sizes,
        average_rating:rating,
        created_at,
        categories!inner(id, name, slug),
        merchant_products!inner(id, product_id, merchant_id, selling_price,
          merchant_profiles(id, business_name, logo_url)
        )
        `,
        { count: "exact" },
      )
      .eq("is_active", true);

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (category) {
      const categories = Array.isArray(category) ? category : [category];
      if (categories.length > 0) {
        query = query.in("categories.slug", categories);
      }
    }

    if (priceMin !== undefined) {
      query = query.gte("price", priceMin);
    }

    if (priceMax !== undefined) {
      query = query.lte("price", priceMax);
    }

    if (rating !== undefined) {
      const ratings = Array.isArray(rating)
        ? rating.map(Number)
        : [Number(rating)];
      if (ratings.length > 0) {
        const minRating = Math.min(...ratings);
        query = query.gte("rating", minRating);
      }
    }

    if (sortBy === "price-asc") {
      query = query.order("price", { ascending: true });
    } else if (sortBy === "price-desc") {
      query = query.order("price", { ascending: false });
    } else if (sortBy === "popular" || sortBy === "selling") {
      query = query.order("rating", { ascending: false });
    } else if (sortBy === "discount") {
      query = query.order("price", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const offset = (page - 1) * limit;
    const { data, error, count } = await query.range(
      offset,
      offset + limit - 1,
    );

    if (error) throw error;

    // Normalize data for UI compatibility
    const dbProducts = data as unknown as DbProduct[];
    let normalizedProducts: Product[] = (dbProducts || []).map((p) => {
      const variants = p.merchant_products || [];
      let lowestVariant = null;
      if (variants.length > 0) {
        lowestVariant = variants.reduce(
          (min: DbMerchantProduct, curr: DbMerchantProduct) =>
            curr.selling_price < min.selling_price ? curr : min,
          variants[0],
        );
      }

      const lowestPrice = lowestVariant ? lowestVariant.selling_price : p.price;

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        image_url: p.image_url,
        image_urls: p.image_urls,
        stock: p.stock, // Use base product stock
        reviews_locked: Boolean(p.reviews_locked),
        average_rating: p.rating || 0,
        total_reviews: 0,
        price: lowestPrice,
        lowestPrice: lowestPrice,
        originalPrice: p.price,
        merchant_count: variants.length,
        merchantId: lowestVariant?.merchant_id,
        merchantName: lowestVariant?.merchant_profiles?.business_name,
        has_variants: p.has_variants,
        variants: p.variants,
        colors: p.colors,
        sizes: p.sizes,
        categories: p.categories
          ? (p.categories as unknown as Category[])
          : undefined,
      };
    });

    if (options?.sortBy === "discount") {
      normalizedProducts.sort((a, b) => {
        const discountA = (a.originalPrice || 0) - (a.lowestPrice || 0);
        const discountB = (b.originalPrice || 0) - (b.lowestPrice || 0);
        return discountB - discountA;
      });
      normalizedProducts = normalizedProducts.slice(0, options?.limit || 12);
    }

    return {
      products: normalizedProducts,
      total: count || 0,
      page,
      limit: options?.limit || 12,
      totalPages: Math.ceil((count || 0) / (options?.limit || 12)),
    };
  } catch (error) {
    console.error("[products] Error fetching from DB:", error);
    return { products: [], total: 0, page: 1, limit: 12, totalPages: 0 };
  }
}

export async function getProductByIdAction(
  id: string,
  includeReviews = false,
  reviewPage = 1,
): Promise<{
  product?: Product;
  reviews?: unknown;
  distribution?: Record<number, number>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        `
        id,
        name,
        description,
        price,
        stock,
        image_url,
        image_urls,
        reviews_locked,
        category_id,
        rating,
        has_variants,
        variants,
        colors,
        sizes,
        average_rating:rating,
        created_at,
        categories(id, name, slug),
        merchant_products!inner(
          id, product_id, merchant_id, selling_price,
          merchant_profiles(id, business_name, logo_url)
        )
        `,
      )
      .eq("id", id)
      .single();

    if (productError || !product) {
      return { error: "Product not found" };
    }

    let reviewsData: {
      reviews: unknown[];
      total: number;
      distribution: Record<number, number>;
    } = {
      reviews: [],
      total: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
    if (includeReviews) {
      const limit = 10;
      const offset = (reviewPage - 1) * limit;

      // Get reviews
      const {
        data: reviews,
        count,
        error: reviewsError,
      } = await supabase
        .from("reviews")
        .select(
          `
          id,
          product_id,
          user_id,
          rating,
          comment,
          helpful_count,
          created_at,
          profiles(id, full_name, profile_image_url)
          `,
          { count: "exact" },
        )
        .eq("product_id", id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // Get distribution stats
      const { data: distributionData } = await supabase
        .from("reviews")
        .select("rating")
        .eq("product_id", id);

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      if (distributionData) {
        (distributionData as { rating: number }[]).forEach((r) => {
          const rating = Math.round(Number(r.rating));
          if (rating >= 1 && rating <= 5) {
            distribution[rating as keyof typeof distribution]++;
          }
        });
      }

      if (!reviewsError) {
        reviewsData = {
          reviews: reviews || [],
          total: count || 0,
          distribution,
        };
      }
    }

    // Normalize product
    const dbProduct = product as unknown as DbProduct;
    const variants = dbProduct.merchant_products || [];
    let lowestVariant = null;
    if (variants.length > 0) {
      lowestVariant = variants.reduce(
        (min: DbMerchantProduct, curr: DbMerchantProduct) =>
          curr.selling_price < min.selling_price ? curr : min,
        variants[0],
      );
    }

    const lowestPrice = lowestVariant
      ? lowestVariant.selling_price
      : dbProduct.price;

    const normalizedProduct: Product = {
      id: dbProduct.id,
      name: dbProduct.name,
      description: dbProduct.description,
      image_url: dbProduct.image_url,
      image_urls: dbProduct.image_urls,
      stock: dbProduct.stock, // Use base product stock
      reviews_locked: Boolean(dbProduct.reviews_locked),
      average_rating: dbProduct.rating || 0,
      total_reviews: reviewsData.total,
      price: lowestPrice,
      lowestPrice: lowestPrice,
      originalPrice: dbProduct.price,
      merchant_count: variants.length,
      merchantId: lowestVariant?.merchant_id,
      merchantName: lowestVariant?.merchant_profiles?.business_name,
      categories: dbProduct.categories
        ? (dbProduct.categories as unknown as Category[])
        : undefined,
      has_variants: dbProduct.has_variants,
      variants: dbProduct.variants,
      colors: dbProduct.colors,
      sizes: dbProduct.sizes,
      merchant_variants: variants.map((v) => ({
        id: v.id,
        product_id: v.product_id,
        merchant_id: v.merchant_id,
        price: v.selling_price,
        stock: dbProduct.stock,
        merchants: {
          id: v.merchant_profiles?.id || "",
          name: v.merchant_profiles?.business_name || "Merchant",
          logo_url: v.merchant_profiles?.logo_url || null,
        },
      })) as MerchantVariant[],
    };

    return {
      product: normalizedProduct,
      reviews: reviewsData.reviews,
      distribution: reviewsData.distribution,
    };
  } catch (error) {
    console.error("[products/id] Error:", error);
    return { error: "Product not found" };
  }
}

export async function getCategoriesAction(): Promise<{
  categories: Category[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, description, icon_url")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    return { categories: (data || []) as unknown as Category[] };
  } catch (error) {
    console.error("[categories] Error fetching categories:", error);
    return {
      categories: [] as Category[],
      error: "Failed to fetch categories",
    };
  }
}

export async function getMerchantProductsAction(
  merchantId: string,
  page = 1,
  limit = 12,
) {
  try {
    const offset = (page - 1) * limit;
    const supabase = await createClient();

    const { data, error, count } = await supabase
      .from("merchant_products")
      .select(
        "id, merchant_id, product_id, selling_price, products(*)",
        { count: "exact" },
      )
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const normalizedProducts: MerchantInventoryProduct[] = (data || []).map((row) => {
      const prod = Array.isArray(row.products) ? row.products[0] : row.products;
      return {
        ...row,
        products: prod ? {
          ...prod,
          stock: Number(prod.stock || 0),
          price: Number(prod.price || 0),
        } : null,
      } as MerchantInventoryProduct;
    });

    return {
      products: normalizedProducts,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error("[merchant_products] Error:", error);
    return { products: [], total: 0, page: 1, limit: 12, totalPages: 0 };
  }
}

export async function getTopMerchantsAction(
  limit = 4,
): Promise<{ merchants: HomeMerchant[] }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("merchant_profiles")
      .select(
        `
        id,
        business_name,
        store_slug,
        logo_url,
        rating,
        followers,
        total_sales,
        is_verified,
        merchant_products!inner(id),
        merchant_products_count:merchant_products(count)
        `,
      )
      .eq("is_verified", true)
      .order("rating", { ascending: false })
      .order("total_sales", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const merchants = (data || []).map((m) => {
      const merchant = m as unknown as HomeMerchant & { 
        merchant_products_count?: { count: number }[] 
      };
      return {
        ...merchant,
        merchant_products: merchant.merchant_products_count || [{ count: 0 }],
      };
    }) as HomeMerchant[];

    return { merchants };
  } catch (error) {
    console.error("[top_merchants] Error fetching top merchants:", error);
    return { merchants: [] };
  }
}

export async function checkUserReviewEligibilityAction(productId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { canReview: false, reason: "login_required" };

    const { data: product } = await supabase
      .from("products")
      .select("reviews_locked")
      .eq("id", productId)
      .maybeSingle();

    if (product?.reviews_locked) {
      return { canReview: false, reason: "reviews_locked" };
    }

    // Check for delivered orders containing this product
    const { data: purchaseData, error: purchaseError } = await supabase
      .from("orders")
      .select("id, order_items!inner(product_id)")
      .eq("user_id", user.id)
      .eq("status", "delivered")
      .eq("order_items.product_id", productId)
      .limit(1);

    const hasPurchased =
      !purchaseError && purchaseData && purchaseData.length > 0;

    const { data: reviewData } = await supabase
      .from("reviews")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    const hasReviewed = !!reviewData;

    if (!hasPurchased) return { canReview: false, reason: "not_purchased" };
    if (hasReviewed) return { canReview: false, reason: "already_reviewed" };

    return { canReview: true };
  } catch (error) {
    console.error("Error checking review eligibility:", error);
    return { canReview: false, error: "Failed to check eligibility" };
  }
}

export async function submitProductReviewAction(data: {
  productId: string;
  rating: number;
  comment: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    const { data: product } = await supabase
      .from("products")
      .select("reviews_locked")
      .eq("id", data.productId)
      .maybeSingle();

    if (product?.reviews_locked) {
      throw new Error("Reviews are locked for this product");
    }

    // Double check eligibility on server
    const { data: purchaseData } = await supabase
      .from("orders")
      .select("id, order_items!inner(product_id)")
      .eq("user_id", user.id)
      .eq("status", "delivered")
      .eq("order_items.product_id", data.productId)
      .limit(1);

    if (!purchaseData || purchaseData.length === 0)
      throw new Error("You must purchase the product before reviewing");

    const { data: reviewData } = await supabase
      .from("reviews")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", data.productId)
      .maybeSingle();

    if (reviewData) throw new Error("You have already reviewed this product");

    const { data: review, error } = await supabase
      .from("reviews")
      .insert([
        {
          user_id: user.id,
          product_id: data.productId,
          order_id: purchaseData[0]?.id,
          rating: String(data.rating),
          comment: data.comment,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return { success: true, review };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to submit review";
    return { error: message };
  }
}
