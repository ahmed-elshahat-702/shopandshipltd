import { useLocale } from "next-intl";

/**
 * Get the current locale
 * Must be used in a component within the locale group
 */
export function useCurrentLocale() {
  return useLocale();
}

/**
 * Check if current locale is RTL (Arabic)
 */
export function useIsRTL() {
  const locale = useLocale();
  return locale === "ar";
}

/**
 * Get the opposite locale for language switching
 */
export function getOppositeLocale(currentLocale: string): string {
  if (currentLocale === "ko") return "en";
  return currentLocale === "ar" ? "en" : "ar";
}

/**
 * Get RTL/LTR direction based on locale
 */
export function getDirection(locale: string): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/**
 * Format locale for display
 */
export function getLocaleLabel(locale: string): string {
  if (locale === "ko") return "한국어";
  return locale === "ar" ? "العربية" : "English";
}

/**
 * Check if locale is valid
 */
export function isValidLocale(locale: string): boolean {
  return ["en", "ar", "ko"].includes(locale);
}
