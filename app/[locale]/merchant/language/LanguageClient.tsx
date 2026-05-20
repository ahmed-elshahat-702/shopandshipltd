"use client";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Check, Globe } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

export default function LanguageClient() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const handleLanguageChange = (newLocale: "ar" | "en") => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <section className="bg-card rounded-[2.5rem] p-10 border-2 border-primary/20 shadow-xl shadow-primary/5 space-y-8 mt-10 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
          <Globe size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">
            {t("settings.language")}
          </h2>
          <p className="text-muted-foreground font-medium">
            {t("settings.appPreferencesDesc")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(
          [
            { code: "en", name: "English", native: "English" },
            { code: "ar", name: "العربية", native: "Arabic" },
          ] as const
        ).map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              "relative flex items-center justify-between p-6 rounded-2xl border-2 transition-all duration-300",
              locale === lang.code
                ? "bg-primary border-primary text-primary-foreground scale-[1.02] shadow-xl shadow-primary/10"
                : "bg-card border-border text-muted-foreground hover:border-primary/50",
            )}
          >
            <div className="flex flex-col items-start">
              <span className="font-black text-xs uppercase tracking-[0.2em]">
                {lang.name}
              </span>
              <span
                className={cn(
                  "text-lg font-black",
                  locale === lang.code ? "text-white" : "text-foreground",
                )}
              >
                {lang.native}
              </span>
            </div>
            {locale === lang.code && (
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Check size={20} />
              </div>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
