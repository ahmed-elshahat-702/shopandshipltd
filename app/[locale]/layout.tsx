import type { Metadata } from "next";
import { Cairo, Roboto } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

import { routing } from "@/i18n/routing";
import { getDirection } from "@/lib/i18n";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { ReactNode } from "react";
import { getCurrentUserProfile } from "@/utils/supabase";
import { AuthProvider } from "@/components/auth/auth-provider";

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Shop Ship LED",
    default: "Shop Ship LED - The Complete Dropshipping Platform",
  },
  description: "The complete platform for shopping and shipping high-quality products. Join our dropshipping network today.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  keywords: ["dropshipping", "ecommerce", "shopping", "shipping", "products", "B2B", "wholesale", "LED"],
  authors: [{ name: "Shop Ship LED Team" }],
  creator: "Shop Ship LED",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Shop Ship LED",
    title: "Shop Ship LED - The Complete Dropshipping Platform",
    description: "The complete platform for shopping and shipping high-quality products. Join our dropshipping network today.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Shop Ship LED",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop Ship LED - The Complete Dropshipping Platform",
    description: "The complete platform for shopping and shipping high-quality products.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const direction = getDirection(locale);

  const profile = await getCurrentUserProfile();
  const user = profile
    ? {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        fullName: profile.full_name,
        phone: profile.phone,
        birthDate: profile.birth_date,
        walletAddress: profile.wallet_address,
        profileImageUrl: profile.profile_image_url,
        emailVerified: profile.email_verified,
        isActive: profile.is_active,
      }
    : null;

  const messages = await getMessages();

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <body
        className={`${roboto.className} ${cairo.className} w-full h-screen antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <AuthProvider initialUser={user}>{children}</AuthProvider>
            <Toaster />
            <Analytics />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
