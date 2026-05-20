import { getTranslations } from 'next-intl/server';
import { FileText } from 'lucide-react';

export default async function TermsPage() {
  const t = await getTranslations();

  return (
    <div className="bg-background min-h-screen py-24 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="space-y-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <FileText size={32} />
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground">
            {t('terms.title') || 'Terms of Service'}
          </h1>
          <p className="text-muted-foreground font-medium">
            {t('terms.lastUpdated') || 'Last Updated: May 2024'}
          </p>
        </div>

        <div className="space-y-8 md:space-y-12 text-foreground/80 font-medium leading-relaxed">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <section key={i} className="p-6 md:p-10 rounded-[2.5rem] bg-card border-2 border-border/50 hover:border-primary/30 transition-all duration-300 space-y-4 shadow-sm">
              <h2 className="text-xl md:text-2xl font-black text-foreground flex items-start gap-4">
                <span className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm md:text-base shrink-0">
                  {i}
                </span>
                {t(`terms.sec${i}Title`)}
              </h2>
              <div className="pl-0 md:pl-14 text-sm md:text-base leading-relaxed text-muted-foreground">
                {t(`terms.sec${i}Content`)}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
