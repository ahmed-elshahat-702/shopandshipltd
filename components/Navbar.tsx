"use client";

import { logoutAction } from "@/app/actions/auth";
import {
  getSearchSuggestionsAction,
  saveSearchAction,
} from "@/app/actions/search";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { useUnreadChatCount } from "@/hooks/useUnreadChatCount";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/use-auth";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useCartStore } from "@/lib/store/useCartStore";
import { useWishlistStore } from "@/lib/store/useWishlistStore";
import { SearchSuggestion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { searchSchema } from "@/lib/validations/search";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  DollarSign,
  Globe,
  Headset,
  Heart,
  History as HistoryIcon,
  LayoutDashboard,
  Loader2,
  Lock,
  MessageCircle,
  Search,
  Settings,
  ShoppingCart,
  Star,
  Store,
  Truck,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useEffect, useMemo, useRef, useState } from "react";

const getTrustAnswers = (t: (key: string) => string) => [
  { icon: Truck, text: t("trust1") },
  { icon: ArrowLeft, text: t("trust2") },
  { icon: Lock, text: t("trust3") },
  { icon: Star, text: t("trust4") },
  { icon: Globe, text: t("trust5") },
  { icon: Headset, text: t("trust6") },
  { icon: Check, text: t("trust7") },
  { icon: DollarSign, text: t("trust8") },
];

function HighlightedText({
  text,
  highlight,
}: {
  text: string;
  highlight: string;
}) {
  if (!highlight.trim()) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${highlight})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span
            key={i}
            className="text-primary font-black underline decoration-primary/30"
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </span>
  );
}

function TrustTicker({ t }: { t: (key: string) => string }) {
  const TRUST_ANSWERS = useMemo(() => getTrustAnswers(t), [t]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % TRUST_ANSWERS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [TRUST_ANSWERS.length]);

  return (
    <div className="relative flex-1 h-full flex items-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.4, ease: "circOut" }}
          className="flex items-center gap-2 text-[11px] sm:text-xs font-medium"
        >
          {/* Using the specific icon from the array */}
          {React.createElement(TRUST_ANSWERS[index].icon, {
            size: 14,
            className: "text-primary-foreground",
          })}
          <span className="truncate">{TRUST_ANSWERS[index].text}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function Navbar() {
  const t = useTranslations("nav");
  const tChat = useTranslations("chat");
  const { user, loading } = useUser();
  const cartCount = useCartStore((state) => state.getItemCount());
  const wishlistCount = useWishlistStore((state) => state.getItemCount());
  const unreadChatCount = useUnreadChatCount();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search for suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        try {
          const data = await getSearchSuggestionsAction(searchQuery);

          if ("suggestions" in data && data.suggestions) {
            setSuggestions(data.suggestions);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          }
        } catch (err) {
          console.error("Search failed", err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const result = searchSchema.safeParse({ query: searchQuery });
    if (!result.success) return;

    const query = searchQuery.trim();
    if (query) {
      // Save search history
      await saveSearchAction(query);

      // Also save to local storage for guest / immediate sync
      if (typeof window !== "undefined") {
        const localHistory = JSON.parse(
          localStorage.getItem("search_history") || "[]",
        );
        const newLocal = [
          query,
          ...localHistory.filter((h: string) => h !== query),
        ].slice(0, 10);
        localStorage.setItem("search_history", JSON.stringify(newLocal));
      }

      router.push(`/search?q=${encodeURIComponent(query)}`);
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = async (suggestion: SearchSuggestion) => {
    // Save to history
    await saveSearchAction(suggestion.name);

    if (suggestion.type === "product") {
      router.push(`/products/${suggestion.id}`);
    } else if (suggestion.type === "category") {
      router.push(`/products?category=${suggestion.slug || suggestion.id}`);
    } else if (suggestion.type === "merchant" || suggestion.type === "store") {
      if (user?.role === "merchant" && user.merchantId === suggestion.id) {
        router.push("/merchant/dashboard");
      } else {
        router.push(`/merchants/${suggestion.id}`);
      }
    }

    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      if (selectedIndex > -1 && suggestions[selectedIndex]) {
        e.preventDefault();
        handleSuggestionClick(suggestions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleLogout = async () => {
    await logoutAction();
  };

  // ── Hide on scroll down, show immediately on any scroll up ──
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const diff = currentY - lastScrollY.current;

          if (diff < -1) {
            // Any tiny scroll up → show instantly
            setNavVisible(true);
          } else if (diff > 4 && currentY > 80) {
            // Scrolling down past 80px → hide
            setNavVisible(false);
          }

          lastScrollY.current = currentY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* ── Sticky wrapper (hides/shows on scroll) ── */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          transform: navVisible ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          willChange: "transform",
        }}
      >
        {/* ── Trust Strip (animated ticker) ── */}
        <div className="bg-primary text-primary-foreground overflow-hidden">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 h-10 flex items-center gap-3">
            {/* Question Label */}
            <span className="shrink-0 text-[10px] sm:text-xs font-bold opacity-80 whitespace-nowrap border-r border-primary-foreground/30 pr-3">
              {t("whyChoose")} {t("brandName")}
            </span>

            {/* Flip Ticker Answer + Dots (dots rendered inside component) */}
            <TrustTicker t={t} />
          </div>
        </div>

        {/* ── Main Navbar Row ── */}
        <nav className="bg-background border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-4">
            <div className="flex items-center gap-3 h-14">
              {/* Logo */}
              <Link
                href="/"
                className="shrink-0 text-xl font-extrabold tracking-tight text-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <span className="text-primary">{t("common.brandPart1", { defaultMessage: "Shop" })}</span>{t("common.brandPart2", { defaultMessage: "& Ship" })}
                <span className="hidden sm:inline text-xs sm:text-sm text-muted-foreground font-bold">
                  {" "}
                  {t("common.brandPart3", { defaultMessage: "LTD" })}
                </span>
              </Link>

              {/* Desktop Quick Links */}
              <div className="hidden lg:flex items-center gap-4 shrink-0">
                {[
                  { label: t("quickLink1"), href: "/products?sort=newest" },
                  { label: t("quickLink2"), href: "/products?sort=selling" },
                  // { label: t("quickLink3"), href: "/products?sort=popular" },
                  { label: t("quickLink4"), href: "/products?sort=discount" },
                  { label: t("merchants"), href: "/merchants" },
                ].map(({ label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    className="text-xs font-semibold text-muted-foreground hover:text-primary whitespace-nowrap transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>

              {/* Search Bar */}
              <div
                ref={searchRef}
                className="flex-1 relative flex items-center min-w-0"
              >
                <form
                  onSubmit={handleSearch}
                  className="w-full flex rounded-full overflow-hidden border border-border bg-muted/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all relative"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() =>
                      searchQuery.length > 1 && setShowSuggestions(true)
                    }
                    placeholder={t("search")}
                    className="flex-1 bg-transparent px-4 py-2 text-sm outline-none text-foreground placeholder:text-muted-foreground min-w-0"
                  />

                  {/* Clear and Loading State */}
                  <div className="absolute right-24 lg:right-32 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {isSearching ? (
                      <Loader2
                        size={14}
                        className="animate-spin text-muted-foreground"
                      />
                    ) : (
                      searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setSuggestions([]);
                            setShowSuggestions(false);
                            inputRef.current?.focus();
                          }}
                          className="p-1 hover:bg-muted rounded-full transition-colors"
                        >
                          <X size={14} className="text-muted-foreground" />
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="submit"
                    className="bg-primary text-primary-foreground px-4 flex items-center gap-1.5 font-semibold text-sm hover:bg-primary/90 transition-colors shrink-0"
                  >
                    <Search size={15} />
                    <span className="hidden lg:inline">{t("searchBtn")}</span>
                  </button>
                </form>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl overflow-hidden z-60 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="py-2">
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={`${suggestion.type}-${suggestion.id}-${idx}`}
                          onClick={() => handleSuggestionClick(suggestion)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={cn(
                            "w-full text-left px-4 py-3 flex items-center gap-3 transition-colors group",
                            selectedIndex === idx
                              ? "bg-primary/10"
                              : "hover:bg-primary/5",
                          )}
                        >
                          {/* Icon Container */}
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                              selectedIndex === idx
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                            )}
                          >
                            {suggestion.type === "category" ? (
                              <Search size={14} />
                            ) : suggestion.type === "product" ? (
                              <Zap size={14} />
                            ) : (
                              <Store size={14} />
                            )}
                          </div>

                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground line-clamp-1">
                              <HighlightedText
                                text={suggestion.name}
                                highlight={searchQuery}
                              />
                            </span>
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                              {suggestion.type === "category"
                                ? t("filter.category")
                                : suggestion.type === "product"
                                  ? t("products")
                                  : t("common.merchant") || "Merchant"}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Actions — desktop only */}
              <div className="hidden md:flex items-center gap-1 shrink-0">
                <LanguageSwitcher />

                {user && (
                  <Link href="/customer/messages">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative"
                      aria-label={tChat("messages")}
                    >
                      <MessageCircle className="h-5 w-5" />
                      {unreadChatCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                          {unreadChatCount > 99 ? "9+" : unreadChatCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                )}

                <Link href="/wishlist">
                  <Button variant="ghost" size="icon" className="relative">
                    <Heart className="h-5 w-5" />
                    {wishlistCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {wishlistCount}
                      </span>
                    )}
                  </Button>
                </Link>

                <Link href="/cart">
                  <Button variant="ghost" size="icon" className="relative">
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </Button>
                </Link>

                {loading ? (
                  <div className="h-10 w-24 bg-muted animate-pulse rounded-xl" />
                ) : user ? (
                  <div className="flex items-center gap-1">
                    {/* Simplified Desktop Quick Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="hidden md:flex items-center gap-2 rounded-xl h-10 px-3 hover:bg-primary/10 hover:text-primary transition-all font-bold"
                        >
                          <User size={18} />
                          <span>{t("account")}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-56 rounded-2xl p-2 shadow-2xl border-2"
                      >
                        <div className="px-3 py-2 border-b mb-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {t("account")}
                          </p>
                          <p className="text-sm font-bold truncate">
                            {user.email}
                          </p>
                        </div>

                        <DropdownMenuItem
                          asChild
                          className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer gap-3 font-bold"
                        >
                          <Link href="/customer/account">
                            <User size={16} />
                            {t("account")}
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          asChild
                          className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer gap-3 font-bold"
                        >
                          <Link href="/customer/orders">
                            <ShoppingCart size={16} />
                            {t("orders")}
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          asChild
                          className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer gap-3 font-bold"
                        >
                          <Link href="/customer/messages">
                            <MessageCircle size={16} />
                            <span className="flex-1">{tChat("messages")}</span>
                            {unreadChatCount > 0 && (
                              <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-black rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                                {unreadChatCount > 99 ? "9+" : unreadChatCount}
                              </span>
                            )}
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          asChild
                          className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer gap-3 font-bold"
                        >
                          <Link href="/customer/wallet">
                            <DollarSign size={16} />
                            {t("myWallet")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          asChild
                          className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer gap-3 font-bold"
                        >
                          <Link href="/merchants">
                            <Users size={16} />
                            {t("merchants")}
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          asChild
                          className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer gap-3 font-bold"
                        >
                          <Link href="/customer/search-history">
                            <HistoryIcon size={16} />
                            {t("searchHistory")}
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          asChild
                          className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer gap-3 font-bold"
                        >
                          <Link href="/support">
                            <Headset size={16} />
                            {t("customerService")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          asChild
                          className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer gap-3 font-bold"
                        >
                          <Link href="/customer/settings">
                            <Settings size={16} />
                            {t("settings")}
                          </Link>
                        </DropdownMenuItem>

                        {/* <DropdownMenuItem
                          asChild
                          className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer gap-3 font-bold"
                        >
                          <Link href="/customer/security">
                            <Lock size={16} />
                            {t("security")}
                          </Link>
                        </DropdownMenuItem> */}

                        <DropdownMenuSeparator className="my-1" />

                        {user.role === "customer" ? (
                          <DropdownMenuItem
                            asChild
                            className="rounded-xl bg-primary/10 text-primary hover:bg-primary/20 focus:bg-primary/20 focus:text-primary cursor-pointer gap-3 font-black transition-all"
                          >
                            <Link href="/customer/apply">
                              <Zap size={16} className="fill-primary" />
                              {t("becomeMerchant")}
                            </Link>
                          </DropdownMenuItem>
                        ) : user.role === "merchant" ||
                          user.role === "admin" ||
                          user.role === "superadmin" ? (
                          <DropdownMenuItem
                            asChild
                            className="rounded-xl bg-primary/5 text-primary hover:bg-primary/10 focus:bg-primary/10 focus:text-primary cursor-pointer gap-3 font-black transition-colors"
                          >
                            <Link
                              href={
                                user.role === "admin" ||
                                user.role === "superadmin"
                                  ? "/admin/dashboard"
                                  : "/merchant/dashboard"
                              }
                            >
                              <LayoutDashboard
                                size={16}
                                className="fill-primary"
                              />
                              {t("switchToMerchant")}
                            </Link>
                          </DropdownMenuItem>
                        ) : null}

                        <DropdownMenuSeparator className="my-1" />
                        <DropdownMenuItem
                          className="rounded-xl text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer gap-3 font-bold"
                          disabled={loading}
                          onClick={handleLogout}
                        >
                          {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <ArrowLeft size={16} />
                          )}
                          {t("logout")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    asChild
                    className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 text-xs font-bold cursor-pointer"
                  >
                    <Link
                      href={
                        pathname && pathname !== "/"
                          ? `/login?next=${encodeURIComponent(pathname)}`
                          : "/login"
                      }
                    >
                      {t("signin")}
                    </Link>
                  </Button>
                )}
              </div>

              {/* Mobile: Language only (rest → bottom nav) */}
              <div className="md:hidden flex items-center shrink-0">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
