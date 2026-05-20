"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { loginAction } from "@/app/actions/auth";

type FieldErrors = Partial<Record<keyof LoginInput, string>>;

export default function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState<LoginInput>({
    email: "",
    password: "",
  });

  // Handle errors from query params (e.g., account_deactivated)
  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "account_deactivated") {
      toast.error(t("auth.errors.accountDeactivated"), {
        action: {
          label: t("nav.customerService"),
          onClick: () => router.push("/support"),
        },
      });
      // Clear the error param from URL without refreshing
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [searchParams, t, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (fieldErrors[name as keyof LoginInput]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side zod validation
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginInput;
        errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const data = await loginAction(result.data);

      if (data.error) {
        if (data.error === "Email not verified") {
          toast.error(
            t("auth.emailNotVerified") || "Please verify your email first.",
          );
          const verifyUrl = `/verify-email?email=${encodeURIComponent(formData.email)}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
          router.push(verifyUrl);
          return;
        }
        if (data.error === "account_deactivated") {
          toast.error(t("auth.errors.accountDeactivated"), {
            action: {
              label: t("nav.customerService"),
              onClick: () => router.push("/support"),
            },
          });
          return;
        }
        toast.error(data.error || t("messages.operationFailed"));
        return;
      }

      toast.success(t("messages.loginSuccess"));
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
      }
      router.refresh();
    } catch {
      toast.error(t("messages.networkError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Email Field */}
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-foreground"
        >
          {t("common.email")}
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder={t("common.email")}
            autoComplete="email"
            className={`w-full pl-10 pr-4 py-2 border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
              fieldErrors.email
                ? "border-destructive focus:ring-destructive"
                : "border-border"
            }`}
          />
        </div>
        {fieldErrors.email && (
          <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-foreground"
        >
          {t("auth.password")}
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={t("auth.password")}
            autoComplete="current-password"
            className={`w-full pl-10 pr-12 py-2 border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
              fieldErrors.password
                ? "border-destructive focus:ring-destructive"
                : "border-border"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            aria-label={
              showPassword ? t("auth.hidePassword") : t("auth.showPassword")
            }
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {fieldErrors.password && (
          <p className="text-xs text-destructive mt-1">
            {fieldErrors.password}
          </p>
        )}
      </div>

      {/* Remember Me */}
      <div className="flex items-center">
        <input
          id="rememberMe"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
        />
        <label
          htmlFor="rememberMe"
          className="ml-2 text-sm text-muted-foreground"
        >
          {t("auth.rememberMe")}
        </label>
      </div>

      {/* Login Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
      >
        {isLoading && <Loader2 size={20} className="animate-spin" />}
        {t("auth.login")}
      </button>

      {/* Forgot Password Link */}
      <div className="text-center text-sm">
        <Link
          href={
            next
              ? `/forgot-password?next=${encodeURIComponent(next)}`
              : "/forgot-password"
          }
          className="text-primary hover:text-primary/80 font-medium"
        >
          {t("auth.forgotPassword")}
        </Link>
      </div>

      {/* Sign Up Link */}
      <div className="text-center text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link
          href={
            next ? `/register?next=${encodeURIComponent(next)}` : "/register"
          }
          className="text-primary hover:text-primary/80 font-medium"
        >
          {t("auth.signup")}
        </Link>
      </div>
    </form>
  );
}
