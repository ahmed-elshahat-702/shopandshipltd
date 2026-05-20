"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { Suspense } from "react";

function LanguageSwitcherInner() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("common");

  const handleLanguageChange = (newLocale: string) => {
    const params = searchParams.toString();
    const newPathname = params ? `${pathname}?${params}` : pathname;
    router.replace(newPathname, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Globe className="h-4 w-4" />
          <span className="sr-only">{t("language")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={locale === "ar" ? "start" : "end"}>
        <DropdownMenuItem
          onClick={() => handleLanguageChange("en")}
          className={locale === "en" ? "bg-accent" : ""}
        >
          {t("english")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange("ar")}
          className={locale === "ar" ? "bg-accent" : ""}
        >
          {t("arabic")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageSwitcher() {
  return (
    <Suspense
      fallback={
        <Button variant="ghost" size="icon" className="relative" disabled>
          <Globe className="h-4 w-4" />
        </Button>
      }
    >
      <LanguageSwitcherInner />
    </Suspense>
  );
}
