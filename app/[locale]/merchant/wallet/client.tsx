"use client";

import { useTranslations } from 'next-intl';
import { Plus, PiggyBank, ArrowDownCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WalletDashboard } from '@/components/merchant/WalletDashboard';
import { useState } from 'react';
import WalletActionDialog from '@/components/WalletActionDialog';

import type { MerchantWallet, MerchantWalletTransaction } from '@/lib/types';

export default function MerchantWalletClient({ 
  userId, 
  initialWallet, 
  initialTransactions,
  adminWalletAddress,
  userWalletAddress
}: { 
  userId: string;
  initialWallet?: { wallet: MerchantWallet | null; error?: undefined } | { error: string; wallet?: undefined };
  initialTransactions?: { transactions: MerchantWalletTransaction[]; error?: undefined } | { error: string; transactions?: undefined };
  adminWalletAddress: string;
  userWalletAddress: string;
}) {
  const t = useTranslations();
  const [dialogType, setDialogType] = useState<"recharge" | "withdrawal" | null>(null);

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto space-y-10 py-10 px-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                <PiggyBank size={12} />
                {t('merchant.financialManagement')}
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">{t('wallet.rechargeTitle')}</h1>
              <p className="text-muted-foreground font-medium text-lg max-w-xl">{t('wallet.rechargeDesc')}</p>
           </div>
           <div className="flex items-center gap-3">
              <Button 
                onClick={() => setDialogType("recharge")}
                className="rounded-2xl h-12 px-6 font-black gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
              >
                <Plus size={18} />
                {t('wallet.addFunds') || 'Recharge'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setDialogType("withdrawal")}
                className="rounded-2xl h-12 px-6 font-black border-2 hover:bg-muted transition-all gap-2"
              >
                <ArrowDownCircle size={18} />
                {t('wallet.withdrawFunds') || 'Withdraw'}
              </Button>
           </div>
        </div>

        <WalletDashboard 
          userId={userId}
          initialWallet={initialWallet}
          initialTransactions={initialTransactions}
          userRole="merchant"
        />
      </div>

      <WalletActionDialog 
        type={dialogType === "withdrawal" ? "withdrawal" : "recharge"} 
        isOpen={!!dialogType} 
        onClose={() => setDialogType(null)} 
        userId={userId} 
        userRole="merchant"
        adminWalletAddress={adminWalletAddress}
        userWalletAddress={userWalletAddress}
      />

    </main>
  );
}
