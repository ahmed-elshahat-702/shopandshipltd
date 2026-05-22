"use client";

import {
  getMerchantLevelsAction,
  getMerchantsAction,
} from "@/app/actions/merchant";
import { MerchantCardSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { Link } from "@/i18n/navigation";
import { MerchantLevel, MerchantSummary } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  MapPin,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useMemo, useState } from "react";
import useSWR from "swr";

interface MerchantsClientProps {
  initialMerchants: MerchantSummary[];
  initialTotalPages: number;
  initialTotal: number;
  initialLevels: MerchantLevel[];
}

export default function MerchantsClient({
  initialMerchants,
  initialTotalPages,
  initialTotal,
  initialLevels,
}: MerchantsClientProps) {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [sortBy, setSortBy] = useState<
    // "rating" |
    "sales" | "newest" | "name"
  >("name");
  const [level, setLevel] = useState<string>("all");
  const [page, setPage] = useState(1);

  const fetchOptions = useMemo(
    () => ({
      search: debouncedSearch,
      level: level === "all" ? undefined : Number(level),
      sortBy,
      page,
      limit: 9,
    }),
    [debouncedSearch, level, sortBy, page],
  );

  const { data, isLoading, isValidating } = useSWR(
    ["merchants", fetchOptions],
    () => getMerchantsAction(fetchOptions),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      fallbackData: {
        merchants: initialMerchants,
        totalPages: initialTotalPages,
        total: initialTotal,
        page: 1,
        limit: 9,
      },
    },
  );

  const { data: levelsData } = useSWR(
    "merchant-levels",
    getMerchantLevelsAction,
    {
      revalidateOnFocus: false,
      fallbackData: { levels: initialLevels },
    },
  );
  const levels = levelsData?.levels || [];

  const merchants = (data?.merchants as MerchantSummary[]) || [];
  const totalPages = data?.totalPages || 1;

  // Actual loading state should consider initial load or when page/filters change
  const showSkeleton = isLoading && !merchants.length;

  return (
    <main className="min-h-screen bg-linear-to-b from-gray-50 to-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest border border-primary/10">
            <Users size={14} className="animate-pulse" />
            {t("nav.merchants")}
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-none">
            {t("nav.merchants")}
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed">
            {t("merchant.exploreDesc")}
          </p>
        </motion.div>

        {/* Search & Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <div className="flex flex-col lg:flex-row gap-6 lg:items-center">
            {/* Search Input */}
            <div className="relative flex-1 group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                <Search size={20} strokeWidth={2.5} />
              </div>
              <Input
                placeholder={t("merchant.searchMerchants")}
                className="flex-1 pl-12 h-12 rounded-full border-2 border-gray-100 bg-gray-50/50 focus:bg-white focus:border-primary/30 focus:ring-8 focus:ring-primary/5 transition-all text-lg font-bold placeholder:font-medium"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              {(isLoading || isValidating) && (
                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                  <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Filter Group */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 min-w-50">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 mb-1 block">
                  {t("merchant.level")}
                </label>
                <Select
                  value={level}
                  onValueChange={(val) => {
                    setLevel(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-16 rounded-[1.5rem] border-2 border-gray-100 bg-gray-50/50 px-6 font-bold hover:bg-white transition-colors">
                    <div className="flex items-center gap-3">
                      <Filter size={18} className="text-primary" />
                      <SelectValue placeholder={t("merchant.allLevels")} />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-[1.5rem] p-2 border-2 shadow-2xl">
                    <SelectItem
                      value="all"
                      className="rounded-xl font-bold py-3"
                    >
                      {t("merchant.allLevels")}
                    </SelectItem>
                    {levels.map((l: MerchantLevel) => (
                      <SelectItem
                        key={l.id}
                        value={String(l.id)}
                        className="rounded-xl font-bold py-3"
                      >
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-50">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 mb-1 block">
                  {t("products.sortBy")}
                </label>
                <Select
                  value={sortBy}
                  onValueChange={(
                    val: //  "rating" |
                      "sales" | "newest" | "name",
                  ) => {
                    setSortBy(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-16 rounded-[1.5rem] border-2 border-gray-100 bg-gray-50/50 px-6 font-bold hover:bg-white transition-colors">
                    <div className="flex items-center gap-3">
                      <SlidersHorizontal size={18} className="text-primary" />
                      <SelectValue placeholder={t("products.sortBy")} />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-[1.5rem] p-2 border-2 shadow-2xl">
                    <SelectItem
                      value="name"
                      className="rounded-xl font-bold py-3"
                    >
                      {t("common.name")}
                    </SelectItem>
                    {/* <SelectItem
                      value="rating"
                      className="rounded-xl font-bold py-3"
                    >
                      {t("filter.rating")}
                    </SelectItem> */}
                    <SelectItem
                      value="sales"
                      className="rounded-xl font-bold py-3"
                    >
                      {t("admin.totalSales")}
                    </SelectItem>
                    <SelectItem
                      value="newest"
                      className="rounded-xl font-bold py-3"
                    >
                      {t("products.newest")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Results Info */}
        {!showSkeleton && merchants.length > 0 && (
          <div className="mb-8 px-4 flex justify-between items-end">
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                {data?.total} {t("nav.merchants")} {t("pagination.results")}
              </p>
            </div>
            {isValidating && (
              <p className="text-[10px] font-black text-primary animate-pulse uppercase">
                {t("common.loading")}...
              </p>
            )}
          </div>
        )}

        {/* Grid Area */}
        <AnimatePresence mode="wait">
          {showSkeleton ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {[...Array(6)].map((_, i) => (
                <MerchantCardSkeleton key={i} />
              ))}
            </motion.div>
          ) : merchants.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[3rem] p-20 text-center shadow-xl border-2 border-dashed border-gray-100"
            >
              <div className="w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-8 text-primary shadow-inner">
                <Users size={48} strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">
                {t("messages.noResults")}
              </h2>
              <p className="text-gray-500 font-medium max-w-md mx-auto mb-10 text-lg">
                {t("merchant.noMerchantsDesc")}
              </p>
              <Button
                variant="default"
                size="lg"
                className="rounded-[1.5rem] px-10 h-16 font-black text-lg shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                onClick={() => {
                  setSearch("");
                  setLevel("all");
                  setSortBy("name");
                  setPage(1);
                }}
              >
                {t("filter.clearAll")}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-16"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {merchants.map((merchant, index) => (
                  <motion.div
                    key={merchant.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <MerchantCard merchant={merchant} />
                  </motion.div>
                ))}
              </div>

              {/* Enhanced Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-1.5 sm:gap-3 py-10">
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl sm:rounded-2xl h-10 w-10 sm:h-14 sm:w-14 border-2 hover:bg-primary/5 hover:text-primary transition-all disabled:opacity-30 flex items-center justify-center shrink-0"
                    disabled={page === 1}
                    onClick={() => {
                      setPage((p) => p - 1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                  </Button>

                  <div className="flex items-center gap-1 sm:gap-2 bg-white p-1 sm:p-2 rounded-xl sm:rounded-[2rem] shadow-lg border-2 border-gray-50 shrink-0">
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      // Logic to show only a few pages around the current one
                      if (
                        totalPages > 7 &&
                        pageNum !== 1 &&
                        pageNum !== totalPages &&
                        Math.abs(pageNum - page) > 1
                      ) {
                        if (pageNum === 2 || pageNum === totalPages - 1) {
                          return (
                            <span
                              key={pageNum}
                              className="px-1.5 text-gray-300 font-bold text-sm sm:text-base"
                            >
                              •••
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "ghost"}
                          className={`h-9 w-9 sm:h-12 sm:w-12 rounded-lg sm:rounded-2xl font-black text-xs sm:text-base transition-all ${page === pageNum
                              ? "shadow-lg shadow-primary/20 scale-110"
                              : "text-gray-400 hover:text-primary hover:bg-primary/5"
                            }`}
                          onClick={() => {
                            setPage(pageNum);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl sm:rounded-2xl h-10 w-10 sm:h-14 sm:w-14 border-2 hover:bg-primary/5 hover:text-primary transition-all disabled:opacity-30 flex items-center justify-center shrink-0"
                    disabled={page === totalPages}
                    onClick={() => {
                      setPage((p) => p + 1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function MerchantCard({ merchant }: { merchant: MerchantSummary }) {
  const t = useTranslations();

  return (
    <Link href={`/merchants/${merchant.id}`}>
      <div className="group bg-white rounded-[2.5rem] overflow-hidden border-2 border-transparent hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 cursor-pointer h-full flex flex-col relative">
        {/* Cover / Header */}
        <div className="h-40 bg-linear-to-br from-primary/5 via-primary/10 to-primary/5 relative">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors" />

          <div className="absolute -bottom-10 left-8">
            <div className="w-24 h-24 rounded-[1.5rem] bg-white shadow-2xl flex items-center justify-center p-1.5 border-4 border-white overflow-hidden group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
              {merchant.logo_url ? (
                <div className="relative w-full h-full rounded-xl overflow-hidden">
                  <Image
                    src={merchant.logo_url}
                    alt={merchant.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary font-black text-3xl uppercase rounded-xl">
                  {merchant.name?.charAt(0) || "M"}
                </div>
              )}
            </div>
          </div>

          {merchant.isVerified && (
            <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm flex items-center gap-2 border border-primary/10">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">
                {t("merchant.verifiedMerchant")}
              </span>
            </div>
          )}
        </div>

        <div className="pt-16 pb-8 px-8 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-gray-900 group-hover:text-primary transition-colors tracking-tight">
                {merchant.name}
              </h3>
              <div className="flex items-center gap-1.5 text-gray-500">
                <MapPin size={14} className="text-primary/60" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  {merchant.location || t("merchant.shopOnline")}
                </span>
              </div>
            </div>

            {/* <div className="flex items-center gap-1.5 bg-yellow-400/10 text-yellow-700 px-3 py-1.5 rounded-2xl border border-yellow-400/20 shadow-sm">
              <Star
                size={16}
                className="fill-yellow-400 text-yellow-400 drop-shadow-sm"
              />
              <span className="text-sm font-black">
                {merchant.rating?.toFixed(1) || "5.0"}
              </span>
            </div> */}
          </div>

          <p className="text-gray-500 text-sm font-medium line-clamp-3 mb-8 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
            {merchant.description || t("merchant.defaultMerchantDesc")}
          </p>

          <div className="mt-auto pt-8 border-t border-gray-50 grid grid-cols-2 gap-6">
            <div className="flex flex-col space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                {t("merchant.products")}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <LayoutGrid size={14} strokeWidth={2.5} />
                </div>
                <span className="text-lg font-black text-gray-900">
                  {merchant.productCount || 0}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                {t("merchant.followers")}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-gray-900">
                  {merchant.followers || 0}
                </span>
                <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                  <Users size={14} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
