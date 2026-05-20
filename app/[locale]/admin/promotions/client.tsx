"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  MessageSquare,
  Search,
  Send,
  TrendingUp,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

// Mock Data
const MOCK_MERCHANTS = [
  {
    id: "1",
    name: "Alpha Lighting",
    // rating: 4.5,
    totalSales: 1250,
    image: "https://i.pravatar.cc/150?u=alpha",
  },
  {
    id: "2",
    name: "Bright World",
    // rating: 4.2,
    totalSales: 890,
    image: "https://i.pravatar.cc/150?u=bright",
  },
  {
    id: "3",
    name: "Eco LED Systems",
    // rating: 3.8,
    totalSales: 420,
    image: "https://i.pravatar.cc/150?u=eco",
  },
  {
    id: "4",
    name: "Global Lamps",
    // rating: 4.9,
    totalSales: 3200,
    image: "https://i.pravatar.cc/150?u=global",
  },
  {
    id: "5",
    name: "Night Glow",
    // rating: 4.0,
    totalSales: 610,
    image: "https://i.pravatar.cc/150?u=night",
  },
];

export default function MerchantPromotionsClient() {
  const t = useTranslations("admin");
  const [search, setSearch] = useState("");
  const [selectedMerchant, setSelectedMerchant] = useState<
    (typeof MOCK_MERCHANTS)[0] | null
  >(null);
  const [message, setMessage] = useState("");
  // const [rating, setRating] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const filteredMerchants = MOCK_MERCHANTS.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSendMessage = () => {
    if (!selectedMerchant || !message) return;
    setIsSending(true);
    setTimeout(() => {
      toast.success(t("messageSent"));
      setMessage("");
      setIsSending(false);
    }, 1500);
  };

  // const handleUpdateRating = () => {
  //   if (!selectedMerchant || rating === 0) return;
  //   setIsSending(true);
  //   setTimeout(() => {
  //     toast.success(t("ratingUpdated"));
  //     setRating(0);
  //     setIsSending(false);
  //   }, 1000);
  // };

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-10 min-h-screen pb-32">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
          <TrendingUp size={12} />
          {t("merchantPromotions")}
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
          {t("merchantPromotions")}
        </h1>
        <p className="text-muted-foreground font-medium text-lg max-w-2xl">
          {t("promotionsDesc")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Merchant List Section */}
        <Card className="lg:col-span-1 rounded-[2.5rem] border-none shadow-xl bg-card overflow-hidden h-175 flex flex-col">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-2xl font-black">
              {t("allMerchants")}
            </CardTitle>
            <div className="relative mt-4">
              <Search
                className="absolute inset-s-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={18}
              />
              <Input
                placeholder={t("searchMerchants")}
                className="ps-10 rounded-2xl bg-muted/50 border-none h-12 font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {filteredMerchants.map((merchant) => (
                  <button
                    key={merchant.id}
                    onClick={() => {
                      setSelectedMerchant(merchant);
                      // setRating(merchant.rating);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-3xl transition-all group",
                      selectedMerchant?.id === merchant.id
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                        : "hover:bg-muted",
                    )}
                  >
                    <Avatar className="h-12 w-12 border-2 border-background/20 group-hover:scale-110 transition-transform">
                      <AvatarImage
                        src={merchant.image}
                        alt={merchant.name}
                        width={48}
                        height={48}
                      />
                      <AvatarFallback>{merchant.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-start flex-1 min-w-0">
                      <p className="font-black truncate">{merchant.name}</p>
                      {/* <div
                        className={cn(
                          "flex items-center gap-2 text-[10px] font-bold uppercase",
                          selectedMerchant?.id === merchant.id
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        <Star size={10} className="fill-current" />
                        {merchant.rating} • {merchant.totalSales} {t("sales")}
                      </div> */}
                    </div>
                    <ChevronRight
                      size={20}
                      className={cn(
                        "transition-transform",
                        selectedMerchant?.id === merchant.id
                          ? "translate-x-1"
                          : "opacity-0",
                      )}
                    />
                  </button>
                ))}
                {filteredMerchants.length === 0 && (
                  <div className="py-20 text-center text-muted-foreground font-medium">
                    {t("noMerchantsFound")}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Promotion Tools Section */}
        <div className="lg:col-span-2 space-y-8">
          {selectedMerchant ? (
            <>
              {/* Send Message Card */}
              <Card className="rounded-[2.5rem] border-none shadow-xl bg-card p-4">
                <CardHeader className="p-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <MessageSquare size={24} />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black">
                        {t("motivationalMessage")}
                      </CardTitle>
                      <CardDescription className="font-medium">
                        {t("selectMerchant")}:{" "}
                        <span className="text-foreground font-black">
                          {selectedMerchant.name}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                  <Textarea
                    placeholder={t("enterMessage")}
                    className="min-h-50 rounded-[1.5rem] bg-muted/30 border-2 border-transparent focus-visible:border-primary/20 transition-all p-6 text-lg font-medium resize-none"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button
                      className="rounded-2xl h-14 px-10 font-black text-sm uppercase tracking-widest gap-3 shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                      onClick={handleSendMessage}
                      disabled={!message || isSending}
                    >
                      {t("sendMessage")}
                      <Send size={18} />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Adjust Rating Card */}
              {/* <Card className="rounded-[2.5rem] border-none shadow-xl bg-card p-4">
                <CardHeader className="p-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-600">
                      <Star size={24} className="fill-current" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black">
                        {t("adjustRating")}
                      </CardTitle>
                      <CardDescription className="font-medium">
                        {t("currentRating")}:{" "}
                        <span className="text-yellow-600 font-black">
                          {selectedMerchant.rating} / 5.0
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-8">
                  <div className="flex justify-center gap-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onMouseEnter={() => setRating(star)}
                        onClick={() => setRating(star)}
                        className="transition-all hover:scale-125 focus:outline-none"
                      >
                        <Star
                          size={48}
                          className={cn(
                            "transition-all",
                            star <= rating
                              ? "fill-yellow-500 text-yellow-500 drop-shadow-lg"
                              : "text-muted border-none",
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  <div className="text-center">
                    <span className="text-4xl font-black text-foreground">
                      {rating.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground font-black text-xl">
                      {" "}
                      / 5.0
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      className="rounded-2xl h-14 px-10 font-black text-sm uppercase tracking-widest border-2 border-primary/20 text-primary hover:bg-primary/5 transition-all"
                      onClick={handleUpdateRating}
                      disabled={rating === 0 || isSending}
                    >
                      {t("updateRating")}
                      <CheckCircle2 size={18} className="ms-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card> */}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 opacity-30 select-none">
              <Users size={120} strokeWidth={1} />
              <p className="mt-6 text-2xl font-black">{t("selectMerchant")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
