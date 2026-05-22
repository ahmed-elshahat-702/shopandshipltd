"use client";

import {
  createAdminCategoryAction,
  createAdminProductAction,
  deleteAdminProductAction,
  getAdminProductsAction,
  updateAdminProductAction,
  uploadProductImagesAction,
} from "@/app/actions/admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  productSchema,
  type ProductInput,
  type VariantInput,
} from "@/lib/validations/product";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Box,
  Edit,
  Loader2,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Tag,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import "swiper/css";
import { FreeMode } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import useSWR, { mutate } from "swr";

/* ─── Types ─── */
interface Category {
  id: string | number;
  name: string;
  slug?: string;
}

interface AdminProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost?: number | null;
  stock: number;
  sku: string;
  is_active: boolean;
  reviews_locked?: boolean;
  tags?: string[];
  image_url?: string | null;
  image_urls?: string[];
  category_id?: string | null;
  categories?: { id: string | number; name: string } | null;
  created_at?: string;
  has_variants?: boolean;
  variants?: VariantInput[];
  colors?: string[];
  sizes?: string[];
}

type ProductFormState = {
  name: string;
  description: string;
  price: string;
  stock: string;
  sku: string;
  category_id: string;
  image_url: string;
  image_urls: string[];
  is_active: boolean;
  reviews_locked: boolean;
  tags: string[];
  has_variants: boolean;
  variants: VariantInput[];
};

interface ProductsResponse {
  products: AdminProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ProductsClientProps {
  initialData: ProductsResponse | { error: string };
  categories: Category[];
}

/* ─── Empty form state ─── */
const emptyForm: ProductFormState = {
  name: "",
  description: "",
  price: "",
  stock: "0",
  sku: "",
  category_id: "",
  image_url: "",
  image_urls: [] as string[],
  is_active: true,
  reviews_locked: false,
  tags: [] as string[],
  has_variants: false,
  variants: [],
};

/* ─── Main Component ─── */
export default function ProductsClient({
  initialData,
  categories: initialCategories,
}: ProductsClientProps) {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Dialog / delete state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(
    null,
  );
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState(emptyForm);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ProductInput, string>>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTag, setNewTag] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ─── Tag Helpers ─── */
  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  /* ─── Variant Helpers ─── */
  const addVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { id: crypto.randomUUID(), color: "", size: "", stock: 0 },
      ],
    }));
  };

  const updateVariant = (
    index: number,
    field: keyof VariantInput,
    value: string | number,
  ) => {
    setFormData((prev) => {
      const newVariants = [...prev.variants];
      newVariants[index] = { ...newVariants[index], [field]: value };
      return { ...prev, variants: newVariants };
    });
  };

  const removeVariant = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  /* ─── SWR ─── */
  const swrKey = ["admin-products", page, search, selectedCategory];
  const { data, isLoading } = useSWR(
    swrKey,
    () =>
      getAdminProductsAction({
        page,
        search: search || undefined,
        category: selectedCategory || undefined,
        limit: 12,
      }),
    {
      revalidateOnFocus: false,
      fallbackData:
        page === 1 && !search && !selectedCategory && !("error" in initialData)
          ? (initialData as ProductsResponse)
          : undefined,
    },
  );

  const products: AdminProduct[] =
    data && "products" in data ? (data.products as AdminProduct[]) : [];
  const totalPages: number =
    data && "totalPages" in data ? (data.totalPages as number) : 1;
  const totalCount = data && "total" in data ? data.total : 0;

  /* ─── Open add dialog ─── */
  const openAdd = () => {
    setEditingProduct(null);
    setFormData(emptyForm);
    setFieldErrors({});
    setIsDialogOpen(true);
  };

  /* ─── Image upload handler ─── */
  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await uploadProductImagesAction(fd);
      if ("error" in res) throw new Error(res.error);
      const newUrls = res.urls ?? [];
      const merged = [...formData.image_urls, ...newUrls];
      setFormData((prev) => ({
        ...prev,
        image_urls: merged,
        image_url: prev.image_url || merged[0] || "",
      }));
      toast.success(`${newUrls.length} image(s) uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ─── Remove one image from preview ─── */
  const removeImage = (url: string) => {
    const next = formData.image_urls.filter((u) => u !== url);
    setFormData((prev) => ({
      ...prev,
      image_urls: next,
      image_url: prev.image_url === url ? (next[0] ?? "") : prev.image_url,
    }));
  };

  /* ─── Open edit dialog ─── */
  const openEdit = (product: AdminProduct) => {
    setEditingProduct(product);
    setFieldErrors({});
    const existingUrls =
      product.image_urls ?? (product.image_url ? [product.image_url] : []);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      stock: product.stock.toString(),
      sku: product.sku || "",
      category_id: product.category_id ? String(product.category_id) : "",
      image_url: product.image_url || "",
      image_urls: existingUrls,
      is_active: product.is_active ?? true,
      reviews_locked: product.reviews_locked ?? false,
      tags: product.tags || [],
      has_variants: product.has_variants || false,
      variants: product.variants || [],
    });
    setIsDialogOpen(true);
  };

  /* ─── Create Category ─── */
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      const res = await createAdminCategoryAction({ name: newCategoryName });
      if ("error" in res) throw new Error(res.error);
      const newCat = res.category as Category;
      setCategories((prev) => [...prev, newCat]);
      setFormData((prev) => ({ ...prev, category_id: String(newCat.id) }));
      setIsCategoryDialogOpen(false);
      setNewCategoryName("");
      toast.success("Category created");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error creating category",
      );
    } finally {
      setIsCreatingCategory(false);
    }
  };

  /* ─── Save handler ─── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare colors and sizes based on variants
    const normalizedVariants = formData.variants.map((variant) => ({
      ...variant,
      id: variant.id || crypto.randomUUID(),
      color: variant.color?.trim() || undefined,
      size: variant.size?.trim() || undefined,
      stock: Number(variant.stock) || 0,
    }));

    const colors = Array.from(
      new Set(normalizedVariants.map((v) => v.color).filter(Boolean)),
    ) as string[];
    const sizes = Array.from(
      new Set(normalizedVariants.map((v) => v.size).filter(Boolean)),
    ) as string[];

    // Calculate total stock if variants are active
    const calculatedStock = formData.has_variants
      ? normalizedVariants.reduce(
          (total, v) => total + (Number(v.stock) || 0),
          0,
        )
      : formData.stock;

    const payloadRaw = {
      ...formData,
      stock: calculatedStock.toString(),
      colors: formData.has_variants ? colors : [],
      sizes: formData.has_variants ? sizes : [],
      variants: formData.has_variants ? normalizedVariants : [],
    };

    // Client-side zod validation
    const result = productSchema.safeParse(payloadRaw);
    if (!result.success) {
      const errors: Partial<Record<keyof ProductInput, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ProductInput;
        errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: result.data.name,
        description: result.data.description || null,
        price: result.data.price,
        stock: result.data.stock,
        sku: result.data.sku,
        is_active: formData.is_active,
        reviews_locked: formData.reviews_locked,
        tags: formData.tags,
        image_url: formData.image_urls[0] || result.data.image_url || null,
        image_urls: formData.image_urls,
        category_id:
          parseInt(result.data.category_id) || result.data.category_id,
        has_variants: result.data.has_variants,
        variants: result.data.variants,
        colors: result.data.colors,
        sizes: result.data.sizes,
      };

      const res = editingProduct
        ? await updateAdminProductAction(editingProduct.id, payload)
        : await createAdminProductAction(payload);

      if ("error" in res && res.error) throw new Error(res.error);

      toast.success(
        editingProduct ? t("admin.productUpdated") : t("admin.productCreated"),
      );
      setIsDialogOpen(false);
      mutate(swrKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving product");
    } finally {
      setIsSaving(false);
    }
  };

  /* ─── Delete handler ─── */
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await deleteAdminProductAction(id);
      if ("error" in res && res.error) throw new Error(res.error);
      toast.success("Product deleted");
      mutate(swrKey);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error deleting product",
      );
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
  };

  /* ─── Category filter chips (All + DB categories) ─── */
  const categoryChips = [
    { id: null, label: "All Products" },
    ...categories.map((c) => ({ id: String(c.id), label: c.name })),
  ];

  /* ─── Skeletons ─── */
  const ProductSkeleton = () => (
    <div className="bg-card rounded-[2.5rem] border border-border overflow-hidden flex flex-col">
      <Skeleton className="aspect-square w-full" />
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-1/4" />
          </div>
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="pt-4 border-t border-border flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
              <Box size={12} />
              {t("admin.globalInventory")}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
              {t("admin.manageProducts")}
            </h1>
            <p className="text-muted-foreground font-medium text-lg max-w-xl">
              {t("admin.totalProducts")}: {totalCount}
            </p>
          </div>

          <Button
            onClick={openAdd}
            className="rounded-2xl h-14 px-8 font-black gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-all"
          >
            <Plus size={20} strokeWidth={2.5} />
            {t("admin.addNewProduct")}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card rounded-[2rem] p-6 border border-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground">
                  {t("admin.activeProducts")}
                </p>
                <p className="text-2xl font-black text-foreground">
                  {totalCount}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-[2rem] p-6 border border-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                <ShoppingBag size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground">
                  {t("admin.lowStockAlert")}
                </p>
                <p className="text-2xl font-black text-foreground">
                  {products.filter((p) => p.stock < 10).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-[2rem] p-6 border border-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                <Activity size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground">
                  {t("admin.merchantAdoption")}
                </p>
                <p className="text-2xl font-black text-foreground">
                  {categories.length} cats
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-6">
          <div className="relative max-w-2xl mx-auto">
            <Search
              size={22}
              className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder={t("admin.searchGlobalProducts")}
              className="pl-16 h-16 rounded-[2rem] bg-card border border-border shadow-2xl shadow-primary/5 font-medium text-lg placeholder:opacity-50"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="pb-4">
            <Swiper
              modules={[FreeMode]}
              freeMode={true}
              grabCursor={true}
              spaceBetween={12}
              breakpoints={{
                320: { slidesPerView: 2.5 },
                640: { slidesPerView: 3.5 },
                768: { slidesPerView: 4.5 },
                1024: { slidesPerView: 6.5 },
              }}
              className="px-1 py-4"
            >
              {categoryChips.map((cat) => (
                <SwiperSlide key={cat.id ?? "all"}>
                  <button
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setPage(1);
                    }}
                    className={cn(
                      "w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all px-4",
                      selectedCategory === cat.id
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                        : "bg-card border-2 border-border text-muted-foreground hover:border-primary/30",
                    )}
                  >
                    {cat.label}
                  </button>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-32 bg-card rounded-[3rem] border-2 border-dashed border-border flex flex-col items-center">
            <div className="w-28 h-28 bg-primary/10 rounded-full flex items-center justify-center mb-8 text-muted-foreground/20">
              <Package size={56} className="text-primary" />
            </div>
            <h2 className="text-3xl font-black text-foreground mb-2">
              {t("admin.noGlobalProducts")}
            </h2>
            <p className="text-muted-foreground font-medium text-lg max-w-sm mx-auto">
              {t("admin.startAddingDesc")}
            </p>
            <Button
              onClick={openAdd}
              className="mt-8 rounded-2xl h-12 px-8 font-black gap-2"
            >
              <Plus size={18} />
              {t("admin.addFirstProduct")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <div
                key={product.id}
                className={cn(
                  "group bg-card rounded-[2.5rem] border border-border overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col relative",
                  !product.is_active && "opacity-60 grayscale-[0.5]",
                )}
              >
                {/* Image */}
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-black text-6xl opacity-10">
                      {product.name[0]}
                    </div>
                  )}
                  {!product.is_active && (
                    <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                      <span className="bg-destructive text-destructive-foreground px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {t("admin.inactive")}
                      </span>
                    </div>
                  )}
                  {product.reviews_locked && (
                    <div className="absolute top-4 right-4">
                      <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                        {t("admin.reviewsLocked")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Overlay */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 md:translate-x-12 md:opacity-0 translate-x-0 opacity-100 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500 z-10">
                  <Button
                    size="icon"
                    onClick={() => openEdit(product)}
                    className="rounded-xl h-10 w-10 bg-white shadow-xl text-primary hover:bg-primary hover:text-white transition-all border-none"
                  >
                    <Edit size={18} strokeWidth={2.5} />
                  </Button>
                  <Button
                    size="icon"
                    onClick={() => setProductToDelete(product.id)}
                    className="rounded-xl h-10 w-10 bg-white shadow-xl text-red-500 hover:bg-red-500 hover:text-white transition-all border-none"
                  >
                    <Trash2 size={18} strokeWidth={2.5} />
                  </Button>
                </div>

                {/* Info */}
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-lg font-black text-foreground line-clamp-1">
                        {product.name}
                      </h3>
                      <div className="text-lg font-black text-primary whitespace-nowrap">
                        ${product.price}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1.5 font-sans">
                        <Package size={12} className="text-primary" />
                        {t("admin.stock")}: {product.stock}
                      </p>
                      {product.sku && (
                        <p className="text-xs text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1.5 font-sans">
                          <Tag size={12} className="text-primary" />
                          {t("admin.sku")}: {product.sku}
                        </p>
                      )}
                    </div>
                    {product.tags && product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {product.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md bg-muted text-[8px] font-black uppercase tracking-widest text-muted-foreground border border-border"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground font-medium line-clamp-1 leading-relaxed pt-1">
                      {product.description || "No description provided."}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          product.is_active ? "bg-green-500" : "bg-red-500",
                        )}
                      />
                      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                        {product.categories
                          ? (product.categories as { name: string }).name
                          : "No Category"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-card border-2 border-border p-3 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] flex items-center justify-between shadow-xl shadow-primary/5 gap-1 sm:gap-6">
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="rounded-lg sm:rounded-2xl h-9 sm:h-14 w-9 sm:w-auto px-0 sm:px-8 font-black gap-2 sm:gap-3 border-2 hover:bg-primary/5 hover:border-primary/50 transition-all disabled:opacity-30 flex items-center justify-center shrink-0"
            >
              <ArrowLeft size={16} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
              <span className="hidden sm:inline">{t("common.previous")}</span>
            </Button>

            <div className="flex items-center gap-1 sm:gap-3">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                const isFirstPage = pageNum === 1;
                const isLastPage = pageNum === totalPages;
                const isCurrentPage = page === pageNum;
                const isNearCurrent = Math.abs(pageNum - page) <= 1;

                if (isFirstPage || isLastPage || isNearCurrent) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        "w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm transition-all shrink-0 cursor-pointer",
                        isCurrentPage
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110"
                          : "bg-muted text-muted-foreground hover:bg-border"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                }

                if (
                  (pageNum === 2 && page > 3) ||
                  (pageNum === totalPages - 1 && page < totalPages - 2)
                ) {
                  return (
                    <span
                      key={pageNum}
                      className="px-1 text-muted-foreground font-black opacity-50 text-xs sm:text-sm shrink-0"
                    >
                      ···
                    </span>
                  );
                }

                return null;
              })}
            </div>

            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="rounded-lg sm:rounded-2xl h-9 sm:h-14 w-9 sm:w-auto px-0 sm:px-8 font-black gap-2 sm:gap-3 border-2 hover:bg-primary/5 hover:border-primary/50 transition-all disabled:opacity-30 flex items-center justify-center shrink-0"
            >
              <span className="hidden sm:inline">{t("common.next")}</span>
              <ArrowRight size={16} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
            </Button>
          </div>
        )}
      </div>

      {/* ─── Add / Edit Dialog ─── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl rounded-2xl border-none shadow-2xl p-0 overflow-hidden bg-background">
          <div className="p-8 pb-4">
            <DialogHeader>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  {editingProduct ? <Edit size={24} /> : <Plus size={24} />}
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-2xl font-black tracking-tight">
                    {editingProduct
                      ? t("admin.editProduct")
                      : t("admin.addNewProduct")}
                  </DialogTitle>
                  <DialogDescription className="text-sm font-medium opacity-70">
                    {editingProduct
                      ? t("admin.editProductDesc")
                      : t("admin.addNewProductDesc")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-8 pt-0 max-h-[75vh] overflow-y-auto">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-6">
                <div className="space-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("admin.productName")}
                    </label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className={`h-12 rounded-xl border-2 font-medium focus:ring-primary/20 ${
                        fieldErrors.name ? "border-red-500" : ""
                      }`}
                      placeholder={t("admin.productName")}
                    />
                    {fieldErrors.name && (
                      <p className="text-xs text-red-500 font-medium ml-1">
                        {fieldErrors.name}
                      </p>
                    )}
                  </div>

                  {/* SKU */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("admin.skuLabel")}
                    </label>
                    <Input
                      required
                      value={formData.sku}
                      onChange={(e) =>
                        setFormData({ ...formData, sku: e.target.value })
                      }
                      className={`h-12 rounded-xl border-2 font-medium focus:ring-primary/20 ${
                        fieldErrors.sku ? "border-red-500" : ""
                      }`}
                      placeholder={t("admin.skuPlaceholder")}
                    />
                    {fieldErrors.sku && (
                      <p className="text-xs text-red-500 font-medium ml-1">
                        {fieldErrors.sku}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                        {t("admin.price")}
                      </label>
                      <Input
                        required
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        className={`h-12 rounded-xl border-2 font-medium focus:ring-primary/20 ${
                          fieldErrors.price ? "border-red-500" : ""
                        }`}
                      />
                      {fieldErrors.price && (
                        <p className="text-xs text-red-500 font-medium ml-1">
                          {fieldErrors.price}
                        </p>
                      )}
                    </div>
                    {/* Stock  */}
                    {!formData.has_variants && (
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                          {t("admin.stock")}
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.stock}
                          onChange={(e) =>
                            setFormData({ ...formData, stock: e.target.value })
                          }
                          className={`h-12 rounded-xl border-2 font-medium focus:ring-primary/20 ${
                            fieldErrors.stock ? "border-red-500" : ""
                          }`}
                        />
                        {fieldErrors.stock && (
                          <p className="text-xs text-red-500 font-medium ml-1">
                            {fieldErrors.stock}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.has_variants}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            has_variants: checked as boolean,
                          })
                        }
                      />
                      <label className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {t("admin.hasVariants")}
                      </label>
                    </div>

                    {formData.has_variants && (
                      <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold">
                            {t("admin.productVariants")}
                          </h4>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={addVariant}
                            className="h-8"
                          >
                            <Plus size={14} className="mr-1" />{" "}
                            {t("admin.addVariant")}
                          </Button>
                        </div>

                        {formData.variants.length === 0 && (
                          <p className="text-sm text-muted-foreground italic text-center py-4">
                            {t("admin.noVariantsAdded")}
                          </p>
                        )}

                        {formData.variants.map((variant, index: number) => (
                          <div
                            key={variant.id || index}
                            className="flex items-center gap-3 bg-background p-3 rounded-lg border border-border"
                          >
                            <div className="flex-1 space-y-1">
                              <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                {t("admin.colorOptional")}
                              </label>
                              <Input
                                placeholder={t("admin.colorPlaceholder")}
                                value={variant.color || ""}
                                onChange={(e) =>
                                  updateVariant(index, "color", e.target.value)
                                }
                                className="h-9"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                {t("admin.sizeOptional")}
                              </label>
                              <Input
                                placeholder={t("admin.sizePlaceholder")}
                                value={variant.size || ""}
                                onChange={(e) =>
                                  updateVariant(index, "size", e.target.value)
                                }
                                className="h-9"
                              />
                            </div>
                            <div className="w-24 space-y-1">
                              <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                {t("admin.stock")}
                              </label>
                              <Input
                                type="number"
                                min="0"
                                value={variant.stock}
                                onChange={(e) =>
                                  updateVariant(
                                    index,
                                    "stock",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="h-9"
                              />
                            </div>
                            <div className="pt-5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removeVariant(index)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                        {t("admin.category")}
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCategoryDialogOpen(true)}
                        className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                      >
                        + {t("admin.addCategory")}
                      </button>
                    </div>
                    <Select
                      value={formData.category_id}
                      onValueChange={(val) =>
                        setFormData({ ...formData, category_id: val })
                      }
                    >
                      <SelectTrigger
                        className={`h-12! rounded-xl border-2 font-medium ${
                          fieldErrors.category_id ? "border-red-500" : ""
                        }`}
                      >
                        <SelectValue placeholder={t("admin.selectCategory")} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.category_id && (
                      <p className="text-xs text-red-500 font-medium ml-1">
                        {fieldErrors.category_id}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Multi-image Upload */}
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("admin.productImages")} {t("admin.min1Required")}
                    </label>

                    {/* Drop zone / picker */}
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all",
                        fieldErrors.image_urls
                          ? "border-red-500 bg-red-50"
                          : "border-border",
                      )}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleImageUpload(e.dataTransfer.files);
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleImageUpload(e.target.files)}
                      />
                      {isUploading ? (
                        <>
                          <Loader2
                            size={28}
                            className="animate-spin text-primary"
                          />
                          <p className="text-xs font-bold text-muted-foreground">
                            {t("admin.uploading")}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Upload size={20} />
                          </div>
                          <p className="text-xs font-bold text-muted-foreground text-center">
                            {t("admin.clickOrDrag")}
                            <br />
                            <span className="text-[10px] opacity-60">
                              {t("admin.pngJpgWebp")}
                            </span>
                          </p>
                        </>
                      )}
                    </div>
                    {fieldErrors.image_urls && (
                      <p className="text-xs text-red-500 font-medium ml-1">
                        {fieldErrors.image_urls}
                      </p>
                    )}

                    {/* Image Previews */}
                    {formData.image_urls.length > 0 && (
                      <div className="grid grid-cols-4 gap-3">
                        {formData.image_urls.map((url, i) => (
                          <div
                            key={url}
                            className="relative aspect-square rounded-xl overflow-hidden border-2 group"
                            style={{
                              borderColor:
                                i === 0
                                  ? "hsl(var(--primary))"
                                  : "hsl(var(--border))",
                            }}
                          >
                            <Image
                              src={url}
                              alt={`Image ${i + 1}`}
                              fill
                              className="object-cover"
                            />
                            {i === 0 && (
                              <div className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-widest text-center py-0.5">
                                Cover
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(url)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                            >
                              <X size={10} />
                            </button>
                            {i !== 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const reordered = [
                                    url,
                                    ...formData.image_urls.filter(
                                      (u) => u !== url,
                                    ),
                                  ];
                                  setFormData((p) => ({
                                    ...p,
                                    image_urls: reordered,
                                    image_url: reordered[0],
                                  }));
                                }}
                                className="absolute bottom-1 left-1 text-[8px] font-black bg-white/80 text-foreground px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                {t("admin.setCover")}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("admin.tags")}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                          }
                          if (e.key === ",") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        placeholder={t("admin.addTagPlaceholder")}
                        className="h-12 rounded-xl border-2 font-medium"
                      />
                      <Button
                        type="button"
                        onClick={addTag}
                        className="h-12 w-12 rounded-xl"
                        variant="outline"
                      >
                        <Plus size={20} />
                      </Button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="hover:text-destructive"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status & Options */}

                  <div className="bg-muted/30 p-4 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-black uppercase tracking-widest">
                          {t("admin.activeStatus")}
                        </Label>
                      </div>
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(val) =>
                          setFormData({ ...formData, is_active: val })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-black uppercase tracking-widest">
                          {t("admin.reviewLock")}
                        </Label>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {t("admin.reviewLockDesc")}
                        </p>
                      </div>
                      <Switch
                        checked={formData.reviews_locked}
                        onCheckedChange={(val) =>
                          setFormData({ ...formData, reviews_locked: val })
                        }
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("admin.description")}
                    </label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className={`min-h-24 rounded-2xl border-2 font-medium focus:ring-primary/20 resize-none ${
                        fieldErrors.description ? "border-red-500" : ""
                      }`}
                      placeholder={t("admin.description")}
                    />
                    {fieldErrors.description && (
                      <p className="text-xs text-red-500 font-medium ml-1">
                        {fieldErrors.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-2 h-12 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin mr-2" size={18} />
                  ) : null}
                  {editingProduct
                    ? t("admin.updateProduct")
                    : t("admin.createProduct")}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Add Category Dialog ─── */}
      <Dialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              {t("admin.addNewCategory")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.addNewCategoryDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                {t("admin.categoryName")}
              </label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t("admin.categoryName")}
                className="h-12 rounded-xl border-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsCategoryDialogOpen(false)}
              className="font-black uppercase tracking-widest"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={isCreatingCategory || !newCategoryName.trim()}
              className="font-black uppercase tracking-widest"
            >
              {isCreatingCategory && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("admin.createCategory")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─── */}
      <AlertDialog
        open={!!productToDelete}
        onOpenChange={(open) => !open && setProductToDelete(null)}
      >
        <AlertDialogContent className="rounded-[2.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.deleteProduct")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.deleteProductDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isDeleting}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() => productToDelete && handleDelete(productToDelete)}
            >
              {isDeleting ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : null}
              {t("admin.deleteProduct")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
