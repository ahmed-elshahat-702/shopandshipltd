"use client";

import { useTranslations } from "next-intl";
import {
  History,
  Search,
  Trash2,
  ArrowRight,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import {
  getSearchHistoryAction,
  clearSearchHistoryAction,
  removeSearchHistoryItemAction,
  getPopularSearchesAction,
} from "@/app/actions/search";
import useSWR from "swr";
import { toast } from "sonner";

export default function SearchHistoryClient() {
  const t = useTranslations();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const { data, mutate } = useSWR("search_history", getSearchHistoryAction, {
    revalidateOnFocus: false,
  });

  const { data: popularData, isLoading: popularLoading } = useSWR(
    "popular_searches",
    getPopularSearchesAction,
    {
      revalidateOnFocus: false,
    },
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const history = data?.history || [];

  const clearHistory = async () => {
    try {
      await clearSearchHistoryAction();
      if (typeof window !== "undefined") {
        localStorage.removeItem("search_history");
      }
      mutate({ history: [] });
      toast.success(t("messages.searchHistoryClearSuccess") || "History cleared");
    } catch {
      toast.error("Failed to clear history");
    }
  };

  const removeIndividual = async (term: string) => {
    try {
      await removeSearchHistoryItemAction(term);
      if (typeof window !== "undefined") {
        const localStr = localStorage.getItem("search_history");
        const local = localStr ? JSON.parse(localStr) : [];
        localStorage.setItem(
          "search_history",
          JSON.stringify(local.filter((h: string) => h !== term)),
        );
      }
      mutate({ history: history.filter((h) => h !== term) });
    } catch {
      toast.error("Failed to remove item");
    }
  };

  if (!mounted) return null;

  const popularSearches = popularData?.popular || [];

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
            <History size={12} />
            {t("nav.searchHistory")}
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            {t("nav.searchHistory")}
          </h1>
          <p className="text-muted-foreground font-medium">
            {t("merchant.transactionHistory")}
          </p>
        </div>

        {history.length > 0 && (
          <Button
            variant="ghost"
            className="rounded-2xl font-bold text-destructive gap-2 hover:bg-destructive/10"
            onClick={clearHistory}
          >
            <Trash2 size={18} />
            {t("common.delete")} {t("common.all")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          {history.length === 0 ? (
            <Card className="rounded-[2.5rem] border-2 border-dashed border-muted p-12 text-center bg-muted/20">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6 text-muted-foreground/50">
                <Search size={32} />
              </div>
              <h3 className="text-2xl font-black mb-2 opacity-50">
                {t("messages.noHistory")}
              </h3>
              <p className="text-muted-foreground font-medium mb-8">
                {t("messages.noHistoryDesc")}
              </p>
              <Button
                asChild
                className="rounded-2xl px-8 font-black shadow-xl shadow-primary/10"
              >
                <Link href="/products">{t("home.browseProducts")}</Link>
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((term, idx) => (
                <div
                  key={idx}
                  className="group flex items-center gap-4 p-4 rounded-3xl bg-muted/40 hover:bg-muted transition-colors border border-transparent hover:border-primary/10"
                >
                  <div className="w-10 h-10 rounded-2xl bg-background flex items-center justify-center text-primary/50 group-hover:text-primary transition-colors">
                    <Search size={18} />
                  </div>
                  <button
                    className="flex-1 text-left font-black text-lg truncate hover:text-primary transition-colors cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/products?search=${encodeURIComponent(term)}`,
                      )
                    }
                  >
                    {term}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-2xl text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => removeIndividual(term)}
                  >
                    <Trash2 size={16} />
                  </Button>
                  <ArrowRight
                    size={16}
                    className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2.5rem] bg-primary/5 border-none shadow-none p-8">
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest">
                  <TrendingUp size={14} />
                  {t("messages.trendingNow")}
                </div>
                <h3 className="text-xl font-black">{t("messages.popularSearches")}</h3>
              </div>

              {popularLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {popularSearches.length > 0 ? (
                    popularSearches.map((pop: string) => (
                      <Link
                        key={pop}
                        href={`/search?q=${encodeURIComponent(pop)}`}
                        className="px-4 py-2 rounded-2xl bg-background text-sm font-bold border border-border hover:border-primary/30 hover:text-primary transition-all"
                      >
                        {pop}
                      </Link>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic font-medium">
                      {t("messages.noPopularSearches")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
