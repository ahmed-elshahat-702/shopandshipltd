"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ArrowRightLeft,
  Headset,
  History,
  Mail,
  Settings,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useUser } from "@/hooks/use-auth";
import { useEffect } from "react";
import Image from "next/image";

function AccountSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-10 px-4 animate-pulse">
      <div className="h-48 rounded-3xl bg-muted" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-40 rounded-3xl bg-muted" />
        <div className="space-y-4">
          <div className="h-20 rounded-3xl bg-muted" />
          <div className="h-20 rounded-3xl bg-muted" />
          <div className="h-20 rounded-3xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default function AccountClient() {
  const t = useTranslations();
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <AccountSkeleton />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-10 px-4">
      {/* Header / Profile Header */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary/10 via-background to-primary/5 p-8 border border-primary/10 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="relative w-24 h-24 rounded-full border-4 border-background shadow-xl overflow-hidden bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold uppercase">
            {user.profileImageUrl ? (
              <Image
                src={user.profileImageUrl}
                alt={user.fullName || ""}
                fill
                className="object-cover"
              />
            ) : (
              user.fullName?.[0] || user.email?.[0] || "?"
            )}
          </div>

          <div className="flex-1 text-center md:text-left space-y-1">
            <h1 className="text-3xl font-black tracking-tight">
              {user.fullName || t("nav.account")}
            </h1>
            <p className="text-muted-foreground font-medium flex items-center justify-center md:justify-start gap-2">
              <Mail size={14} />
              {user.email}
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                {t(`auth.${user.role}`)}
              </span>
              {user.emailVerified && (
               <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                 <ShieldCheck size={12} />
                 {t("kyc.verified")}
               </span>
              )}
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            className="rounded-2xl font-bold gap-2 border-2"
          >
            <Link href="/customer/settings">
              <Settings size={18} />
              {t("common.settings")}
            </Link>
          </Button>
        </div>

        {/* Abstract background blobs */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Switch to Merchant Card */}
      <Card className="rounded-3xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/8 transition-colors shadow-none overflow-hidden relative">
        <CardContent className="p-8 flex flex-col md:flex-row items-center gap-6 justify-between relative z-10">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl font-black tracking-tight flex items-center justify-center md:justify-start gap-2">
              <ArrowRightLeft className="text-primary" size={24} />
              {t("nav.switchToMerchant")}
            </h3>
            <p className="text-muted-foreground font-medium max-w-md">
              {t("customer.account.switchToMerchantDesc")}
            </p>
            <p className="text-xs text-primary font-bold">
              {t("customer.account.merchantBenefits")}
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="rounded-2xl px-10 font-black shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
          >
            <Link href="/customer/apply">{t("nav.switchToMerchant")}</Link>
          </Button>
        </CardContent>
        {/* Abstract design element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details Card */}
        <Card className="rounded-3xl border-2 hover:border-primary/20 transition-colors shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="text-primary" size={20} />
              {t("customer.account.personalDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {t("common.name")}
                </p>
                <p className="font-bold">{user.fullName || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {t("common.email")}
                </p>
                <p className="font-bold truncate">{user.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {t("common.phone")}
                </p>
                <p className="font-bold">{user.phone || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {t("settings.birthDate")}
                </p>
                <p className="font-bold">{user.birthDate || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Navigation */}
        <div className="space-y-4">
          <Link
            href="/customer/wallet"
            className="flex items-center gap-4 p-4 rounded-3xl bg-muted/40 hover:bg-muted transition-colors border border-transparent hover:border-border group"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Wallet size={20} />
            </div>
            <div className="flex-1">
              <p className="font-black text-sm">{t("nav.myWallet")}</p>
              <p className="text-xs text-muted-foreground font-medium">
                {t("merchant.walletDesc")}
              </p>
            </div>
            <ArrowRightLeft size={16} className="text-muted-foreground" />
          </Link>

          <Link
            href="/customer/search-history"
            className="flex items-center gap-4 p-4 rounded-3xl bg-muted/40 hover:bg-muted transition-colors border border-transparent hover:border-border group"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <History size={20} />
            </div>
            <div className="flex-1">
              <p className="font-black text-sm">{t("nav.searchHistory")}</p>
              <p className="text-xs text-muted-foreground font-medium">
                {t("merchant.transactionHistory")}
              </p>
            </div>
            <ArrowRightLeft size={16} className="text-muted-foreground" />
          </Link>

          <Link
            href="/support"
            className="flex items-center gap-4 p-4 rounded-3xl bg-muted/40 hover:bg-muted transition-colors border border-transparent hover:border-border group"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Headset size={20} />
            </div>
            <div className="flex-1">
              <p className="font-black text-sm">{t("nav.customerService")}</p>
              <p className="text-xs text-muted-foreground font-medium">
                {t("merchant.customerServiceDesc")}
              </p>
            </div>
            <ArrowRightLeft size={16} className="text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
}
