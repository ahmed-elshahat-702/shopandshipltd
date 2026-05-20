'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  const t = useTranslations();
  
  return (
    <div className="w-full relative group">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
      <Input
        placeholder={placeholder || t('merchant.searchProducts')}
        className="pl-12 h-12 md:h-14 rounded-2xl border-border bg-card shadow-sm hover:ring-2 hover:ring-primary/10 transition-all font-medium text-base md:text-lg"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
