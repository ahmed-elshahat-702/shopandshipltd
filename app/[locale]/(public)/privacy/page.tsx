import { getTranslations } from 'next-intl/server';
import { Shield, Lock, Eye, Database } from 'lucide-react';

export default async function PrivacyPage() {
  const t = await getTranslations();

  const sections = [
    {
      icon: Database,
      title: t('privacy.sec1Title'),
      content: t('privacy.sec1Content'),
      color: 'text-blue-600 bg-blue-50'
    },
    {
      icon: Lock,
      title: t('privacy.sec2Title'),
      content: t('privacy.sec2Content'),
      color: 'text-green-600 bg-green-50'
    },
    {
      icon: Eye,
      title: t('privacy.sec3Title'),
      content: t('privacy.sec3Content'),
      color: 'text-purple-600 bg-purple-50'
    }
  ];

  return (
    <div className="bg-background min-h-screen py-16 md:py-24 px-4">
      <div className="max-w-4xl mx-auto space-y-12 md:space-y-20">
        {/* Header */}
        <div className="space-y-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-[2rem] bg-primary/10 text-primary mb-4 shadow-inner">
            <Shield size={40} className="md:w-12 md:h-12" />
          </div>
          <h1 className="text-3xl md:text-6xl font-black tracking-tight text-foreground leading-tight px-2">
            {t('privacy.title')}
          </h1>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-1 bg-primary rounded-full" />
            <p className="text-muted-foreground font-bold text-sm md:text-base uppercase tracking-widest">
              {t('privacy.lastUpdated')}
            </p>
          </div>
        </div>

        {/* Intro */}
        <div className="p-8 md:p-12 rounded-[2.5rem] bg-muted/30 border border-border/50 relative overflow-hidden">
          <p className="relative z-10 text-lg md:text-xl text-foreground/80 font-bold leading-relaxed text-center italic">
            {t('privacy.introContent')}
          </p>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
        </div>

        {/* Sections */}
        <div className="grid grid-cols-1 gap-8 md:gap-12">
          {sections.map((section, i) => (
            <div key={i} className="group relative">
              <div className="flex flex-col md:flex-row items-start gap-6 md:gap-10 p-8 md:p-12 rounded-[3rem] bg-card border-2 border-border/50 hover:border-primary/30 transition-all duration-500 shadow-sm hover:shadow-xl hover:-translate-y-1">
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] flex items-center justify-center shrink-0 ${section.color} shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                  <section.icon size={32} className="md:w-10 md:h-10" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
                    {section.title}
                  </h2>
                  <p className="text-muted-foreground text-sm md:text-base font-medium leading-relaxed">
                    {section.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="text-center pt-8 md:pt-12">
          <p className="text-muted-foreground text-xs md:text-sm font-bold uppercase tracking-widest opacity-60">
            © 2021 - {t('footer.copyRight')}
          </p>
        </div>
      </div>
    </div>
  );
}
