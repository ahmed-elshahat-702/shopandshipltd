"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import PageLinks from "@/components/admin/adminPageLinks";
import { AdminMobileBottomNav } from "@/components/admin/AdminMobileBottomNav";
import { useUser } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { UserRole } from "@/lib/store/useAuthStore";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user } = useUser();
  const role = (user?.role as UserRole) || "admin";
  const t = useTranslations();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between p-6 border-b border-border bg-card sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-black shadow-lg shadow-primary/20">
            {role[0].toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="font-black text-foreground tracking-tight leading-tight">
              {role === "superadmin"
                ? t("admin.superadminPanel")
                : t("admin.adminPanel")}
            </span>
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
              {t("admin.management")}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block h-screen sticky top-0">
          <Sidebar role={role} />
        </div>

        <main className="flex-1 min-w-0 pb-20 lg:pb-0">
          <div className="container mx-auto px-4 py-4 md:py-8 lg:px-8">
            <PageLinks />
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <AdminMobileBottomNav />
    </div>
  );
}
