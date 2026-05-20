'use client';

import { useTranslations } from 'next-intl';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const t = useTranslations('auth');

  return (
    <div className="w-full max-w-md">
      <div className="bg-card/95 border border-border rounded-2xl shadow-2xl p-8 space-y-8 backdrop-blur-md">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">{t('resetPassword')}</h1>
          <p className="text-muted-foreground text-sm font-medium">
            Create a new strong password for your account.
          </p>
        </div>
        
        <Suspense fallback={<Loader2 className="animate-spin mx-auto text-primary" size={32} />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
