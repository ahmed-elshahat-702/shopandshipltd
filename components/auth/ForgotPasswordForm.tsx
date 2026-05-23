"use client";

import { forgotPasswordAction, verifyRecoveryOtpAction } from "@/app/actions/auth";
import { Link, useRouter } from "@/i18n/navigation";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";
import OTPInput from "@/components/auth/OTPInput";
import { Loader2, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type FieldErrors = Partial<Record<keyof ForgotPasswordInput, string>>;

interface ForgotPasswordFormProps {
  step: 'email' | 'otp';
  setStep: (step: 'email' | 'otp') => void;
  email: string;
  setEmail: (email: string) => void;
}

export default function ForgotPasswordForm({
  step,
  setStep,
  email,
  setEmail,
}: ForgotPasswordFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [userCaptcha, setUserCaptcha] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [captcha, setCaptcha] = useState(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  });

  const generateCaptcha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side zod validation
    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ForgotPasswordInput;
        errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    if (userCaptcha.toUpperCase() !== captcha) {
      toast.error(t("auth.errors.invalidCaptcha") || "Invalid security code");
      generateCaptcha();
      setUserCaptcha("");
      return;
    }

    setIsLoading(true);

    try {
      const response = await forgotPasswordAction({ email });

      if (response.error) {
        toast.error(response.error);
        generateCaptcha();
        setUserCaptcha("");
      } else {
        toast.success(response.message || t("messages.resetCodeSent") || "Reset code sent to your email");
        setStep('otp');
        generateCaptcha();
        setUserCaptcha("");
      }
    } catch (error) {
      console.error("Password reset request error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || isLoading) return;

    setIsLoading(true);
    try {
      const response = await forgotPasswordAction({ email });

      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success(t("auth.codeResent") || "Reset code has been resent to your email");
      }
    } catch (error) {
      console.error("Resend error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    if (!email) {
      toast.error("Email is required");
      return;
    }

    setOtpLoading(true);

    try {
      const response = await verifyRecoveryOtpAction({ email, otp });

      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success(response.message || "Code verified successfully");
        const resetPath = next
          ? `/reset-password?next=${encodeURIComponent(next)}`
          : "/reset-password";
        router.push(resetPath);
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="space-y-6">
        <OTPInput onComplete={handleOTPComplete} />

        <div className="text-center space-y-4">
          {otpLoading ? (
            <div className="flex items-center justify-center gap-2 text-primary font-medium">
              <Loader2 size={20} className="animate-spin" />
              {t("common.processing") || "Verifying..."}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive the code?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline font-semibold disabled:opacity-50"
                  onClick={handleResend}
                  disabled={isLoading}
                >
                  {isLoading ? "Resending..." : t("auth.resendCode")}
                </button>
              </p>
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-sm text-primary hover:underline font-medium"
              >
                {t("auth.back") || "Back"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-foreground"
        >
          {t("common.email")}
        </label>
        <div className="relative">
          <Mail className="absolute ltr:left-3 rtl:right-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email)
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder={t("common.email")}
            required
            className={`w-full ltr:pl-10 rtl:pr-10 py-2 border bg-background rounded-lg focus:ring-2 outline-none transition-all ${
              fieldErrors.email
                ? "border-destructive focus:ring-destructive"
                : "border-border focus:ring-primary focus:border-primary"
            }`}
          />
        </div>
        {fieldErrors.email && (
          <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>
        )}
      </div>

      <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border/50">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <ShieldCheck size={16} className="text-primary" />
            Security Code
          </label>
          <button
            type="button"
            onClick={generateCaptcha}
            className="text-primary hover:rotate-180 transition-transform duration-500 p-1"
            title="Refresh code"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="flex gap-4 items-center">
          <div className="bg-primary/10 text-primary font-mono text-xl tracking-widest px-4 py-2 rounded-lg border border-primary/20 select-none italic line-through decoration-primary/40">
            {captcha}
          </div>
          <input
            type="text"
            value={userCaptcha}
            onChange={(e) => setUserCaptcha(e.target.value.toUpperCase())}
            placeholder={t("auth.captchaPlaceholder") || "Enter the code above"}
            maxLength={6}
            required
            className="w-full px-4 py-2 border border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-mono"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
      >
        {isLoading ? <Loader2 className="animate-spin" size={20} /> : null}
        {t("common.submit")}
      </button>

      <div className="text-center">
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="text-sm text-primary hover:underline font-medium"
        >
          {t("auth.haveAccount")} {t("auth.login")}
        </Link>
      </div>
    </form>
  );
}
