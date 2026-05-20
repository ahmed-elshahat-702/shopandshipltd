"use client";

import { Category, ProductFilters } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Flame,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface ProductFilterProps {
  categories: Category[];
  onFilterChange: (filters: ProductFilters) => void;
  currentFilters: ProductFilters;
}

export default function ProductFilter({
  categories,
  onFilterChange,
  currentFilters,
}: ProductFilterProps) {
  const t = useTranslations();
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    category: true,
    price: true,
    // rating: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleCategoryChange = (slug: string) => {
    const currentCategories = Array.isArray(currentFilters.category)
      ? [...currentFilters.category]
      : currentFilters.category
        ? [currentFilters.category]
        : [];

    const newCategories = currentCategories.includes(slug)
      ? currentCategories.filter((s) => s !== slug)
      : [...currentCategories, slug];

    onFilterChange({
      ...currentFilters,
      category: newCategories.length > 0 ? newCategories : null,
      page: 1,
    });
  };

  const handlePriceChange = (min: number, max: number) => {
    const isCurrent =
      currentFilters.priceMin === min && currentFilters.priceMax === max;

    onFilterChange({
      ...currentFilters,
      priceMin: isCurrent ? undefined : min,
      priceMax: isCurrent ? undefined : max,
      page: 1,
    });
  };

  // const handleRatingChange = (rating: number) => {
  //   const currentRatings = Array.isArray(currentFilters.rating)
  //     ? [...currentFilters.rating]
  //     : currentFilters.rating
  //       ? [currentFilters.rating]
  //       : [];

  //   const newRatings = currentRatings.includes(rating)
  //     ? currentRatings.filter(r => r !== rating)
  //     : [...currentRatings, rating];

  //   onFilterChange({
  //     ...currentFilters,
  //     rating: newRatings.length > 0 ? newRatings : null,
  //     page: 1,
  //   });
  // };

  const handleClearAll = () => {
    onFilterChange({
      search: currentFilters.search,
      category: null,
      priceMin: undefined,
      priceMax: undefined,
      // rating: null,
      sortBy: undefined,
      page: 1,
    });
  };

  const handleQuickFilter = (sort: ProductFilters["sortBy"]) => {
    onFilterChange({
      ...currentFilters,
      sortBy: currentFilters.sortBy === sort ? undefined : sort,
      page: 1,
    });
  };

  const quickFilters = [
    {
      label: t("nav.quickLink1"),
      icon: Sparkles,
      color: "text-orange-500",
      sort: "newest" as const,
    },
    {
      label: t("nav.quickLink2"),
      icon: TrendingUp,
      color: "text-blue-500",
      sort: "selling" as const,
    },
    // {
    //   label: t("nav.quickLink3"),
    //   icon: Star,
    //   color: "text-yellow-500",
    //   sort: "popular" as const,
    // },
    {
      label: t("nav.quickLink4"),
      icon: Flame,
      color: "text-red-500",
      sort: "discount" as const,
    },
  ];

  const priceRanges = [
    { label: t("filter.price0_50"), min: 0, max: 50 },
    { label: t("filter.price50_100"), min: 50, max: 100 },
    { label: t("filter.price100_500"), min: 100, max: 500 },
    { label: t("filter.price500"), min: 500, max: 10000 },
  ];

  return (
    <div className="bg-background border border-border rounded-3xl shadow-xl shadow-primary/5 p-6 sticky top-24 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-foreground flex items-center gap-2">
          <SlidersHorizontal size={20} className="text-primary" />
          {t("filter.title")}
        </h2>
        <button
          onClick={handleClearAll}
          className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group"
        >
          <RotateCcw
            size={12}
            className="group-hover:-rotate-45 transition-transform"
          />
          {t("filter.clearAll")}
        </button>
      </div>

      {/* Quick Filters - Optimized Grid */}
      <div className="grid grid-cols-2 gap-2">
        {quickFilters.map((qf) => {
          const isActive = currentFilters.sortBy === qf.sort;
          return (
            <button
              key={qf.label}
              onClick={() => handleQuickFilter(qf.sort)}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all gap-2",
                isActive
                  ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20"
                  : "bg-muted/10 border-transparent hover:border-border/60 hover:bg-muted/20",
              )}
            >
              <qf.icon
                size={18}
                className={cn(isActive ? "fill-current" : "", qf.color)}
              />
              <span
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {qf.label.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Category Filter */}
      <FilterSection
        title={t("filter.category")}
        isOpen={expandedSections.category}
        onToggle={() => toggleSection("category")}
      >
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {categories.map((category) => {
            const isSelected = Array.isArray(currentFilters.category)
              ? currentFilters.category.includes(category.slug)
              : currentFilters.category === category.slug;

            return (
              <label
                key={category.id}
                className="group flex items-center gap-3 cursor-pointer py-1"
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center",
                    isSelected
                      ? "bg-primary border-primary"
                      : "border-border group-hover:border-primary/50",
                  )}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-sm bg-white" />
                  )}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={isSelected}
                  onChange={() => handleCategoryChange(category.slug)}
                />
                <span
                  className={cn(
                    "text-sm transition-colors",
                    isSelected
                      ? "text-primary font-bold"
                      : "text-muted-foreground group-hover:text-foreground font-medium",
                  )}
                >
                  {category.name}
                </span>
              </label>
            );
          })}
        </div>
      </FilterSection>

      {/* Price Filter */}
      <FilterSection
        title={t("filter.price")}
        isOpen={expandedSections.price}
        onToggle={() => toggleSection("price")}
      >
        <div className="space-y-2">
          {priceRanges.map((range, idx) => {
            const isSelected =
              currentFilters.priceMin === range.min &&
              currentFilters.priceMax === range.max;
            return (
              <label
                key={idx}
                className="group flex items-center gap-3 cursor-pointer py-1"
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center",
                    isSelected
                      ? "bg-primary border-primary"
                      : "border-border group-hover:border-primary/50",
                  )}
                >
                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={isSelected}
                  onChange={() => handlePriceChange(range.min, range.max)}
                />
                <span
                  className={cn(
                    "text-sm transition-colors",
                    isSelected
                      ? "text-primary font-bold"
                      : "text-muted-foreground group-hover:text-foreground font-medium",
                  )}
                >
                  {range.label}
                </span>
              </label>
            );
          })}
        </div>
      </FilterSection>

      {/* Rating Filter */}
      {/* <FilterSection 
        title={t("filter.rating")} 
        isOpen={expandedSections.rating} 
        onToggle={() => toggleSection("rating")}
      >
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const isSelected = Array.isArray(currentFilters.rating) 
              ? currentFilters.rating.includes(rating)
              : currentFilters.rating === rating;

            return (
              <label key={rating} className="group flex items-center gap-3 cursor-pointer py-1">
                <div className={cn(
                  "w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center",
                  isSelected ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"
                )}>
                  {isSelected && <div className="w-2 h-2 rounded-sm bg-white" />}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={isSelected}
                  onChange={() => handleRatingChange(rating)}
                />
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        className={cn(i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20 fill-muted-foreground/5")}
                      />
                    ))}
                  </div>
                  <span className={cn("text-[11px] font-bold", isSelected ? "text-primary" : "text-muted-foreground")}>
                    {rating} {t("filter.upwards")}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </FilterSection> */}
    </div>
  );
}

function FilterSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full font-black text-foreground hover:text-primary transition-colors uppercase tracking-widest text-xs"
      >
        {title}
        <ChevronDown
          size={16}
          className={cn(
            "transition-transform duration-300",
            isOpen ? "rotate-180" : "",
          )}
        />
      </button>
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          {children}
        </div>
      )}
    </div>
  );
}
