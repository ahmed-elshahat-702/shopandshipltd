"use client";

import { registerAction } from "@/app/actions/auth";
import { Link, useRouter } from "@/i18n/navigation";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { Check, Eye, EyeOff, Loader2, Lock, Mail, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type FieldErrors = Partial<Record<keyof RegisterInput, string>>;

export default function RegisterForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState<RegisterInput>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [passwordStrength, setPasswordStrength] = useState(0);

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*]/.test(password)) strength++;
    return strength;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (fieldErrors[name as keyof RegisterInput]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (name === "password") {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return "bg-red-500";
    if (passwordStrength <= 2) return "bg-orange-500";
    if (passwordStrength <= 3) return "bg-yellow-500";
    if (passwordStrength <= 4) return "bg-primary";
    return "bg-green-500";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side zod validation
    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof RegisterInput;
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const data = await registerAction({
        fullName: result.data.name,
        email: result.data.email,
        password: result.data.password,
      });

      if (data.error) {
        toast.error(data.error || t("messages.operationFailed"));
        return;
      }

      toast.success(t("auth.signupSuccess"));
      const verifyUrl = `/verify-email?email=${encodeURIComponent(result.data.email)}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
      router.push(verifyUrl);
    } catch {
      toast.error(t("messages.networkError"));
    } finally {
      setIsLoading(false);
    }
  };

  const passwordsMatch =
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Name Field */}
      <div className="space-y-1.5">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-foreground"
        >
          {t("auth.fullName")}
        </label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder={t("auth.fullName")}
            autoComplete="name"
            className={`w-full pl-10 pr-4 py-2 border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
              fieldErrors.name
                ? "border-destructive focus:ring-destructive"
                : "border-border"
            }`}
          />
        </div>
        {fieldErrors.name && (
          <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>
        )}
      </div>

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
            autoComplete="new-password"
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

        {/* Password Strength Indicator */}
        {formData.password && (
          <div className="space-y-1.5">
            <div className="flex gap-1 h-1.5">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    i < passwordStrength
                      ? getPasswordStrengthColor()
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {passwordStrength <= 1 && t("auth.weakPassword")}
              {passwordStrength === 2 && t("auth.fairPassword")}
              {passwordStrength === 3 && t("auth.goodPassword")}
              {passwordStrength === 4 && t("auth.strongPassword")}
              {passwordStrength >= 5 && t("auth.veryStrongPassword")}
            </p>
          </div>
        )}
      </div>

      {/* Confirm Password Field */}
      <div className="space-y-1.5">
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-foreground"
        >
          {t("auth.confirmPassword")}
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder={t("auth.confirmPassword")}
            autoComplete="new-password"
            className={`w-full pl-10 pr-20 py-2 border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
              fieldErrors.confirmPassword
                ? "border-destructive focus:ring-destructive"
                : "border-border"
            }`}
          />
          {/* Match indicator */}
          {formData.confirmPassword && (
            <span className="absolute right-10 top-3">
              {passwordsMatch ? (
                <Check size={18} className="text-green-500" />
              ) : (
                <X size={18} className="text-destructive" />
              )}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            aria-label={
              showConfirmPassword
                ? t("auth.hidePassword")
                : t("auth.showPassword")
            }
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {fieldErrors.confirmPassword && (
          <p className="text-xs text-destructive mt-1">
            {fieldErrors.confirmPassword}
          </p>
        )}
      </div>

      {/* Sign Up Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
      >
        {isLoading && <Loader2 size={20} className="animate-spin" />}
        {t("auth.signup")}
      </button>

      {/* Login Link */}
      <div className="text-center text-sm text-muted-foreground">
        {t("auth.haveAccount")}{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="text-primary hover:text-primary/80 font-medium"
        >
          {t("auth.login")}
        </Link>
      </div>
    </form>
  );
}
