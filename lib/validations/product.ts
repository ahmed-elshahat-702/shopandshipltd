import { z } from "zod";

export const variantSchema = z.object({
  id: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  stock: z.preprocess(
    (val) => (typeof val === "string" ? parseInt(val, 10) : val),
    z.number().int().min(0, "Stock cannot be negative")
  ),
});

export const productSchema = z.object({
  name: z
    .string()
    .min(1, "Product name is required")
    .max(255, "Product name is too long"),
  description: z.string().optional(),
  price: z.preprocess(
    (val) =>
      typeof val === "string" && val.trim() !== "" ? parseFloat(val) : val,
    z.number().positive("Price must be greater than 0"),
  ),
  stock: z.preprocess(
    (val) => (typeof val === "string" ? parseInt(val, 10) : val),
    z.number().int().min(0, "Stock cannot be negative"),
  ),
  sku: z.string().min(1, "SKU is required").max(100, "SKU is too long"),
  category_id: z.string().min(1, "Category is required"),
  image_url: z.string().url("Please enter a valid image URL").or(z.literal("")),
  image_urls: z
    .array(z.string().url())
    .min(1, "At least one image is required"),
  is_active: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  discount: z
    .preprocess(
      (val) => (typeof val === "string" ? parseFloat(val) : val),
      z
        .number()
        .min(0, "Discount cannot be negative")
        .max(100, "Discount cannot exceed 100%"),
    )
    .default(0),
  has_variants: z.boolean().default(false),
  variants: z.array(variantSchema).default([]),
  colors: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
}).superRefine((product, ctx) => {
  if (!product.has_variants) return;

  if (product.variants.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["variants"],
      message: "Add at least one variant",
    });
    return;
  }

  product.variants.forEach((variant, index) => {
    if (!variant.color?.trim() && !variant.size?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["variants", index],
        message: "Each variant needs a color or size",
      });
    }
  });
});

export type ProductInput = z.infer<typeof productSchema>;
export type VariantInput = z.infer<typeof variantSchema>;
