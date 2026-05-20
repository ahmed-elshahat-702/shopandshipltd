'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/navigation';
import { resetPasswordAction } from '@/app/actions/auth';
import { useSearchParams } from 'next/navigation';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations/auth';

type FieldErrors = Partial<Record<keyof ResetPasswordInput, string>>;

export default function ResetPasswordForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const authError = searchParams.get('error');
  const authErrorDesc = searchParams.get('error_description');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState<ResetPasswordInput>({
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side zod validation
    const result = resetPasswordSchema.safeParse(formData);
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ResetPasswordInput;
        errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsLoading(true);
    
    try {
      const response = await resetPasswordAction({ password: formData.password });
      
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success(response.message || t('messages.passwordResetSuccess') || 'Password reset successfully');
        if (next) {
          router.push(next);
        } else {
          router.push('/');
        }
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authError) {
    return (
      <div className="space-y-6 text-center">
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl flex items-center gap-3 text-left">
          <AlertCircle size={24} className="shrink-0" />
          <p className="text-sm font-medium">
            {authErrorDesc ? authErrorDesc.replace(/\+/g, ' ') : 'Invalid or expired link.'}
          </p>
        </div>
        <Link
          href={next ? `/forgot-password?next=${encodeURIComponent(next)}` : "/forgot-password"}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
        >
          {t('auth.forgotPassword') || 'Forgot Password'}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ... rest of form ... */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          {t('auth.newPassword')}
        </label>
        <div className="relative">
          <Lock className="absolute ltr:left-3 rtl:right-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
            }}
            required
            placeholder="••••••••"
            className={`w-full ltr:pl-10 rtl:pr-10 ltr:pr-12 rtl:pl-12 py-3 border bg-background rounded-xl focus:ring-2 outline-none transition-all ${
              fieldErrors.password
                ? 'border-destructive focus:ring-destructive'
                : 'border-border focus:ring-primary'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute ltr:right-3 rtl:left-3 top-3.5 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {fieldErrors.password && (
          <p className="text-xs text-destructive mt-1">{fieldErrors.password}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          {t('auth.confirmNewPassword')}
        </label>
        <div className="relative">
          <Lock className="absolute ltr:left-3 rtl:right-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => {
              setFormData({ ...formData, confirmPassword: e.target.value });
              if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
            }}
            required
            placeholder="••••••••"
            className={`w-full ltr:pl-10 rtl:pr-10 ltr:pr-12 rtl:pl-12 py-3 border bg-background rounded-xl focus:ring-2 outline-none transition-all ${
              fieldErrors.confirmPassword
                ? 'border-destructive focus:ring-destructive'
                : 'border-border focus:ring-primary'
            }`}
          />
          {formData.confirmPassword && formData.password === formData.confirmPassword && !fieldErrors.confirmPassword && (
            <CheckCircle2 size={18} className="absolute ltr:right-10 rtl:left-10 top-3.5 text-green-500" />
          )}
        </div>
        {fieldErrors.confirmPassword && (
          <p className="text-xs text-destructive mt-1">{fieldErrors.confirmPassword}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20"
      >
        {isLoading ? <Loader2 className="animate-spin" size={20} /> : null}
        {t('auth.resetPassword')}
      </button>

      <div className="text-center pt-2">
        <Link 
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="text-sm text-primary hover:underline font-medium"
        >
          {t('auth.back')} {t('auth.login')}
        </Link>
      </div>
    </form>
  );
}
