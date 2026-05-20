"use client";

import { MerchantMobileBottomNav } from "@/components/merchant/MerchantMobileBottomNav";
import PageLinks from "@/components/merchant/merchantPageLinks";
import { Sidebar } from "@/components/Sidebar";
import { useUser } from "@/hooks/use-auth";
import { Link } from "@/i18n/navigation";
import { Store } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ReactNode } from "react";

interface MerchantLayoutProps {
  children: ReactNode;
}

export default function MerchantLayout({ children }: MerchantLayoutProps) {
  const { user } = useUser();
  const t = useTranslations();

  const sidebarUser = user
    ? {
        fullName: user.fullName ?? undefined,
        profileImageUrl: user.profileImageUrl ?? undefined,
      }
    : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-background ">
      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between px-5 h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-60 w-full shadow-sm">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
            <Store size={18} strokeWidth={2.5} />
          </div>
          <span className="font-black text-primary tracking-tighter text-base leading-none">
            Shop & Ship
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end -space-y-0.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
              {t("merchant.myStore")}
            </span>
            <span className="font-black text-foreground tracking-tighter text-sm truncate max-w-30">
              {user?.fullName || "Merchant"}
            </span>
          </div>
          <div className="relative w-9 h-9 rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg">
            {user?.profileImageUrl ? (
              <Image
                src={user.profileImageUrl}
                alt="Profile"
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">
                {user?.fullName?.[0] || "M"}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block h-screen sticky top-0">
          <Sidebar role="merchant" user={sidebarUser} />
        </div>

        <main className="flex-1 min-w-0 pb-20 lg:pb-0">
          <div className="container mx-auto px-4 py-4 md:py-8 lg:px-8">
            <PageLinks />
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MerchantMobileBottomNav />
    </div>
  );
}
