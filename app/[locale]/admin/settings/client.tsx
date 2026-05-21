"use client";

import {
  updateAdminUserAction,
  updatePlatformSettingsAction,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@/hooks/use-auth";
import { PlatformSettings } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  personalInfoSchema,
  platformSettingsSchema,
  type PersonalInfoInput,
  type PlatformSettingsInput,
} from "@/lib/validations/settings";
import { createClient } from "@/utils/supabase/client";
import {
  Camera,
  Layout,
  Percent,
  Save,
  Settings,
  ShieldCheck,
  ToggleLeft,
  User,
  Wallet,
  Headset,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

interface AdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  profile_image_url: string | null;
  role: string;
  is_active: boolean;
  email_verified: boolean;
}

export default function SettingsClient({
  initialSettings,
  userProfile,
}: {
  initialSettings: PlatformSettings;
  userProfile: AdminProfile | null;
}) {
  const t = useTranslations();
  const { setProfile } = useUser();

  const [activeTab, setActiveTab] = useState("personal");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [personalInfo, setPersonalInfo] = useState({
    fullName: userProfile?.full_name || "",
    email: userProfile?.email || "",
    phone: userProfile?.phone || "",
    profileImageUrl: userProfile?.profile_image_url || "",
  });
  const [personalInfoFieldErrors, setPersonalInfoFieldErrors] = useState<
    Partial<Record<keyof PersonalInfoInput, string>>
  >({});

  const [settings, setSettings] = useState<PlatformSettings>(initialSettings);
  const [settingsFieldErrors, setSettingsFieldErrors] = useState<
    Partial<Record<keyof PlatformSettingsInput, string>>
  >({});

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `${userProfile?.id || Math.random()}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      setPersonalInfo((prev) => ({ ...prev, profileImageUrl: publicUrl }));
      toast.success(t("messages.profileUpdateSuccess"));
    } catch (error) {
      console.error(error);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const savePersonalInfo = async () => {
    if (!userProfile?.id) return;

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

    setIsSavingProfile(true);
    try {
      const res = await updateAdminUserAction(userProfile.id, {
        full_name: personalInfo.fullName,
        email: personalInfo.email,
        phone: personalInfo.phone,
        profile_image_url: personalInfo.profileImageUrl,
      });

      if (res && "error" in res) {
        toast.error(res.error as string);
      } else {
        setProfile({
          fullName: personalInfo.fullName,
          email: personalInfo.email,
          phone: personalInfo.phone,
          profileImageUrl: personalInfo.profileImageUrl,
        });
        toast.success(t("messages.profileUpdateSuccess") || "Profile updated");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChange = <K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K],
  ) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSaveSettings = async () => {
    // Client-side zod validation
    const result = platformSettingsSchema.safeParse(settings);
    if (!result.success) {
      const errors: Partial<Record<keyof PlatformSettingsInput, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof PlatformSettingsInput;
        errors[field] = issue.message;
      }
      setSettingsFieldErrors(errors);

      // Navigate to the tab with errors
      if (errors.platformName || errors.maxFileUploadSize) {
        setActiveTab("platform");
      } else if (errors.platformCommission) {
        setActiveTab("commission");
      } else if (errors.minWithdrawalAmount) {
        setActiveTab("wallet");
      }
      toast.error(
        t("messages.operationFailed") || "Please fix validation errors",
      );
      return;
    }
    setSettingsFieldErrors({});

    setIsSaving(true);
    try {
      const res = await updatePlatformSettingsAction(settings);

      if (res && "error" in res) {
        toast.error(res.error as string);
      } else {
        toast.success(t("messages.settingsSaveSuccess") || "Settings saved");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
              <Settings size={12} />
              {t("admin.systemEngine")}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
              {t("admin.platformSettings")}
            </h1>
            <p className="text-muted-foreground font-medium text-lg max-w-xl">
              {t("admin.settingsDesc")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="rounded-2xl h-12 px-8 font-black gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-all"
            >
              <Save size={18} />
              {isSaving ? t("common.loading") : t("common.saveAll")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card rounded-[2.5rem] p-6 border border-border shadow-sm sticky top-24">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4 mb-4 opacity-50">
                {t("admin.settingsMenu")}
              </p>
              <nav className="space-y-2">
                {[
                  {
                    id: "personal",
                    name: t("settings.personalInfo"),
                    icon: User,
                  },
                  {
                    id: "platform",
                    name: t("admin.platformGeneral"),
                    icon: Layout,
                  },
                  {
                    id: "commission",
                    name: t("admin.commissionSettings"),
                    icon: Percent,
                  },
                  {
                    id: "wallet",
                    name: t("admin.walletSettings"),
                    icon: Wallet,
                  },
                  {
                    id: "features",
                    name: t("admin.features"),
                    icon: ToggleLeft,
                  },
                  {
                    id: "support",
                    name: t("admin.supportSettings") || "Contact & Support",
                    icon: Headset,
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-left group",
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <item.icon
                      size={18}
                      className={cn(
                        "transition-transform group-hover:scale-110",
                        activeTab === item.id
                          ? "text-white"
                          : "text-muted-foreground",
                      )}
                    />
                    {item.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Sections */}
          <div className="lg:col-span-2 space-y-10">
            {/* Personal Info */}
            {activeTab === "personal" && (
              <section className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm space-y-8">
                <div className="flex items-center gap-4 border-b border-border pb-6">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <User size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground">
                      {t("settings.personalInfo")}
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium">
                      {t("settings.personalInfoDesc")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 flex flex-col items-center gap-4 pb-4">
                    <div
                      className="relative group cursor-pointer"
                      onClick={() =>
                        document.getElementById("avatar-upload")?.click()
                      }
                    >
                      {personalInfo.profileImageUrl ? (
                        <div className="relative w-28 h-28 rounded-full border-4 border-card shadow-2xl group-hover:opacity-80 transition-opacity overflow-hidden">
                          <Image
                            src={personalInfo.profileImageUrl}
                            alt="Profile"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-28 h-28 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-black text-2xl border-4 border-card shadow-lg tracking-tighter">
                          {(personalInfo.fullName || "U")[0]}
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-black/20 rounded-full">
                        <Camera
                          size={24}
                          className="text-white drop-shadow-lg"
                        />
                      </div>
                      <input
                        id="avatar-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {isUploading
                        ? t("common.loading")
                        : t("settings.uploadImage")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("settings.fullName")}
                    </label>
                    <Input
                      value={personalInfo.fullName}
                      onChange={(e) => {
                        setPersonalInfo((prev) => ({
                          ...prev,
                          fullName: e.target.value,
                        }));
                        if (personalInfoFieldErrors.fullName)
                          setPersonalInfoFieldErrors((prev) => ({
                            ...prev,
                            fullName: undefined,
                          }));
                      }}
                      className={cn(
                        "h-14 rounded-2xl border-2 font-medium",
                        personalInfoFieldErrors.fullName
                          ? "border-destructive focus-visible:ring-destructive"
                          : "",
                      )}
                    />
                  </div>
                  {personalInfoFieldErrors.fullName && (
                    <p className="text-xs text-destructive mt-1 ml-1">
                      {personalInfoFieldErrors.fullName}
                    </p>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("settings.email")}
                    </label>
                    <Input
                      value={personalInfo.email}
                      onChange={(e) => {
                        setPersonalInfo((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }));
                        if (personalInfoFieldErrors.email)
                          setPersonalInfoFieldErrors((prev) => ({
                            ...prev,
                            email: undefined,
                          }));
                      }}
                      className={cn(
                        "h-14 rounded-2xl border-2 font-medium",
                        personalInfoFieldErrors.email
                          ? "border-destructive focus-visible:ring-destructive"
                          : "",
                      )}
                    />
                  </div>
                  {personalInfoFieldErrors.email && (
                    <p className="text-xs text-destructive mt-1 ml-1">
                      {personalInfoFieldErrors.email}
                    </p>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("settings.phone")}
                    </label>
                    <Input
                      value={personalInfo.phone}
                      onChange={(e) => {
                        setPersonalInfo((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }));
                        if (personalInfoFieldErrors.phone)
                          setPersonalInfoFieldErrors((prev) => ({
                            ...prev,
                            phone: undefined,
                          }));
                      }}
                      className={cn(
                        "h-14 rounded-2xl border-2 font-medium",
                        personalInfoFieldErrors.phone
                          ? "border-destructive focus-visible:ring-destructive"
                          : "",
                      )}
                    />
                  </div>
                  {personalInfoFieldErrors.phone && (
                    <p className="text-xs text-destructive mt-1 ml-1">
                      {personalInfoFieldErrors.phone}
                    </p>
                  )}
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={savePersonalInfo}
                    disabled={isSavingProfile}
                    className="rounded-xl h-12 px-6 font-black gap-2"
                  >
                    {isSavingProfile
                      ? t("common.loading")
                      : t("settings.saveChanges")}
                  </Button>
                </div>
              </section>
            )}

            {/* Platform General */}
            {activeTab === "platform" && (
              <section className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm space-y-8">
                <div className="flex items-center gap-4 border-b border-border pb-6">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <Layout size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground">
                      {t("admin.platformGeneral")}
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium">
                      {t("admin.platformGeneralDesc")}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("admin.platformName")}
                    </label>
                    <Input
                      value={settings.platformName}
                      onChange={(e) => {
                        handleChange("platformName", e.target.value);
                        if (settingsFieldErrors.platformName)
                          setSettingsFieldErrors((prev) => ({
                            ...prev,
                            platformName: undefined,
                          }));
                      }}
                      className={cn(
                        "h-14 rounded-2xl border-2 font-medium",
                        settingsFieldErrors.platformName
                          ? "border-destructive focus-visible:ring-destructive"
                          : "",
                      )}
                    />
                  </div>
                  {settingsFieldErrors.platformName && (
                    <p className="text-xs text-destructive mt-1 ml-1">
                      {settingsFieldErrors.platformName}
                    </p>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("admin.maxFileUploadSize")} (Bytes)
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={settings.maxFileUploadSize}
                        onChange={(e) => {
                          handleChange(
                            "maxFileUploadSize",
                            parseInt(e.target.value) || 0,
                          );
                          if (settingsFieldErrors.maxFileUploadSize)
                            setSettingsFieldErrors((prev) => ({
                              ...prev,
                              maxFileUploadSize: undefined,
                            }));
                        }}
                        className={cn(
                          "h-14 rounded-2xl border-2 font-medium pr-20",
                          settingsFieldErrors.maxFileUploadSize
                            ? "border-destructive focus-visible:ring-destructive"
                            : "",
                        )}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground uppercase opacity-50">
                        {Math.round(settings.maxFileUploadSize / 1024 / 1024)}{" "}
                        MB
                      </div>
                    </div>
                    {settingsFieldErrors.maxFileUploadSize && (
                      <p className="text-xs text-destructive mt-1 ml-1">
                        {settingsFieldErrors.maxFileUploadSize}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Contact & Support Settings */}
            {activeTab === "support" && (
              <section className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm space-y-8">
                <div className="flex items-center gap-4 border-b border-border pb-6">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <Headset size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground">
                      {t("admin.supportSettings") || "Contact & Support"}
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium">
                      {t("admin.supportSettingsDesc") || "Manage platform contact numbers and emails."}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("settings.email")}
                    </label>
                    <Input
                      value={settings.supportEmail || ""}
                      onChange={(e) => {
                        handleChange("supportEmail", e.target.value);
                        if (settingsFieldErrors.supportEmail)
                          setSettingsFieldErrors((prev) => ({
                            ...prev,
                            supportEmail: undefined,
                          }));
                      }}
                      className={cn(
                        "h-14 rounded-2xl border-2 font-medium",
                        settingsFieldErrors.supportEmail
                          ? "border-destructive focus-visible:ring-destructive"
                          : "",
                      )}
                      placeholder="support@example.com"
                    />
                  </div>
                  {settingsFieldErrors.supportEmail && (
                    <p className="text-xs text-destructive mt-1 ml-1">
                      {settingsFieldErrors.supportEmail}
                    </p>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("settings.phone")}
                    </label>
                    <Input
                      value={settings.supportPhone || ""}
                      onChange={(e) => {
                        handleChange("supportPhone", e.target.value);
                        if (settingsFieldErrors.supportPhone)
                          setSettingsFieldErrors((prev) => ({
                            ...prev,
                            supportPhone: undefined,
                          }));
                      }}
                      className={cn(
                        "h-14 rounded-2xl border-2 font-medium",
                        settingsFieldErrors.supportPhone
                          ? "border-destructive focus-visible:ring-destructive"
                          : "",
                      )}
                      placeholder="+15852303334"
                    />
                  </div>
                  {settingsFieldErrors.supportPhone && (
                    <p className="text-xs text-destructive mt-1 ml-1">
                      {settingsFieldErrors.supportPhone}
                    </p>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("merchant.contactViaWhatsapp")}
                    </label>
                    <Input
                      value={settings.whatsappNumber || ""}
                      onChange={(e) => {
                        handleChange("whatsappNumber", e.target.value);
                        if (settingsFieldErrors.whatsappNumber)
                          setSettingsFieldErrors((prev) => ({
                            ...prev,
                            whatsappNumber: undefined,
                          }));
                      }}
                      className={cn(
                        "h-14 rounded-2xl border-2 font-medium",
                        settingsFieldErrors.whatsappNumber
                          ? "border-destructive focus-visible:ring-destructive"
                          : "",
                      )}
                      placeholder="+15852303334"
                    />
                  </div>
                  {settingsFieldErrors.whatsappNumber && (
                    <p className="text-xs text-destructive mt-1 ml-1">
                      {settingsFieldErrors.whatsappNumber}
                    </p>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("merchant.contactViaTelegram")}
                    </label>
                    <Input
                      value={settings.telegramNumber || ""}
                      onChange={(e) => {
                        handleChange("telegramNumber", e.target.value);
                        if (settingsFieldErrors.telegramNumber)
                          setSettingsFieldErrors((prev) => ({
                            ...prev,
                            telegramNumber: undefined,
                          }));
                      }}
                      className={cn(
                        "h-14 rounded-2xl border-2 font-medium",
                        settingsFieldErrors.telegramNumber
                          ? "border-destructive focus-visible:ring-destructive"
                          : "",
                      )}
                      placeholder="+15852303334"
                    />
                  </div>
                  {settingsFieldErrors.telegramNumber && (
                    <p className="text-xs text-destructive mt-1 ml-1">
                      {settingsFieldErrors.telegramNumber}
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Commission Settings */}
            {activeTab === "commission" && (
              <section className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm space-y-8">
                <div className="flex items-center gap-4 border-b border-border pb-6">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <Percent size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground">
                      {t("admin.commissionSettings")}
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium">
                      {t("admin.commissionDesc")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("admin.platformCommission")} (%)
                    </label>
                    <Input
                      type="number"
                      value={settings.platformCommission}
                      onChange={(e) => {
                        handleChange(
                          "platformCommission",
                          parseFloat(e.target.value) || 0,
                        );
                        if (settingsFieldErrors.platformCommission)
                          setSettingsFieldErrors((prev) => ({
                            ...prev,
                            platformCommission: undefined,
                          }));
                      }}
                      className={cn(
                        "h-14 rounded-2xl border-2 font-black text-xl",
                        settingsFieldErrors.platformCommission
                          ? "border-destructive focus-visible:ring-destructive"
                          : "",
                      )}
                    />
                  </div>
                  {settingsFieldErrors.platformCommission && (
                    <p className="text-xs text-destructive mt-1 ml-1">
                      {settingsFieldErrors.platformCommission}
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Wallet Settings */}
            {activeTab === "wallet" && (
              <section className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm space-y-8">
                <div className="flex items-center gap-4 border-b border-border pb-6">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <Wallet size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground">
                      {t("admin.walletSettings")}
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium">
                      {t("admin.walletDesc")}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("admin.minWithdrawalAmount")} ($)
                    </label>
                    <Input
                      type="number"
                      value={settings.minWithdrawalAmount}
                      onChange={(e) => {
                        handleChange(
                          "minWithdrawalAmount",
                          parseFloat(e.target.value) || 0,
                        );
                        if (settingsFieldErrors.minWithdrawalAmount)
                          setSettingsFieldErrors((prev) => ({
                            ...prev,
                            minWithdrawalAmount: undefined,
                          }));
                      }}
                      className={cn(
                        "h-14 rounded-2xl border-2 font-medium",
                        settingsFieldErrors.minWithdrawalAmount
                          ? "border-destructive focus-visible:ring-destructive"
                          : "",
                      )}
                    />
                  </div>
                  {settingsFieldErrors.minWithdrawalAmount && (
                    <p className="text-xs text-destructive mt-1 ml-1">
                      {settingsFieldErrors.minWithdrawalAmount}
                    </p>
                  )}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("admin.adminWalletAddress") ||
                        "Platform Wallet Address"}
                    </label>
                    <Input
                      type="text"
                      value={settings.adminWalletAddress}
                      onChange={(e) => {
                        handleChange("adminWalletAddress", e.target.value);
                        if (settingsFieldErrors.adminWalletAddress)
                          setSettingsFieldErrors((prev) => ({
                            ...prev,
                            adminWalletAddress: undefined,
                          }));
                      }}
                      className={cn(
                        "h-14 rounded-2xl border-2 font-medium",
                        settingsFieldErrors.adminWalletAddress
                          ? "border-destructive focus-visible:ring-destructive"
                          : "",
                      )}
                      placeholder={
                        t("admin.adminWalletPlaceholder") || "0x1234...abcd"
                      }
                    />
                  </div>
                  {settingsFieldErrors.adminWalletAddress && (
                    <p className="text-xs text-destructive mt-1 ml-1">
                      {settingsFieldErrors.adminWalletAddress}
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Features & Switches */}
            {activeTab === "features" && (
              <section className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm space-y-8">
                <div className="flex items-center gap-4 border-b border-border pb-6">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground">
                      {t("admin.features")}
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium">
                      {t("admin.featuresDesc")}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      id: "autoApproveKYC",
                      label: t("admin.autoApproveKYC"),
                      icon: ShieldCheck,
                    },
                    // {
                    //   id: "emailVerificationRequired",
                    //   label: t("admin.emailVerificationRequired"),
                    //   icon: UserCheck,
                    // },
                    // {
                    //   id: "kycRequiredForMerchant",
                    //   label: t("admin.kycRequiredForMerchant"),
                    //   icon: ShieldCheck,
                    // },
                    // {
                    //   id: "emailNotifications",
                    //   label: t("admin.emailNotifications"),
                    //   icon: Bell,
                    // },
                    {
                      id: "allowCustomerWithdrawal",
                      label:
                        t("admin.allowCustomerWithdrawal") ||
                        "Allow Customer Withdrawal",
                      icon: Wallet,
                    },
                    {
                      id: "allowMerchantWithdrawal",
                      label:
                        t("admin.allowMerchantWithdrawal") ||
                        "Allow Merchant Withdrawal",
                      icon: Wallet,
                    },
                    // {
                    //   id: "maintenanceMode",
                    //   label: t("admin.maintenanceMode"),
                    //   icon: ToggleLeft,
                    //   warning: true,
                    // },
                  ].map((feature) => {
                    const isEnabled = settings[
                      feature.id as keyof PlatformSettings
                    ] as boolean;
                    return (
                      <div
                        key={feature.id}
                        className={cn(
                          "flex items-center justify-between p-6 rounded-[2rem] border transition-all",
                          isEnabled
                            ? // ? feature.warning
                              //   ? "bg-red-50 border-red-200"
                              //   : "bg-primary/5 border-primary/20 shadow-sm"
                              "bg-primary/5 border-primary/20 shadow-sm"
                            : "bg-muted/30 border-transparent hover:border-border",
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors font-black",
                              // feature.warning
                              //   ? isEnabled
                              //     ? "bg-red-500 text-white shadow-md shadow-red-500/20"
                              //     : "bg-red-100 text-red-600"
                              //   : isEnabled
                              //     ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                              //     : "bg-card text-muted-foreground",
                              isEnabled
                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                : "bg-card text-muted-foreground",
                            )}
                          >
                            <feature.icon size={18} />
                          </div>
                          <span
                            className={cn(
                              "font-black text-xs uppercase tracking-widest transition-colors",
                              isEnabled
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {feature.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={cn(
                              "text-[10px] font-black uppercase tracking-widest hidden sm:block",
                              isEnabled
                                ? // feature.warning
                                  //   ? "text-red-600"
                                  //   : "text-primary"
                                  "text-primary"
                                : "text-muted-foreground",
                            )}
                          >
                            {isEnabled
                              ? t("common.enabled")
                              : t("common.disabled")}
                          </span>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(val) =>
                              handleChange(
                                feature.id as keyof PlatformSettings,
                                val,
                              )
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
