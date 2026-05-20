'use client';

import { useTranslations } from 'next-intl';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface SalesChartProps {
  data: Array<{ date: string; revenue: number; orders: number }>;
  height?: number;
}

export default function SalesChart({ data, height = 300 }: SalesChartProps) {
  const t = useTranslations();

  return (
    <div className="w-full h-full" style={{ minHeight: height }}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.705 0.213 47.604)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="oklch(0.705 0.213 47.604)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
            dx={-10}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '16px',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
            }}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="oklch(0.7 0.2 47)" 
            strokeWidth={4}
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
            name={t('merchant.revenue')}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
