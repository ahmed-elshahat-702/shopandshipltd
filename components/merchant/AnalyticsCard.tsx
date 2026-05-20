import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

const colorClasses = {
  blue: 'bg-blue-500/10 text-blue-600',
  green: 'bg-green-500/10 text-green-600',
  purple: 'bg-purple-500/10 text-purple-600',
  orange: 'bg-primary/10 text-primary',
};

export default function AnalyticsCard({
  title,
  value,
  change,
  icon,
  color = 'orange',
}: AnalyticsCardProps) {
  const isPositive = (change ?? 0) >= 0;
  const t = useTranslations();

  return (
    <div className="bg-card rounded-[2rem] p-6 border border-border shadow-sm hover:shadow-xl transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-1">
          <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">{title}</p>
          <p className="text-3xl font-black text-foreground">{value}</p>
          
          {change !== undefined && (
            <div className={`flex items-center gap-1.5 mt-2 text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
              <div className={cn("p-1 rounded-full", isPositive ? "bg-green-100" : "bg-red-100")}>
                {isPositive ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
              </div>
              <span className="flex items-center gap-1">
                {Math.abs(change).toFixed(1)}%
                <span className="text-[10px] text-muted-foreground font-medium lowercase">{t('merchant.vsLastMonth')}</span>
              </span>
            </div>
          )}
        </div>
        
        <div className={cn(colorClasses[color], "p-4 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500")}>
          {icon}
        </div>
      </div>
    </div>
  );
}
