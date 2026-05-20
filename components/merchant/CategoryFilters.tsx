'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface Category {
  id: string;
  name: string;
}

interface CategoryFiltersProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  allLabel?: string;
}

export function CategoryFilters({ categories, selectedCategory, onCategoryChange, allLabel }: CategoryFiltersProps) {
  const t = useTranslations();
  
  return (
    <div className="w-full overflow-x-auto no-scrollbar pb-1">
      <div className="flex items-center gap-2 md:gap-3 min-w-max">
        <button
          onClick={() => onCategoryChange('all')}
          className={cn(
            "px-4 md:px-6 py-2 md:py-3 rounded-2xl text-xs md:text-sm font-black transition-all whitespace-nowrap border-2",
            selectedCategory === 'all'
              ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105"
              : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
          )}
        >
          {allLabel || t('merchant.allCategories')}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={cn(
              "px-4 md:px-6 py-2 md:py-3 rounded-2xl text-xs md:text-sm font-black transition-all whitespace-nowrap border-2",
              selectedCategory === cat.id
                ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105"
                : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
