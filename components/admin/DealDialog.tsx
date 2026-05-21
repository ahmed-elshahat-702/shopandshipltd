"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Deal } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  createAdminDealAction,
  updateAdminDealAction,
  uploadDealImageAction,
} from "@/app/actions/admin";
import { toast } from "sonner";
import { Edit, ImagePlus, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { dealSchema, type DealInput } from "@/lib/validations/deal";
import Image from "next/image";

interface DealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal | null;
  onSave: (deal: Deal) => void;
}

export default function DealDialog({
  open,
  onOpenChange,
  deal,
  onSave,
}: DealDialogProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof DealInput, string>>
  >({});
  const [formData, setFormData] = useState<Partial<Deal>>({
    title_en: "",
    title_ar: "",
    subtitle_en: "",
    subtitle_ar: "",
    description_en: "",
    description_ar: "",
    image_url: null,
    link_url: "",
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    if (deal) {
      setFormData(deal);
    } else if (open) {
      setFormData({
        title_en: "",
        title_ar: "",
        subtitle_en: "",
        subtitle_ar: "",
        description_en: "",
        description_ar: "",
        image_url: null,
        link_url: "",
        is_active: true,
        sort_order: 0,
      });
    }
  }, [deal, open]);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadDealImageAction(fd);
      if ("error" in result) {
        toast.error(result.error);
      } else if (result.url) {
        setFormData((prev) => ({ ...prev, image_url: result.url }));
        toast.success(t("admin.uploading").replace("...", "") + " ✓");
      }
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side zod validation
    const result = dealSchema.safeParse(formData);
    if (!result.success) {
      const errors: Partial<Record<keyof DealInput, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof DealInput;
        errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setLoading(true);

    try {
      const submitData = { ...result.data, image_url: formData.image_url || null };
      let resultAction;
      if (deal) {
        resultAction = await updateAdminDealAction(deal.id, submitData);
      } else {
        resultAction = await createAdminDealAction(submitData);
      }

      if ("error" in resultAction) {
        toast.error(resultAction.error);
      } else if (resultAction.deal) {
        onSave(resultAction.deal as Deal);
        toast.success(deal ? t("admin.dealUpdated") : t("admin.dealCreated"));
        onOpenChange(false);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An error occurred";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-background">
        <div className="p-8 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                {deal ? <Edit size={24} /> : <Plus size={24} />}
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-black tracking-tight">
                  {deal ? t("admin.editDeal") : t("admin.addDeal")}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium opacity-70">
                  {t("admin.addNewProductDesc")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 pt-0 max-h-[75vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── Image Upload ── */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                {t("admin.dealImage")}
              </Label>
              {formData.image_url ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-primary/20 group">
                  <Image
                    src={formData.image_url}
                    alt="Deal banner"
                    width={800}
                    height={300}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={14} className="mr-1" />
                      {t("admin.changeImage")}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="rounded-xl"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, image_url: null }))
                      }
                    >
                      <Trash2 size={14} className="mr-1" />
                      {t("common.remove")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 ${
                    uploadingImage
                      ? "border-primary/50 bg-primary/5"
                      : "border-border"
                  }`}
                  onClick={() => !uploadingImage && fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  {uploadingImage ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm font-medium text-muted-foreground">
                        {t("admin.uploading")}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <ImagePlus className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium text-muted-foreground">
                        {t("admin.clickOrDrag")}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {t("admin.pngJpgWebp")}
                      </p>
                    </div>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="title_en"
                  className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1"
                >
                  {t("admin.titleEn")}
                </Label>
                <Input
                  id="title_en"
                  value={formData.title_en}
                  onChange={(e) => {
                    setFormData({ ...formData, title_en: e.target.value });
                    if (fieldErrors.title_en)
                      setFieldErrors((prev) => ({
                        ...prev,
                        title_en: undefined,
                      }));
                  }}
                  required
                  className={`h-12 rounded-xl border-2 font-medium focus:ring-primary/20 ${
                    fieldErrors.title_en ? "border-destructive" : ""
                  }`}
                />
                {fieldErrors.title_en && (
                  <p className="text-xs text-destructive font-medium ml-1">
                    {fieldErrors.title_en}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="title_ar"
                  className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1"
                >
                  {t("admin.titleAr")}
                </Label>
                <Input
                  id="title_ar"
                  value={formData.title_ar}
                  onChange={(e) => {
                    setFormData({ ...formData, title_ar: e.target.value });
                    if (fieldErrors.title_ar)
                      setFieldErrors((prev) => ({
                        ...prev,
                        title_ar: undefined,
                      }));
                  }}
                  required
                  dir="rtl"
                  className={`h-12 rounded-xl border-2 font-medium focus:ring-primary/20 ${
                    fieldErrors.title_ar ? "border-destructive" : ""
                  }`}
                />
                {fieldErrors.title_ar && (
                  <p className="text-xs text-destructive font-medium ml-1">
                    {fieldErrors.title_ar}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="subtitle_en"
                  className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1"
                >
                  {t("admin.subtitleEn")}
                </Label>
                <Input
                  id="subtitle_en"
                  value={formData.subtitle_en || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, subtitle_en: e.target.value })
                  }
                  className="h-12 rounded-xl border-2 font-medium focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="subtitle_ar"
                  className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1"
                >
                  {t("admin.subtitleAr")}
                </Label>
                <Input
                  id="subtitle_ar"
                  value={formData.subtitle_ar || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, subtitle_ar: e.target.value })
                  }
                  dir="rtl"
                  className="h-12 rounded-xl border-2 font-medium focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="description_en"
                  className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1"
                >
                  {t("admin.descriptionEn")}
                </Label>
                <Textarea
                  id="description_en"
                  value={formData.description_en || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description_en: e.target.value })
                  }
                  rows={3}
                  className="rounded-xl border-2 font-medium focus:ring-primary/20 resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="description_ar"
                  className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1"
                >
                  {t("admin.descriptionAr")}
                </Label>
                <Textarea
                  id="description_ar"
                  value={formData.description_ar || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description_ar: e.target.value })
                  }
                  rows={3}
                  dir="rtl"
                  className="rounded-xl border-2 font-medium focus:ring-primary/20 resize-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="link_url"
                className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1"
              >
                {t("admin.linkUrl")}
              </Label>
              <Input
                id="link_url"
                placeholder={t("admin.linkUrlPlaceholder")}
                value={formData.link_url}
                onChange={(e) => {
                  setFormData({ ...formData, link_url: e.target.value });
                  if (fieldErrors.link_url)
                    setFieldErrors((prev) => ({
                      ...prev,
                      link_url: undefined,
                    }));
                }}
                required
                className={`h-12 rounded-xl border-2 font-medium focus:ring-primary/20 ${
                  fieldErrors.link_url ? "border-destructive" : ""
                }`}
              />
              {fieldErrors.link_url && (
                <p className="text-xs text-destructive font-medium ml-1">
                  {fieldErrors.link_url}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 p-6 border-2 border-dashed rounded-3xl bg-muted/30">
              <div className="space-y-1">
                <Label className="text-sm font-black text-foreground">
                  {t("admin.isActive")}
                </Label>
                <p className="text-xs text-muted-foreground font-medium">
                  {t("admin.showDealOnHomepage")}
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="sort_order"
                className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1"
              >
                {t("admin.sortOrder")}
              </Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sort_order: parseInt(e.target.value) || 0,
                  })
                }
                className="h-12 rounded-xl border-2 font-medium focus:ring-primary/20"
              />
            </div>

            <DialogFooter className="pt-6 border-t border-dashed flex flex-col-reverse sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-2xl h-12 px-8 font-bold border-2"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={loading || uploadingImage}
                className="rounded-2xl h-12 px-8 font-black shadow-xl shadow-primary/20 hover:scale-105 transition-all"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {deal ? t("common.save") : t("admin.addDeal")}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
