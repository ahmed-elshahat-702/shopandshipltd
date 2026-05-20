"use client";

import { useTranslations } from "next-intl";
import { Mail, Loader2 } from "lucide-react";
import OTPInput from "@/components/auth/OTPInput";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyOtpAction, resendOtpAction } from "@/app/actions/auth";

export default function VerifyEmailClient() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const next = searchParams.get("next");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (!email || isResending) return;

    setIsResending(true);
    try {
      const result = await resendOtpAction({ email });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("auth.codeResent") || "Verification code sent!");
      }
    } catch {
      toast.error(t("messages.networkError") || "An error occurred");
    } finally {
      setIsResending(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    if (!email) {
      toast.error(t("messages.error") || "Email not found");
      return;
    }

    setIsVerifying(true);

    try {
      const result = await verifyOtpAction({ email, otp });

      if (result.error) {
        toast.error(result.error);
        setIsVerifying(false);
        return;
      }

      toast.success(t("auth.emailVerified") || "Email verified successfully!");
      
      if (next && next.startsWith("/")) {
        router.push(next);
      } else {
        router.push("/");
      }
    } catch {
      toast.error(t("messages.networkError") || "An error occurred");
      setIsVerifying(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-card/95 border border-border rounded-2xl shadow-2xl p-8 space-y-8 backdrop-blur-sm">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
            <Mail size={32} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            {t("auth.verifyEmail") || "Verify Email"}
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Enter the 6-digit code sent to {email || "your email"}.
          </p>
        </div>

        <div className="space-y-6">
          <OTPInput onComplete={handleOTPComplete} />

          <div className="text-center space-y-4">
            {isVerifying ? (
              <div className="flex items-center justify-center gap-2 text-primary font-medium">
                <Loader2 size={20} className="animate-spin" />
                Verifying...
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive the code?{" "}
                <button
                  className="text-primary hover:underline font-semibold disabled:opacity-50"
                  onClick={handleResend}
                  disabled={isResending}
                >
                  {isResending ? "Resending..." : "Resend Code"}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
