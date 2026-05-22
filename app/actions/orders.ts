"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

import { createAdminClient } from "@/utils/supabase/admin-client";
import { Address } from "@/lib/types";
import { createNotification } from "./notifications";

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

export async function getCustomerOrdersAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        merchant_profiles (
          business_name
        ),
        order_items (
          id,
          quantity,
          price_per_unit,
          subtotal,
          variant_id,
          variant_details,
          products (
            id,
            name,
            image_url
          )
        )
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { orders: data };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch orders";
    return { error: message };
  }
}

export async function getOrderDetailsAction(orderId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        merchant_profiles (
          business_name
        ),
        order_items (
          id,
          product_id,
          quantity,
          price_per_unit,
          subtotal,
          product_name,
          product_sku,
          product_image_url,
          variant_id,
          variant_details,
          products (
            id,
            name,
            image_url
          )
        )
      `,
      )
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (error) throw error;
    return { order: data };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch order details";
    return { error: message };
  }
}

export async function getUserAddressesAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("addresses")
      .eq("id", user.id)
      .single();

    if (error) throw error;
    // Filter for shipping addresses (either type is 'shipping' or no type)
    const addresses = (
      (profile.addresses as unknown as Address[]) || []
    ).filter((a) => !a.type || a.type === "shipping");
    return { addresses };
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to fetch addresses",
    };
  }
}

export async function saveAddressAction(address: {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("addresses")
      .eq("id", user.id)
      .single();

    const currentAddresses =
      (profile?.addresses as {
        fullName: string;
        email: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        id: string;
      }[]) || [];
    // Simple check for duplicates
    const exists = currentAddresses.find(
      (a) => a.address === address.address && a.city === address.city,
    );

    if (exists) return { success: true, message: "Address already saved" };

    const { error } = await supabase
      .from("profiles")
      .update({
        addresses: [
          ...currentAddresses,
          { ...address, id: crypto.randomUUID() },
        ],
      })
      .eq("id", user.id);

    if (error) throw error;
    revalidatePath("/customer/checkout");
    return { success: true };
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? error.message : "Failed to save address",
    };
  }
}

export async function placeOrderAction(data: {
  items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    variant_price: number;
    merchant_id: string;
    variant_id?: string | null;
    variant_details?: Record<string, string> | null;
  }>;
  shipping: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
    state: string;
    country: string;
  };
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: "wallet" | "cod";
  saveAddress?: boolean;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    // 1. Handle Wallet Payment
    if (data.paymentMethod === "wallet") {
      const adminSupabase = createAdminClient();

      const { error: rpcError } = await adminSupabase.rpc("process_customer_checkout", {
        customer_user_id: user.id,
        total_amount: data.total,
        order_count: data.items.length
      });

      if (rpcError) {
        return {
          error: rpcError.message.includes("Wallet is locked")
            ? "Wallet is locked by admin."
            : rpcError.message.includes("Insufficient wallet balance")
              ? "Insufficient wallet balance"
              : `Payment failed: ${rpcError.message}`
        };
      }
    }

    // 2. Save address if requested
    if (data.saveAddress) {
      await saveAddressAction(data.shipping);
    }

    // 3. Create Orders (Group by merchant)
    const itemsByMerchant = data.items.reduce(
      (acc: Record<string, typeof data.items>, item) => {
        if (!acc[item.merchant_id]) acc[item.merchant_id] = [];
        acc[item.merchant_id].push(item);
        return acc;
      },
      {},
    );

    const orderResults = [];

    for (const merchantId in itemsByMerchant) {
      const merchantItems = itemsByMerchant[merchantId];

      // Check ADMIN stock before proceeding
      for (const item of merchantItems) {
        const { data: adminProd, error: stockErr } = await supabase
          .from("products")
          .select("stock, name, has_variants, variants")
          .eq("id", item.product_id)
          .single();

        if (stockErr || !adminProd) {
          return { error: `Product not found in catalogue.` };
        }

        const availableStock = adminProd.has_variants
          ? getVariantStock(adminProd.variants, item.variant_id)
          : Number(adminProd.stock || 0);

        if (adminProd.has_variants && (!item.variant_id || availableStock === null)) {
          return { error: `Please select a valid variant for ${adminProd.name}.` };
        }

        if (availableStock === null || availableStock < item.quantity) {
          return {
            error: `Insufficient stock for ${adminProd.name}. Available: ${availableStock || 0}`,
          };
        }
      }

      const merchantSubtotal = Number(
        merchantItems.reduce(
          (sum: number, i) =>
            sum + Number(i.variant_price) * Number(i.quantity),
          0,
        ),
      );

      // Pro-rate tax and COD fee if multiple merchants
      const ratio = data.subtotal > 0 ? merchantSubtotal / data.subtotal : 1;

      const pTax = Number((data.tax * ratio).toFixed(2));
      const merchantTotal = Number(
        (merchantSubtotal + pTax).toFixed(2),
      );

      // NEW SYSTEM: Merchant pays admin price upon order confirmation.
      // commission_amount will store the total cost to merchant (admin price * qty)
      // profit_amount will be customer price - admin price

      // Calculate total cost for this order (to be paid by merchant later)
      const { data: itemProducts } = await supabase
        .from("products")
        .select("id, price, name, sku, image_url")
        .in("id", merchantItems.map(i => i.product_id));

      const adminCostTotal = merchantItems.reduce((sum, item) => {
        const p = itemProducts?.find(ip => ip.id === item.product_id);
        return sum + (Number(p?.price || 0) * item.quantity);
      }, 0);

      const commissionAmount = adminCostTotal; // This is what the merchant owes to admin
      const profitAmount = merchantSubtotal - adminCostTotal;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          merchant_id: merchantId,
          order_number: `ORD-${Math.random().toString(36).toUpperCase().substring(2, 10)}`,
          total_amount: merchantTotal,
          subtotal_amount: merchantSubtotal,
          tax_amount: pTax,
          commission_amount: commissionAmount,
          profit_amount: profitAmount,
          status: "pending",
          shipping_address: data.shipping,
          payment_method: data.paymentMethod,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Update ADMIN inventory (reduce stock)
      const adminSupabase = createAdminClient();
      for (const item of merchantItems) {
        const { error: updateStockErr } = await adminSupabase.rpc(
          "decrement_product_stock",
          {
            p_id: item.product_id,
            qty: item.quantity,
            v_id: item.variant_id || null,
          },
        );

        // Fallback to manual update if RPC fails
        if (updateStockErr) {
          const { data: currentStock } = await adminSupabase
            .from("products")
            .select("stock, variants")
            .eq("id", item.product_id)
            .single();

          const nextVariants = item.variant_id
            ? (currentStock?.variants as ProductVariantRecord[] | null | undefined)?.map(
              (variant) =>
                variant.id === item.variant_id
                  ? {
                    ...variant,
                    stock: Math.max(0, Number(variant.stock || 0) - item.quantity),
                  }
                  : variant,
            )
            : undefined;

          await adminSupabase
            .from("products")
            .update({
              stock: Math.max(0, Number(currentStock?.stock || 0) - item.quantity),
              ...(nextVariants ? { variants: nextVariants } : {}),
            })
            .eq("id", item.product_id);
        }
      }

      const orderItems = merchantItems.map((item) => {
        const p = itemProducts?.find(ip => ip.id === item.product_id);
        return {
          order_id: order.id,
          product_id: item.product_id,
          product_name: p?.name || "Unknown Product",
          product_sku: p?.sku || "UNKNOWN-SKU",
          product_image_url: p?.image_url || "",
          quantity: item.quantity,
          price_per_unit: item.variant_price,
          subtotal: item.variant_price * item.quantity,
          variant_id: item.variant_id || null,
          variant_details: item.variant_details || null,
        };
      });

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;
      orderResults.push(order);

      // Notify merchant about new order
      const { data: merchantProfile } = await supabase
        .from("merchant_profiles")
        .select("user_id")
        .eq("id", merchantId)
        .single();

      if (merchantProfile?.user_id) {
        createNotification({
          user_id: merchantProfile.user_id,
          type: "order_placed",
          title: "New Order Received",
          message: `New order #${order.order_number} worth $${merchantTotal.toFixed(2)} has been placed.`,
          metadata: { order_id: order.id, order_number: order.order_number, amount: merchantTotal },
        });
      }
    }

    return { success: true, orders: orderResults };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Place order error:", error);
    return { error: message };
  }
}
