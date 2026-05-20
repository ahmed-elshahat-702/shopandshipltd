"use client";

import { forgotPasswordAction, resetPasswordAction } from "@/app/actions/auth";
import { updateMerchantEmailAction } from "@/app/actions/merchant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { Check, Eye, EyeOff, Lock, Mail, ShieldCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

// Supabase client for auth operations
function getSupabase() {
  return createClient();
}

const SecurityClient = () => {
  const t = useTranslations();
  const { user } = useUser();

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

  const handleChangePassword = async () => {
    if (!passwordSection.currentPassword) {
      toast.error(t("auth.errors.currentPasswordRequired"));
      return;
    }
    if (passwordSection.newPassword.length < 8) {
      toast.error(t("auth.errors.passwordTooShort"));
      return;
    }
    if (passwordSection.newPassword !== passwordSection.confirmPassword) {
      toast.error(t("auth.errors.passwordMismatch"));
      return;
    }

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

      toast.success(t("merchant.passwordUpdated"));
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <div className="w-14 h-14 bg-primary/10 text-primary rounded-[1.5rem] flex items-center justify-center shadow-inner">
          <ShieldCheck size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter">
            {t("merchant.security")}
          </h1>
          <p className="text-muted-foreground font-medium">
            {t("merchant.securityDesc")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Email Section */}
        <section className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-primary/5 text-primary rounded-2xl flex items-center justify-center">
              <Mail size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">
                {t("settings.changeEmail")}
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                {t("common.email")}:{" "}
                <span className="text-foreground font-bold">{user?.email}</span>
              </p>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                {t("settings.newEmail")}
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40"
                />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={emailSection.newEmail}
                  onChange={(e) =>
                    setEmailSection((prev) => ({
                      ...prev,
                      newEmail: e.target.value,
                    }))
                  }
                  className="h-14 rounded-2xl border-2 pl-12 font-medium focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <Button
              onClick={handleChangeEmail}
              disabled={emailSection.isSaving || !emailSection.newEmail}
              className="rounded-2xl h-14 px-8 font-black gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-all text-xs uppercase tracking-widest"
            >
              {emailSection.isSaving ? (
                <span className="animate-spin h-5 w-5 border-2 border-white/40 border-t-white rounded-full" />
              ) : (
                <Check size={18} />
              )}
              {t("settings.changeEmail")}
            </Button>
          </div>
        </section>

        {/* Password Section */}
        <section className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-primary/5 text-primary rounded-2xl flex items-center justify-center">
              <Lock size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">
                {t("settings.changePassword")}
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                {t("settings.changePasswordDesc")}
              </p>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {t("auth.currentPassword")}
                </label>
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
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40"
                />
                <Input
                  type={passwordSection.showCurrent ? "text" : "password"}
                  value={passwordSection.currentPassword}
                  onChange={(e) =>
                    setPasswordSection((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  className="h-14 rounded-2xl border-2 pl-12 pr-12 font-medium transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() =>
                    setPasswordSection((prev) => ({
                      ...prev,
                      showCurrent: !prev.showCurrent,
                    }))
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {passwordSection.showCurrent ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {t("auth.newPassword")}
                </label>
                <div className="relative">
                  <Input
                    type={passwordSection.showNew ? "text" : "password"}
                    value={passwordSection.newPassword}
                    onChange={(e) =>
                      setPasswordSection((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    className="h-14 rounded-2xl border-2 px-6 font-medium transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPasswordSection((prev) => ({
                        ...prev,
                        showNew: !prev.showNew,
                      }))
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {passwordSection.showNew ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {t("auth.confirmNewPassword")}
                </label>
                <div className="relative">
                  <Input
                    type={passwordSection.showConfirm ? "text" : "password"}
                    value={passwordSection.confirmPassword}
                    onChange={(e) =>
                      setPasswordSection((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    className={cn(
                      "h-14 rounded-2xl border-2 px-6 font-medium transition-all",
                      passwordSection.confirmPassword &&
                        passwordSection.newPassword !==
                          passwordSection.confirmPassword
                        ? "border-red-400 focus:border-red-400"
                        : "",
                    )}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPasswordSection((prev) => ({
                        ...prev,
                        showConfirm: !prev.showConfirm,
                      }))
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {passwordSection.showConfirm ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <Button
              onClick={handleChangePassword}
              disabled={
                passwordSection.isSaving ||
                !passwordSection.currentPassword ||
                !passwordSection.newPassword ||
                !passwordSection.confirmPassword
              }
              className="rounded-2xl h-14 px-8 font-black gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-all text-xs uppercase tracking-widest"
            >
              {passwordSection.isSaving ? (
                <span className="animate-spin h-5 w-5 border-2 border-white/40 border-t-white rounded-full" />
              ) : (
                <Lock size={18} />
              )}
              {t("auth.updatePassword")}
            </Button>
          </div>
        </section>
      </div>

      {/* Reset Flow Overlay */}
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
};

export default SecurityClient;
