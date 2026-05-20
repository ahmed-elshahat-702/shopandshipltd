"use client";

import {
  deleteAccountAction,
  forgotPasswordAction,
  resetPasswordAction,
} from "@/app/actions/auth";
import { updateMerchantEmailAction } from "@/app/actions/merchant";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/use-auth";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import {
  Calendar,
  Camera,
  CreditCard,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { changePasswordSchema, type ChangePasswordInput, personalInfoSchema, type PersonalInfoInput } from "@/lib/validations/settings";

// Supabase client for auth operations
function getSupabase() {
  return createClient();
}

export default function SettingsClient() {
  const t = useTranslations();
  const router = useRouter();
  const { user, setProfile } = useUser();

  const fileInputRef = useRef<HTMLInputElement>(null);  const [imagePreview, setImagePreview] = useState<string>(
    user?.profileImageUrl || "",
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [personalInfo, setPersonalInfo] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    walletAddress: user?.walletAddress || "",
    birthDate: user?.birthDate || "",
  });
  const [personalInfoFieldErrors, setPersonalInfoFieldErrors] = useState<Partial<Record<keyof PersonalInfoInput, string>>>({});

  useEffect(() => {
    if (user) {
      setPersonalInfo({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        walletAddress: user.walletAddress || "",
        birthDate: user.birthDate || "",
      });
      setImagePreview(user.profileImageUrl || "");
    }
  }, [user]);

  const [emailSection, setEmailSection] = useState({
    newEmail: "",
    isSaving: false,
  });

  const [passwordSection, setPasswordSection] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    showCurrent: false,
    showNew: false,
    showConfirm: false,
    isSaving: false,
  });
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Partial<Record<keyof ChangePasswordInput, string>>>({});

  const [resetFlow, setResetFlow] = useState<{
    step: "none" | "email" | "code" | "new_password";
    email: string;
    code: string;
    newPassword: string;
    confirmPassword: string;
    isLoading: boolean;
  }>({
    step: "none",
    email: user?.email || "",
    code: "",
    newPassword: "",
    confirmPassword: "",
    isLoading: false,
  });

  const handlePersonalInfoChange = (key: string, value: string) => {
    setPersonalInfo({ ...personalInfo, [key]: value });
  };

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const savePersonalInfo = async () => {
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
      let profileImageUrl = imagePreview;
      if (imageFile) {
        const supabase = getSupabase();
        const fileName = `avatars/${user?.id || "user"}-${Date.now()}.${imageFile.name.split(".").pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("profiles")
          .upload(fileName, imageFile, { upsert: true });

        if (uploadError) {
          console.warn(
            "Upload failed, using local preview:",
            uploadError.message,
          );
        } else if (uploadData) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("profiles").getPublicUrl(uploadData.path);
          profileImageUrl = publicUrl;
        }
      }

      setProfile({
        fullName: personalInfo.fullName || null,
        phone: personalInfo.phone || null,
        walletAddress: personalInfo.walletAddress || null,
        profileImageUrl: profileImageUrl || null,
        birthDate: personalInfo.birthDate || null,
      });

      const supabase = getSupabase();
      const { error: dbError } = await supabase
        .from("profiles")
        .update({
          full_name: personalInfo.fullName || null,
          phone: personalInfo.phone || null,
          wallet_address: personalInfo.walletAddress || null,
          profile_image_url: profileImageUrl || null,
          birth_date: personalInfo.birthDate || null,
        })
        .eq("id", user?.id);

      if (dbError) throw dbError;

      toast.success(t("messages.profileUpdateSuccess") || "Profile saved!");
    } catch (error) {
      console.error(error);
      toast.error(t("messages.operationFailed"));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!emailSection.newEmail) return;
    setEmailSection((prev) => ({ ...prev, isSaving: true }));
    try {
      const data = await updateMerchantEmailAction(emailSection.newEmail);
      if (data.success) {
        toast.success(
          t("merchant.emailChangeConfirmation") ||
            "A confirmation email has been sent to your new address. Please check your inbox.",
        );
        setEmailSection((prev) => ({ ...prev, newEmail: "" }));
      } else {
        toast.error(data.error || t("messages.operationFailed"));
      }
    } catch {
      toast.error(t("messages.tryAgain"));
    } finally {
      setEmailSection((prev) => ({ ...prev, isSaving: false }));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side zod validation
    const result = changePasswordSchema.safeParse(passwordSection);
    if (!result.success) {
      const errors: Partial<Record<keyof ChangePasswordInput, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ChangePasswordInput;
        errors[field] = issue.message;
      }
      setPasswordFieldErrors(errors);
      return;
    }
    setPasswordFieldErrors({});

    setPasswordSection((prev) => ({ ...prev, isSaving: true }));
    try {
      const supabase = getSupabase();

      // 1. Verify current password
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: passwordSection.currentPassword,
      });

      if (loginError) {
        toast.error(t("auth.errors.invalidCurrentPassword"));
        setPasswordSection((prev) => ({ ...prev, isSaving: false }));
        return;
      }

      // 2. Update to new password via server action
      const res = await resetPasswordAction({
        password: passwordSection.newPassword,
      });
      if (res.error) throw new Error(res.error);

      toast.success(
        t("messages.passwordUpdated") || "Password updated successfully",
      );
      setPasswordSection({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        showCurrent: false,
        showNew: false,
        showConfirm: false,
        isSaving: false,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("messages.tryAgain");
      toast.error(message);
      setPasswordSection((prev) => ({ ...prev, isSaving: false }));
    } finally {
      setPasswordSection((prev) => ({ ...prev, isSaving: false }));
    }
  };

  const handleRequestReset = async () => {
    if (!resetFlow.email) return;
    setResetFlow((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await forgotPasswordAction({ email: resetFlow.email });
      if (res.error) throw new Error(res.error);
      toast.success(t("merchant.resetCodeSent"));
      setResetFlow((prev) => ({ ...prev, step: "code", isLoading: false }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("messages.tryAgain");
      toast.error(message);
      setResetFlow((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleVerifyCode = async () => {
    if (!resetFlow.code) return;
    setResetFlow((prev) => ({ ...prev, isLoading: true }));
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.verifyOtp({
        email: resetFlow.email,
        token: resetFlow.code,
        type: "recovery",
      });

      if (error) throw new Error(error.message);

      setResetFlow((prev) => ({
        ...prev,
        step: "new_password",
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("messages.tryAgain");
      toast.error(message);
      setResetFlow((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleResetPassword = async () => {
    if (resetFlow.newPassword.length < 8) {
      toast.error(t("auth.errors.passwordTooShort"));
      return;
    }
    if (resetFlow.newPassword !== resetFlow.confirmPassword) {
      toast.error(t("auth.errors.passwordMismatch"));
      return;
    }
    setResetFlow((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await resetPasswordAction({
        password: resetFlow.newPassword,
      });
      if (res.error) throw new Error(res.error);

      toast.success(t("merchant.passwordResetSuccess"));
      setResetFlow({
        step: "none",
        email: user?.email || "",
        code: "",
        newPassword: "",
        confirmPassword: "",
        isLoading: false,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("messages.tryAgain");
      toast.error(message);
      setResetFlow((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await deleteAccountAction();
      if (res.error) throw new Error(res.error);
      toast.success(res.message);
      router.push("/");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("messages.tryAgain");
      toast.error(message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-12">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
          <ShieldCheck size={12} />
          {t("nav.security")}
        </div>
        <h1 className="text-4xl font-black tracking-tight">
          {t("nav.settings")}
        </h1>
        <p className="text-muted-foreground font-medium">
          {t("merchant.securityDesc")}
        </p>
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
            <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-card shadow-2xl">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Profile"
                  fill
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground font-black text-2xl">
                  {(personalInfo.fullName ||
                    user?.fullName ||
                    "U")[0]?.toUpperCase()}
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
                : "Current profile photo"}
            </p>
          )}
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
                  handlePersonalInfoChange("fullName", e.target.value)
                  if (personalInfoFieldErrors.fullName) setPersonalInfoFieldErrors(prev => ({ ...prev, fullName: undefined }));
                }}
                className={cn(
                  "h-12 md:h-14 rounded-2xl border-2 pl-11 font-medium",
                  personalInfoFieldErrors.fullName ? "border-destructive focus-visible:ring-destructive" : ""
                )}
              />
            </div>
            {personalInfoFieldErrors.fullName && (
              <p className="text-xs text-destructive mt-1 ml-1">{personalInfoFieldErrors.fullName}</p>
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
                  handlePersonalInfoChange("phone", e.target.value)
                  if (personalInfoFieldErrors.phone) setPersonalInfoFieldErrors(prev => ({ ...prev, phone: undefined }));
                }}
                className={cn(
                  "h-12 md:h-14 rounded-2xl border-2 pl-11 font-medium",
                  personalInfoFieldErrors.phone ? "border-destructive focus-visible:ring-destructive" : ""
                )}
              />
            </div>
            {personalInfoFieldErrors.phone && (
              <p className="text-xs text-destructive mt-1 ml-1">{personalInfoFieldErrors.phone}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
              {t("settings.birthDate")}
            </label>
            <div className="relative">
              <Calendar
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50"
              />
              <Input
                type="date"
                value={personalInfo.birthDate}
                onChange={(e) => {
                  handlePersonalInfoChange("birthDate", e.target.value)
                  if (personalInfoFieldErrors.birthDate) setPersonalInfoFieldErrors(prev => ({ ...prev, birthDate: undefined }));
                }}
                className={cn(
                  "h-12 md:h-14 rounded-2xl border-2 pl-11 font-medium",
                  personalInfoFieldErrors.birthDate ? "border-destructive focus-visible:ring-destructive" : ""
                )}
              />
            </div>
            {personalInfoFieldErrors.birthDate && (
              <p className="text-xs text-destructive mt-1 ml-1">{personalInfoFieldErrors.birthDate}</p>
            )}
          </div>

          {/* Wallet Address */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
              {t("merchant.walletAddress") || "Wallet Address"}
            </label>
            <div className="relative">
              <CreditCard
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50"
              />
              <Input
                value={personalInfo.walletAddress}
                onChange={(e) => {
                  handlePersonalInfoChange("walletAddress", e.target.value)
                  if (personalInfoFieldErrors.walletAddress) setPersonalInfoFieldErrors(prev => ({ ...prev, walletAddress: undefined }));
                }}
                placeholder="0x..."
                className={cn(
                  "h-12 md:h-14 rounded-2xl border-2 pl-11 font-medium",
                  personalInfoFieldErrors.walletAddress ? "border-destructive focus-visible:ring-destructive" : ""
                )}
              />
            </div>
            {personalInfoFieldErrors.walletAddress && (
              <p className="text-xs text-destructive mt-1 ml-1">{personalInfoFieldErrors.walletAddress}</p>
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
              <span className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full inline-block" />
            ) : (
              <Save size={16} />
            )}
            {t("settings.saveChanges")}
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Change Password Card */}
        <Card className="rounded-[2.5rem] border-2 shadow-none overflow-hidden hover:border-primary/20 transition-colors">
          <CardHeader className="bg-muted/30 p-8 border-b">
            <CardTitle className="flex items-center gap-3 text-xl font-black">
              <Lock className="text-primary" size={20} />
              {t("settings.changePassword")}
            </CardTitle>
            <CardDescription className="font-medium">
              {t("settings.changePasswordDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                    {t("auth.currentPassword")}
                  </Label>
                  <button
                    type="button"
                    onClick={() =>
                      setResetFlow((prev) => ({ ...prev, step: "email" }))
                    }
                    className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>
                <div className="relative group">
                  <Input
                    type={passwordSection.showCurrent ? "text" : "password"}
                    value={passwordSection.currentPassword}
                    onChange={(e) => {
                      setPasswordSection((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }));
                      if (passwordFieldErrors.currentPassword) setPasswordFieldErrors(prev => ({ ...prev, currentPassword: undefined }));
                    }}
                    className={cn(
                      "rounded-2xl h-12 bg-muted/20 border-2 focus:border-primary transition-all px-4",
                      passwordFieldErrors.currentPassword ? "border-destructive focus:border-destructive" : ""
                    )}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl text-muted-foreground hover:text-primary"
                    onClick={() =>
                      setPasswordSection((prev) => ({
                        ...prev,
                        showCurrent: !prev.showCurrent,
                      }))
                    }
                  >
                    {passwordSection.showCurrent ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </Button>
                </div>
                {passwordFieldErrors.currentPassword && (
                  <p className="text-xs text-destructive mt-1 ml-1">{passwordFieldErrors.currentPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {t("auth.newPassword")}
                </Label>
                <div className="relative">
                  <Input
                    type={passwordSection.showNew ? "text" : "password"}
                    value={passwordSection.newPassword}
                    onChange={(e) => {
                      setPasswordSection((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }));
                      if (passwordFieldErrors.newPassword) setPasswordFieldErrors(prev => ({ ...prev, newPassword: undefined }));
                    }}
                    className={cn(
                      "rounded-2xl h-12 bg-muted/20 border-2 focus:border-primary transition-all px-4",
                      passwordFieldErrors.newPassword ? "border-destructive focus:border-destructive" : ""
                    )}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl text-muted-foreground hover:text-primary"
                    onClick={() =>
                      setPasswordSection((prev) => ({
                        ...prev,
                        showNew: !prev.showNew,
                      }))
                    }
                  >
                    {passwordSection.showNew ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </Button>
                </div>
                {passwordFieldErrors.newPassword && (
                  <p className="text-xs text-destructive mt-1 ml-1">{passwordFieldErrors.newPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {t("auth.confirmPassword")}
                </Label>
                <div className="relative">
                  <Input
                    type={passwordSection.showConfirm ? "text" : "password"}
                    value={passwordSection.confirmPassword}
                    onChange={(e) => {
                      setPasswordSection((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }));
                      if (passwordFieldErrors.confirmPassword) setPasswordFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }}
                    className={cn(
                      "rounded-2xl h-12 bg-muted/20 border-2 focus:border-primary transition-all px-4",
                      (passwordSection.confirmPassword &&
                        passwordSection.newPassword !==
                          passwordSection.confirmPassword) || passwordFieldErrors.confirmPassword
                        ? "border-destructive focus:border-destructive"
                        : "",
                    )}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl text-muted-foreground hover:text-primary"
                    onClick={() =>
                      setPasswordSection((prev) => ({
                        ...prev,
                        showConfirm: !prev.showConfirm,
                      }))
                    }
                  >
                    {passwordSection.showConfirm ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </Button>
                </div>
                {passwordFieldErrors.confirmPassword && (
                  <p className="text-xs text-destructive mt-1 ml-1">{passwordFieldErrors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={passwordSection.isSaving}
                className="w-full rounded-2xl h-12 font-black gap-2 shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
              >
                {passwordSection.isSaving ? (
                  <span className="animate-spin h-5 w-5 border-2 border-white/40 border-t-white rounded-full" />
                ) : (
                  <>
                    <Save size={18} />
                    {t("settings.saveChanges")}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Email Card */}
        <div className="space-y-6">
          <Card className="rounded-[2.5rem] border-2 shadow-none overflow-hidden hover:border-primary/20 transition-colors">
            <CardHeader className="bg-muted/30 p-8 border-b">
              <CardTitle className="flex items-center gap-3 text-xl font-black">
                <Mail className="text-primary" size={20} />
                {t("settings.changeEmail")}
              </CardTitle>
              <CardDescription className="font-medium">
                {t("common.email")}:{" "}
                <span className="text-foreground font-bold">{user?.email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {t("settings.newEmail")}
                </Label>
                <Input
                  type="email"
                  value={emailSection.newEmail}
                  onChange={(e) =>
                    setEmailSection((prev) => ({
                      ...prev,
                      newEmail: e.target.value,
                    }))
                  }
                  className="rounded-2xl h-12 bg-muted/20 border-2 focus:border-primary transition-all px-4"
                  placeholder="name@example.com"
                />
              </div>
              <Button
                onClick={handleChangeEmail}
                disabled={emailSection.isSaving || !emailSection.newEmail}
                variant="outline"
                className="w-full rounded-2xl h-12 font-black gap-2 border-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
              >
                {emailSection.isSaving ? (
                  <span className="animate-spin h-5 w-5 border-2 border-primary/40 border-t-primary rounded-full" />
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    {t("settings.changeEmail")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Account Deletion Area */}
          <Card className="rounded-[2.5rem] border-2 border-destructive/20 bg-destructive/2 shadow-none overflow-hidden hover:bg-destructive/4 transition-colors">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-destructive">
                  {t('settings.dangerousArea')}
                </h4>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                  {t('settings.permanentAccountDeletion')}
                </p>
              </div>
              <p className="text-sm text-muted-foreground font-medium max-w-xs">
                {t('settings.deleteAccountWarning')}
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="rounded-2xl h-12 px-8 font-black gap-2 shadow-xl shadow-destructive/20 active:scale-[0.98]"
                  >
                    {t("common.delete")} {t("nav.account")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("messages.confirmDeleteAccount") || "Are you sure?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("customer.settings.deleteAccountWarning") ||
                        "This action cannot be undone. All your data will be lost forever."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={handleDeleteAccount}
                    >
                      {t("common.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reset Flow Overlay (Copied from Merchant Security) */}
      {resetFlow.step !== "none" && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-md rounded-[3rem] border border-border shadow-2xl overflow-hidden p-10 space-y-8 animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center">
              <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
                <Lock size={28} />
              </div>
              <button
                onClick={() =>
                  setResetFlow((prev) => ({ ...prev, step: "none" }))
                }
                className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {resetFlow.step === "email" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-3xl font-black text-foreground tracking-tighter">
                    {t("auth.resetPassword")}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium mt-3 leading-relaxed">
                    {t("auth.enterEmailToReset")}
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("common.email")}
                    </label>
                    <Input
                      value={resetFlow.email}
                      onChange={(e) =>
                        setResetFlow((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className="h-16 rounded-2xl border-2 font-black text-lg focus:ring-primary/20 transition-all"
                      placeholder="name@example.com"
                    />
                  </div>
                  <Button
                    onClick={handleRequestReset}
                    disabled={resetFlow.isLoading}
                    className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all"
                  >
                    {resetFlow.isLoading ? (
                      <span className="animate-spin h-6 w-6 border-2 border-white/40 border-t-white rounded-full" />
                    ) : (
                      t("auth.sendCode")
                    )}
                  </Button>
                </div>
              </div>
            )}

            {resetFlow.step === "code" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-3xl font-black text-foreground tracking-tighter">
                    {t("auth.enterCode")}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium mt-3 leading-relaxed">
                    {t("auth.codeSentTo")}{" "}
                    <span className="text-primary font-bold">
                      {resetFlow.email}
                    </span>
                  </p>
                </div>
                <div className="space-y-6">
                  <Input
                    value={resetFlow.code}
                    onChange={(e) =>
                      setResetFlow((prev) => ({
                        ...prev,
                        code: e.target.value,
                      }))
                    }
                    className="h-20 rounded-[2rem] border-2 font-black text-4xl text-center tracking-[0.5em] focus:tracking-[0.5em] transition-all"
                    maxLength={6}
                    placeholder="000000"
                  />
                  <Button
                    onClick={handleVerifyCode}
                    disabled={resetFlow.isLoading}
                    className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all"
                  >
                    {resetFlow.isLoading ? (
                      <span className="animate-spin h-6 w-6 border-2 border-white/40 border-t-white rounded-full" />
                    ) : (
                      t("auth.verifyCode")
                    )}
                  </Button>
                  <button
                    onClick={handleRequestReset}
                    className="w-full text-xs font-black text-primary uppercase tracking-widest hover:underline"
                  >
                    {t("auth.resendCode")}
                  </button>
                </div>
              </div>
            )}

            {resetFlow.step === "new_password" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-3xl font-black text-foreground tracking-tighter">
                    {t("auth.setNewPassword")}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium mt-3 leading-relaxed">
                    {t("auth.chooseStrongPassword")}
                  </p>
                </div>
                <div className="space-y-6 text-left">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("auth.newPassword")}
                    </label>
                    <Input
                      type="password"
                      value={resetFlow.newPassword}
                      onChange={(e) =>
                        setResetFlow((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      className="h-14 rounded-2xl border-2 px-6"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("auth.confirmNewPassword")}
                    </label>
                    <Input
                      type="password"
                      value={resetFlow.confirmPassword}
                      onChange={(e) =>
                        setResetFlow((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className={cn(
                        "h-14 rounded-2xl border-2 px-6",
                        resetFlow.confirmPassword &&
                          resetFlow.newPassword !== resetFlow.confirmPassword
                          ? "border-red-400 focus:border-red-400"
                          : "",
                      )}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button
                    onClick={handleResetPassword}
                    disabled={
                      resetFlow.isLoading ||
                      !resetFlow.newPassword ||
                      !resetFlow.confirmPassword
                    }
                    className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all"
                  >
                    {resetFlow.isLoading ? (
                      <span className="animate-spin h-6 w-6 border-2 border-white/40 border-t-white rounded-full" />
                    ) : (
                      t("auth.updatePassword")
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
