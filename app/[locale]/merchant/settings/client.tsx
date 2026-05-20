"use client";

import { useTranslations } from "next-intl";
import { useState, useRef, useCallback, useTransition } from "react";
import { toast } from "sonner";
import { useUser } from "@/hooks/use-auth";
import {
  Settings,
  User,
  Store,
  Camera,
  Save,
  Smartphone,
  Upload,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  updateUserProfileAction,
  uploadProfileImageAction,
  updateMerchantStoreProfileAction,
  uploadMerchantImageAction,
} from "@/app/actions/merchant";
import Image from "next/image";
import {
  personalInfoSchema,
  type PersonalInfoInput,
  merchantStoreSchema,
  type MerchantStoreInput,
} from "@/lib/validations/settings";
import { cn } from "@/lib/utils";

interface MerchantSettingsClientProps {
  userId: string;
  merchantId: string;
  initialFullName: string;
  initialPhone: string;
  initialEmail: string;
  initialProfileImageUrl: string;
  initialStoreName: string;
  initialStoreDescription: string;
  initialBusinessCategory: string;
  initialStoreSlug: string;
  initialWalletAddress: string;
  initialCountry: string;
  initialCity: string;
  initialStoreLogoUrl: string;
  initialStoreBannerUrl: string;
}

export default function MerchantSettingsClient({
  userId,
  merchantId,
  initialFullName,
  initialPhone,
  initialEmail,
  initialProfileImageUrl,
  initialStoreName,
  initialStoreDescription,
  initialBusinessCategory,
  initialStoreSlug,
  initialWalletAddress,
  initialCountry,
  initialCity,
  initialStoreLogoUrl,
  initialStoreBannerUrl,
}: MerchantSettingsClientProps) {
  const t = useTranslations();
  const { setProfile } = useUser();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string>(
    initialProfileImageUrl,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [logoPreview, setLogoPreview] = useState<string>(initialStoreLogoUrl);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [bannerPreview, setBannerPreview] = useState<string>(
    initialStoreBannerUrl,
  );
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const [isSavingProfile, startProfileTransition] = useTransition();
  const [isSavingStore, startStoreTransition] = useTransition();

  const [personalInfo, setPersonalInfo] = useState({
    fullName: initialFullName,
    phone: initialPhone,
  });

  const [personalInfoFieldErrors, setPersonalInfoFieldErrors] = useState<
    Partial<Record<keyof PersonalInfoInput, string>>
  >({});

  const [storeInfo, setStoreInfo] = useState({
    name: initialStoreName,
    description: initialStoreDescription,
    category: initialBusinessCategory,
    slug: initialStoreSlug,
    walletAddress: initialWalletAddress,
    country: initialCountry,
    city: initialCity,
  });
  const [storeFieldErrors, setStoreFieldErrors] = useState<
    Partial<Record<keyof MerchantStoreInput, string>>
  >({});

  const handlePersonalInfoChange = (key: string, value: string) => {
    setPersonalInfo((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error(
          t("merchant.fileTooLarge") || "Image must be less than 5MB",
        );
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [t],
  );

  const handleLogoSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logo must be less than 2MB");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleBannerSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Banner must be less than 5MB");
        return;
      }
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const savePersonalInfo = () => {
    // Client-side zod validation
    const result = personalInfoSchema.safeParse(personalInfo);
    if (!result.success) {
      const errors: Partial<Record<keyof PersonalInfoInput, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof PersonalInfoInput;
        errors[field] = issue.message;
      }
      setPersonalInfoFieldErrors(errors);
      return;
    }
    setPersonalInfoFieldErrors({});

    startProfileTransition(async () => {
      try {
        let profileImageUrl = imagePreview;

        // Upload new image if selected
        if (imageFile) {
          const fd = new FormData();
          fd.append("file", imageFile);
          const uploadRes = await uploadProfileImageAction(fd);
          if (uploadRes.error) {
            toast.error(uploadRes.error);
            return;
          }
          profileImageUrl = uploadRes.url ?? profileImageUrl;
          setImageFile(null);
        }

        // Update profile in DB
        const res = await updateUserProfileAction(userId, {
          full_name: personalInfo.fullName || undefined,
          phone: personalInfo.phone || undefined,
          profile_image_url: profileImageUrl || undefined,
        });

        if (res.error) {
          toast.error(res.error);
          return;
        }

        // Update local auth store so header/layout reflects the change
        setProfile({
          fullName: personalInfo.fullName || null,
          phone: personalInfo.phone || null,
          profileImageUrl: profileImageUrl || null,
        });

        toast.success(t("messages.profileUpdateSuccess") || "Profile saved!");
      } catch (error) {
        console.error(error);
        toast.error(t("messages.operationFailed"));
      }
    });
  };

  const saveBusinessProfile = () => {
    if (!merchantId) {
      toast.error("Merchant profile not found");
      return;
    }

    // Client-side zod validation
    const result = merchantStoreSchema.safeParse(storeInfo);
    if (!result.success) {
      const errors: Partial<Record<keyof MerchantStoreInput, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof MerchantStoreInput;
        errors[field] = issue.message;
      }
      setStoreFieldErrors(errors);
      return;
    }
    setStoreFieldErrors({});

    startStoreTransition(async () => {
      try {
        let currentLogoUrl = logoPreview;
        let currentBannerUrl = bannerPreview;

        // Upload logo if changed
        if (logoFile) {
          const fd = new FormData();
          fd.append("file", logoFile);
          const uploadRes = await uploadMerchantImageAction(fd, "logo");
          if (uploadRes.error) {
            toast.error(uploadRes.error);
            return;
          }
          currentLogoUrl = uploadRes.url ?? currentLogoUrl;
          setLogoFile(null);
        }

        // Upload banner if changed
        if (bannerFile) {
          const fd = new FormData();
          fd.append("file", bannerFile);
          const uploadRes = await uploadMerchantImageAction(fd, "banner");
          if (uploadRes.error) {
            toast.error(uploadRes.error);
            return;
          }
          currentBannerUrl = uploadRes.url ?? currentBannerUrl;
          setBannerFile(null);
        }

        const res = await updateMerchantStoreProfileAction(merchantId, {
          business_name: storeInfo.name || undefined,
          business_description: storeInfo.description || undefined,
          business_category: storeInfo.category || undefined,
          store_slug: storeInfo.slug || undefined,
          wallet_address: storeInfo.walletAddress || undefined,
          country: storeInfo.country || undefined,
          city: storeInfo.city || undefined,
          logo_url: currentLogoUrl || undefined,
          banner_url: currentBannerUrl || undefined,
        });

        if (res.error) {
          toast.error(res.error);
          return;
        }
        toast.success(
          t("messages.businessUpdateSuccess") || "Business profile updated!",
        );
      } catch (error) {
        console.error(error);
        toast.error(t("messages.operationFailed"));
      }
    });
  };

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
              <Settings size={12} />
              {t("merchant.settings")}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
              {t("merchant.settings")}
            </h1>
            <p className="text-muted-foreground font-medium text-base max-w-xl">
              {t("merchant.settingsDesc")}
            </p>
          </div>
        </div>

        {/* ── PERSONAL INFO ── */}
        <section className="bg-card rounded-[2rem] p-6 md:p-8 border border-border shadow-sm space-y-6">
          <div className="flex items-center gap-4 border-b border-border pb-5">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
              <User size={22} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-foreground">
                {t("settings.personalInfo")}
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                {t("settings.personalInfoDesc")}
              </p>
            </div>
          </div>

          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-card shadow-2xl">
                {imagePreview ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={imagePreview}
                      alt="Profile"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground font-black text-2xl">
                    {(personalInfo.fullName || "U")[0].toUpperCase()}
                  </div>
                )}
              </div>
              {/* Camera overlay */}
              <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={22} className="text-white" />
              </div>
              {/* Upload badge */}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg border-2 border-card">
                <Upload size={13} />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold text-primary hover:underline"
            >
              {t("settings.uploadImage") || "Upload photo from device"}
            </button>
            {imagePreview && (
              <p className="text-[11px] text-muted-foreground">
                {imageFile
                  ? `Selected: ${imageFile.name}`
                  : t("merchant.currentProfilePhoto")}
              </p>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
              {t("settings.email") || "Email"}
            </label>
            <Input
              value={initialEmail}
              readOnly
              disabled
              className="h-12 md:h-14 rounded-2xl border-2 font-medium bg-muted/40 cursor-not-allowed"
            />
            <p className="text-[11px] text-muted-foreground ml-1">
              {t("merchant.changeEmailInSecurity") ||
                "To change your email, go to Security settings."}
            </p>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                {t("settings.fullName")}
              </label>
              <div className="relative">
                <User
                  size={15}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50"
                />
                <Input
                  value={personalInfo.fullName}
                  onChange={(e) => {
                    handlePersonalInfoChange("fullName", e.target.value);
                    if (personalInfoFieldErrors.fullName)
                      setPersonalInfoFieldErrors((prev) => ({
                        ...prev,
                        fullName: undefined,
                      }));
                  }}
                  className={cn(
                    "h-12 md:h-14 rounded-2xl border-2 pl-11 font-medium",
                    personalInfoFieldErrors.fullName
                      ? "border-destructive focus-visible:ring-destructive"
                      : "",
                  )}
                  placeholder={
                    t("settings.fullNamePlaceholder") || "Your full name"
                  }
                />
              </div>
              {personalInfoFieldErrors.fullName && (
                <p className="text-xs text-destructive mt-1 ml-1">
                  {personalInfoFieldErrors.fullName}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                {t("settings.phone")}
              </label>
              <div className="relative">
                <Smartphone
                  size={15}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50"
                />
                <Input
                  value={personalInfo.phone}
                  onChange={(e) => {
                    handlePersonalInfoChange("phone", e.target.value);
                    if (personalInfoFieldErrors.phone)
                      setPersonalInfoFieldErrors((prev) => ({
                        ...prev,
                        phone: undefined,
                      }));
                  }}
                  className={cn(
                    "h-12 md:h-14 rounded-2xl border-2 pl-11 font-medium",
                    personalInfoFieldErrors.phone
                      ? "border-destructive focus-visible:ring-destructive"
                      : "",
                  )}
                  placeholder={
                    t("settings.phonePlaceholder") || "Your phone number"
                  }
                />
              </div>
              {personalInfoFieldErrors.phone && (
                <p className="text-xs text-destructive mt-1 ml-1">
                  {personalInfoFieldErrors.phone}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={savePersonalInfo}
              disabled={isSavingProfile}
              className="rounded-xl h-11 px-6 font-black gap-2"
            >
              {isSavingProfile ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {t("settings.saveChanges")}
            </Button>
          </div>
        </section>

        {/* ── BUSINESS PROFILE ── */}
        <section className="bg-card rounded-[2rem] p-6 md:p-8 border border-border shadow-sm space-y-8">
          <div className="flex items-center gap-4 border-b border-border pb-5">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <Store size={22} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-foreground">
                {t("merchant.storeProfile")}
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                {t("merchant.storeProfileDesc")}
              </p>
            </div>
          </div>

          <div className="space-y-10">
            {/* Logo & Banner Section */}
            <div className="space-y-6">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                {t("merchant.apply.storeLogo") || "Business Branding"}
              </label>

              {/* Banner Upload */}
              <div
                className="relative h-40 md:h-52 w-full rounded-3xl overflow-hidden bg-muted group cursor-pointer border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 transition-all"
                onClick={() => bannerInputRef.current?.click()}
              >
                {bannerPreview ? (
                  <Image
                    src={bannerPreview}
                    alt="Banner"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Upload size={24} />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      {t("merchant.uploadProfileBanner")}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={32} className="text-white" />
                </div>
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerSelect}
              />

              {/* Logo Upload (Overlapping banner) */}
              <div className="relative -mt-16 ml-8 z-10 flex items-end gap-4">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-white shadow-2xl flex items-center justify-center p-1.5 border-4 border-white overflow-hidden group-hover:scale-105 transition-transform">
                    {logoPreview ? (
                      <div className="relative w-full h-full rounded-xl overflow-hidden">
                        <Image
                          src={logoPreview}
                          alt="Logo"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-primary/5 rounded-xl flex items-center justify-center text-primary font-black text-3xl uppercase">
                        {storeInfo.name?.charAt(0) || "B"}
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={22} className="text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    <Upload size={13} />
                  </div>
                </div>
                <div className="mb-2">
                  <p className="text-xs font-black text-foreground">
                    {t("merchant.apply.storeLogo")}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {t("merchant.256x256Recommended")}
                  </p>
                </div>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoSelect}
              />
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {t("merchant.storeName")}
                </label>
                <Input
                  value={storeInfo.name}
                  onChange={(e) => {
                    setStoreInfo((prev) => ({ ...prev, name: e.target.value }));
                    if (storeFieldErrors.name)
                      setStoreFieldErrors((prev) => ({
                        ...prev,
                        name: undefined,
                      }));
                  }}
                  className={cn(
                    "h-12 md:h-14 rounded-2xl border-2 font-black text-lg",
                    storeFieldErrors.name
                      ? "border-destructive focus-visible:ring-destructive"
                      : "",
                  )}
                  placeholder={t("merchant.storeNamePlaceholder")}
                />
                {storeFieldErrors.name && (
                  <p className="text-xs text-destructive mt-1 ml-1">
                    {storeFieldErrors.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {t("merchant.storeDescription")}
                </label>
                <Textarea
                  value={storeInfo.description}
                  onChange={(e) => {
                    setStoreInfo((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }));
                    if (storeFieldErrors.description)
                      setStoreFieldErrors((prev) => ({
                        ...prev,
                        description: undefined,
                      }));
                  }}
                  className={cn(
                    "min-h-32.5 rounded-[1.5rem] border-2 p-5 font-medium leading-relaxed resize-none",
                    storeFieldErrors.description
                      ? "border-destructive focus-visible:ring-destructive"
                      : "",
                  )}
                  placeholder={t("merchant.storeDescriptionPlaceholder")}
                />
                {storeFieldErrors.description && (
                  <p className="text-xs text-destructive mt-1 ml-1">
                    {storeFieldErrors.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                    {t("merchant.businessCategory") || "Business Category"}
                  </label>
                  <Input
                    value={storeInfo.category}
                    onChange={(e) => {
                      setStoreInfo((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }));
                      if (storeFieldErrors.category)
                        setStoreFieldErrors((prev) => ({
                          ...prev,
                          category: undefined,
                        }));
                    }}
                    className={cn(
                      "h-12 md:h-14 rounded-2xl border-2 font-medium",
                      storeFieldErrors.category
                        ? "border-destructive focus-visible:ring-destructive"
                        : "",
                    )}
                    placeholder={
                      t("merchant.businessCategoryPlaceholder") ||
                      "e.g. Fashion, Electronics, Home Decor"
                    }
                  />
                  {storeFieldErrors.category && (
                    <p className="text-xs text-destructive mt-1 ml-1">
                      {storeFieldErrors.category}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                    {t("merchant.merchantSlug") || "Merchant Slug"}
                  </label>{" "}
                  <Input
                    value={storeInfo.slug}
                    onChange={(e) => {
                      setStoreInfo((prev) => ({
                        ...prev,
                        slug: e.target.value,
                      }));
                      if (storeFieldErrors.slug)
                        setStoreFieldErrors((prev) => ({
                          ...prev,
                          slug: undefined,
                        }));
                    }}
                    className={cn(
                      "h-12 md:h-14 rounded-2xl border-2 font-medium",
                      storeFieldErrors.slug
                        ? "border-destructive focus-visible:ring-destructive"
                        : "",
                    )}
                    placeholder={
                      t("merchant.merchantSlugPlaceholder") ||
                      "Unique identifier for your store URL"
                    }
                  />
                  {storeFieldErrors.slug && (
                    <p className="text-xs text-destructive mt-1 ml-1">
                      {storeFieldErrors.slug}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                    {t("merchant.country") || "Country"}
                  </label>
                  <Input
                    value={storeInfo.country}
                    onChange={(e) => {
                      setStoreInfo((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }));
                      if (storeFieldErrors.country)
                        setStoreFieldErrors((prev) => ({
                          ...prev,
                          country: undefined,
                        }));
                    }}
                    className={cn(
                      "h-12 md:h-14 rounded-2xl border-2 font-medium",
                      storeFieldErrors.country
                        ? "border-destructive focus-visible:ring-destructive"
                        : "",
                    )}
                  />
                  {storeFieldErrors.country && (
                    <p className="text-xs text-destructive mt-1 ml-1">
                      {storeFieldErrors.country}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                    {t("merchant.city") || "City"}
                  </label>
                  <Input
                    value={storeInfo.city}
                    onChange={(e) => {
                      setStoreInfo((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }));
                      if (storeFieldErrors.city)
                        setStoreFieldErrors((prev) => ({
                          ...prev,
                          city: undefined,
                        }));
                    }}
                    className={cn(
                      "h-12 md:h-14 rounded-2xl border-2 font-medium",
                      storeFieldErrors.city
                        ? "border-destructive focus-visible:ring-destructive"
                        : "",
                    )}
                  />
                  {storeFieldErrors.city && (
                    <p className="text-xs text-destructive mt-1 ml-1">
                      {storeFieldErrors.city}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                    {t("merchant.walletAddress") || "Wallet Address"}
                  </label>
                  <Input
                    value={storeInfo.walletAddress}
                    onChange={(e) => {
                      setStoreInfo((prev) => ({
                        ...prev,
                        walletAddress: e.target.value,
                      }));
                      if (storeFieldErrors.walletAddress)
                        setStoreFieldErrors((prev) => ({
                          ...prev,
                          walletAddress: undefined,
                        }));
                    }}
                    className={cn(
                      "h-12 md:h-14 rounded-2xl border-2 font-medium",
                      storeFieldErrors.walletAddress
                        ? "border-destructive focus-visible:ring-destructive"
                        : "",
                    )}
                  />
                  {storeFieldErrors.walletAddress && (
                    <p className="text-xs text-destructive mt-1 ml-1">
                      {storeFieldErrors.walletAddress}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {!merchantId && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-700 text-sm font-medium flex items-center gap-3">
              <Check size={16} />
              {t("merchant.noMerchantProfile") ||
                "No merchant profile found. Please contact support to set up your business profile."}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={saveBusinessProfile}
              disabled={isSavingStore || !merchantId}
              className="rounded-xl h-11 px-6 font-black gap-2"
            >
              {isSavingStore ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {t("settings.saveChanges")}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
