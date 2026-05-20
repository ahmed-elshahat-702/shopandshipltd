'use client';

import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { searchSchema } from '@/lib/validations/search';

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialValue?: string;
}

export default function SearchBar({ onSearch, initialValue = '' }: SearchBarProps) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const isInitialMount = useRef(true);
  const lastEmittedQuery = useRef(initialValue);

  // Sync internal state when prop changes (e.g., from URL or clearing filters)
  const [prevInitialValue, setPrevInitialValue] = useState(initialValue);
  if (initialValue !== prevInitialValue) {
    setPrevInitialValue(initialValue);
    setSearchQuery(initialValue);
  }

  useEffect(() => {
    if (initialValue !== prevInitialValue) {
      lastEmittedQuery.current = initialValue;
    }
  }, [initialValue, prevInitialValue]);

  // Trigger search on debounce
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Only emit if the debounced query is different from the last one we emitted
    // AND different from the current initialValue (URL state)
    if (debouncedSearchQuery !== lastEmittedQuery.current && debouncedSearchQuery !== initialValue) {
      lastEmittedQuery.current = debouncedSearchQuery;
      onSearch(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, onSearch, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = searchSchema.safeParse({ query: searchQuery });
    if (result.success && searchQuery !== lastEmittedQuery.current) {
      lastEmittedQuery.current = searchQuery;
      onSearch(searchQuery);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    if (lastEmittedQuery.current !== '') {
      lastEmittedQuery.current = '';
      onSearch('');
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
          <Search size={18} />
        </div>
        
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('search.placeholder')}
          className="w-full bg-muted/40 border-border/60 border-2 rounded-2xl py-3.5 pl-11 pr-24 text-sm font-bold focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="p-1.5 hover:bg-muted rounded-full text-muted-foreground transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="submit"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-black text-xs hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            {t('nav.searchBtn')}
          </button>
        </div>
      </form>
    </div>
  );
}
