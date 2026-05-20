"use server";

import { createClient } from "@/utils/supabase/server";

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id;
}

type ProductVariantRecord = {
  id?: string;
  stock?: number | string;
};

function getVariantStock(
  variants: ProductVariantRecord[] | null | undefined,
  variantId: string | null | undefined,
) {
  const variant = (variants || []).find((v) => v.id === variantId);
  return variant ? Number(variant.stock || 0) : null;
}

type CartItemRow = {
  id: string;
  user_id: string;
  product_id: string;
  merchant_id: string;
  quantity: number;
  price_per_unit: number;
  variant_id?: string | null;
  variant_details?: Record<string, string> | null;
  created_at?: string;
  updated_at?: string;
};

function cartItemKey(item: {
  product_id: string;
  merchant_id: string;
  variant_id?: string | null;
}) {
  return `${item.product_id}:${item.merchant_id}:${item.variant_id || "no-variant"}`;
}

async function normalizeUserCartItems(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    if (error) console.error("[cart] Failed to load cart for normalization:", error);
    return;
  }

  const groups = new Map<string, CartItemRow[]>();
  for (const item of data as CartItemRow[]) {
    const key = cartItemKey(item);
    groups.set(key, [...(groups.get(key) || []), item]);
  }

  for (const group of groups.values()) {
    if (group.length <= 1) continue;

    const [keeper, ...duplicates] = group;
    const quantity = Math.max(
      ...group.map((item) => Number(item.quantity || 0)),
    );
    const newestDetails = [...group]
      .reverse()
      .find((item) => item.variant_details)?.variant_details;

    const { error: updateError } = await supabase
      .from("cart_items")
      .update({
        quantity,
        price_per_unit: keeper.price_per_unit,
        variant_details: keeper.variant_details || newestDetails || null,
      })
      .eq("id", keeper.id);

    if (updateError) {
      console.error("[cart] Failed to merge duplicate cart item:", updateError);
      continue;
    }

    const { error: deleteError } = await supabase
      .from("cart_items")
      .delete()
      .in(
        "id",
        duplicates.map((item) => item.id),
      );

    if (deleteError) {
      console.error("[cart] Failed to delete duplicate cart items:", deleteError);
    }
  }
}

export async function getCartAction() {
  try {
    const userId = await getUserId();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClient();
    await normalizeUserCartItems(userId);

    const { data, error } = await supabase
      .from("cart_items")
      .select("*, products(*), merchant_profiles(id, business_name, logo_url)")
      .eq("user_id", userId);

    if (error) throw error;
    return { cart: data || [] };
  } catch (error) {
    console.error("[v0] Error fetching cart:", error);
    return { error: "Failed to fetch cart" };
  }
}

export async function clearCartAction() {
  try {
    const userId = await getUserId();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClient();

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("[v0] Error clearing cart:", error);
    return { error: "Failed to clear cart" };
  }
}

export async function validateCartAction() {
  try {
    const userId = await getUserId();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClient();
    await normalizeUserCartItems(userId);

    const { data: cartItems, error } = await supabase
      .from("cart_items")
      .select(
        "*, products(stock, has_variants, variants), merchant_products(selling_price)",
      )
      .eq("user_id", userId);

    if (error) throw error;

    const validItems = [];
    const invalidItems = [];

    for (const item of cartItems || []) {
      const product = Array.isArray(item.products)
        ? item.products[0]
        : item.products;

      const variantStock = product?.has_variants
        ? getVariantStock(product.variants, item.variant_id)
        : null;
      const availableStock = product?.has_variants
        ? variantStock
        : Number(product?.stock || 0);

      if (!product || availableStock === null || availableStock < item.quantity) {
        invalidItems.push({
          itemId: item.id,
          reason: "out_of_stock",
          availableStock: availableStock || 0,
        });
      } else {
        validItems.push(item);
      }
    }

    return { validItems, invalidItems };
  } catch (error) {
    console.error("[v0] Error validating cart:", error);
    return { error: "Failed to process cart validation" };
  }
}

export async function addCartItemAction(payload: {
  productId: string;
  merchantId: string;
  quantity: number;
  variantPrice: number;
  variantId?: string | null;
  variantDetails?: Record<string, string> | null;
}) {
  try {
    const userId = await getUserId();
    if (!userId) return { error: "Unauthorized" };

    const { productId, merchantId, quantity, variantPrice, variantId, variantDetails } = payload;

    if (!productId || !merchantId || !quantity || variantPrice === undefined) {
      return { error: "Missing required fields" };
    }

    const supabase = await createClient();
    await normalizeUserCartItems(userId);

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("has_variants, variants, stock")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return { error: "Product not found" };
    }

    if (product.has_variants) {
      const variantStock = getVariantStock(product.variants, variantId);
      if (!variantId || variantStock === null) {
        return { error: "Please select a valid product variant" };
      }
      if (variantStock < quantity) {
        return { error: "Not enough stock available" };
      }
    } else if (Number(product.stock || 0) < quantity) {
      return { error: "Not enough stock available" };
    }

    // Check if item already exists
    let query = supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .eq("merchant_id", merchantId);
      
    if (variantId) {
      query = query.eq("variant_id", variantId);
    } else {
      query = query.is("variant_id", null);
    }
    
    const { data: existing } = await query.maybeSingle();

    if (existing) {
      const nextQuantity = existing.quantity + quantity;
      if (product.has_variants) {
        const variantStock = getVariantStock(product.variants, variantId);
        if (variantStock === null || variantStock < nextQuantity) {
          return { error: "Not enough stock available" };
        }
      } else if (Number(product.stock || 0) < nextQuantity) {
        return { error: "Not enough stock available" };
      }

      const { data, error } = await supabase
        .from("cart_items")
        .update({ quantity: nextQuantity })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return { item: data };
    }

    const { data, error } = await supabase
      .from("cart_items")
      .insert([
        {
          user_id: userId,
          product_id: productId,
          merchant_id: merchantId,
          quantity,
          price_per_unit: variantPrice,
          variant_id: variantId || null,
          variant_details: variantDetails || null
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { item: data };
  } catch (error) {
    console.error("[v0] Error adding to cart:", error);
    return { error: "Failed to add item to cart" };
  }
}

export async function updateCartItemAction(payload: {
  itemId: string;
  quantity: number;
}) {
  try {
    const userId = await getUserId();
    if (!userId) return { error: "Unauthorized" };

    const { itemId, quantity } = payload;

    if (!itemId || quantity === undefined) {
      return { error: "Missing required fields" };
    }

    const supabase = await createClient();

    if (quantity <= 0) {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      return { success: true };
    }

    const { data: cartItem, error: itemError } = await supabase
      .from("cart_items")
      .select("product_id, variant_id, products(stock, has_variants, variants)")
      .eq("id", itemId)
      .eq("user_id", userId)
      .single();

    if (itemError || !cartItem) {
      return { error: "Cart item not found" };
    }

    const product = Array.isArray(cartItem.products)
      ? cartItem.products[0]
      : cartItem.products;
    const availableStock = product?.has_variants
      ? getVariantStock(product.variants, cartItem.variant_id)
      : Number(product?.stock || 0);

    if (!product || availableStock === null || availableStock < quantity) {
      return { error: "Not enough stock available" };
    }

    const { data, error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", itemId)
      .select()
      .single();

    if (error) throw error;
    return { item: data };
  } catch (error) {
    console.error("[v0] Error updating cart item:", error);
    return { error: "Failed to update cart item" };
  }
}

export async function removeCartItemAction(itemId: string) {
  try {
    const userId = await getUserId();
    if (!userId) return { error: "Unauthorized" };

    if (!itemId) {
      return { error: "Missing item ID" };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", itemId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("[v0] Error removing cart item:", error);
    return { error: "Failed to remove item from cart" };
  }
}

export async function syncCartAction(
  items: {
    product_id: string;
    merchant_id: string;
    quantity: number;
    variant_price: number;
    variant_id?: string | null;
    variant_details?: Record<string, string> | null;
  }[],
) {
  try {
    const userId = await getUserId();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClient();
    await normalizeUserCartItems(userId);

    for (const item of items) {
      // Check if item already exists
      let existingQuery = supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("product_id", item.product_id)
        .eq("merchant_id", item.merchant_id)
        .order("created_at", { ascending: true })
        .limit(1);

      existingQuery = item.variant_id
        ? existingQuery.eq("variant_id", item.variant_id)
        : existingQuery.is("variant_id", null);

      const { data: existingRows } = await existingQuery;
      const existing = existingRows?.[0];

      if (existing) {
        continue;
      }

      await supabase.from("cart_items").insert([
        {
          user_id: userId,
          product_id: item.product_id,
          merchant_id: item.merchant_id,
          quantity: item.quantity,
          price_per_unit: item.variant_price,
          variant_id: item.variant_id || null,
          variant_details: item.variant_details || null,
        },
      ]);
    }

    const { data, error } = await supabase
      .from("cart_items")
      .select("*, products(*), merchant_profiles(id, business_name, logo_url)")
      .eq("user_id", userId);

    if (error) throw error;
    return { cart: data || [] };
  } catch (error) {
    console.error("Error syncing cart:", error);
    return { error: "Failed to sync cart" };
  }
}
