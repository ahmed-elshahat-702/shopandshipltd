'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');

  return (
    <div className="w-full md:max-w-md md:p-8 min-h-screen md:min-h-0 flex items-center">
      <div className="w-full h-full md:h-auto bg-card md:bg-card/95 border-0 md:border border-border md:rounded-2xl shadow-none md:shadow-2xl p-8 space-y-8 backdrop-blur-md flex flex-col justify-center">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            {step === 'email' ? t('forgotPassword') : t('enterCode')}
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            {step === 'email' 
              ? t('forgotPasswordDesc') 
              : `${t('codeSentTo')} ${email}`
            }
          </p>
        </div>
        
        <ForgotPasswordForm 
          step={step} 
          setStep={setStep} 
          email={email} 
          setEmail={setEmail} 
        />
      </div>
    </div>
  );
}
