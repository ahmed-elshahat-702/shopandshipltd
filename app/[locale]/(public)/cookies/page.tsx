import { getTranslations } from 'next-intl/server';
import { Cookie } from 'lucide-react';

export default async function CookiesPage() {
  const t = await getTranslations();

  return (
    <div className="bg-background min-h-screen py-24 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="space-y-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <Cookie size={32} />
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground">
            {t('cookies.title') || 'Cookie Policy'}
          </h1>
          <p className="text-muted-foreground font-medium">
            {t('cookies.lastUpdated') || 'Last Updated: May 2024'}
          </p>
        </div>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-foreground/80 font-medium leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-black text-foreground">{t('cookies.sec1Title') || '1. What are Cookies?'}</h2>
            <p>{t('cookies.sec1Content') || 'Cookies are small text files that are stored on your device when you visit a website. They help the website recognize your device and remember information about your visit.'}</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black text-foreground">{t('cookies.sec2Title') || '2. How We Use Cookies'}</h2>
            <p>{t('cookies.sec2Content') || 'We use cookies to understand how you interact with our platform, remember your preferences, and provide you with a more personalized experience.'}</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black text-foreground">{t('cookies.sec3Title') || '3. Types of Cookies We Use'}</h2>
            <p>{t('cookies.sec3Content') || 'We use essential cookies for platform functionality, analytical cookies to understand usage, and marketing cookies to provide relevant offers.'}</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black text-foreground">{t('cookies.sec4Title') || '4. Managing Cookies'}</h2>
            <p>{t('cookies.sec4Content') || 'You can control and manage cookies through your browser settings. Please note that removing or blocking cookies may impact your experience on our platform.'}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
