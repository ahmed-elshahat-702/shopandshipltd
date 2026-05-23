"use client"

import { getActiveDealsAction } from "@/app/actions/deals";
import { Deal } from "@/lib/types";
import { ArrowLeft, ArrowRight, Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { Link } from "@/i18n/navigation";
import useSWR from "swr";
import { useState } from "react";
import { motion, Variants } from "framer-motion";

import type { Swiper as SwiperType } from "swiper";

// Framer Motion variants for staggered child animations
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.12,
            delayChildren: 0.1,
        },
    },
};

const itemVariants: Variants = {
    hidden: { y: 25, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 110,
            damping: 18,
        },
    },
};

export default function DealsBanner({ initialDeals }: { initialDeals: Deal[] }) {
    const t = useTranslations();
    const locale = useLocale();
    const [activeIndex, setActiveIndex] = useState(0);
    const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);

    const { data: dealsData } = useSWR(
        "active-deals",
        () => getActiveDealsAction(),
        {
            revalidateOnFocus: false,
            fallbackData: { deals: initialDeals },
        },
    );

    const activeDeals = dealsData?.deals || [];
    const isRTL = locale === 'ar';

    const getLocalizedField = (obj: Deal, fieldBase: string) => {
        if (!obj) return '';
        const record = obj as unknown as Record<string, string | null>;
        return record[`${fieldBase}_${locale}`] || record[`${fieldBase}_en`] || '';
    };

    if (!activeDeals || activeDeals.length === 0) return null;

    return (
        <section className="py-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="max-w-4xl mx-auto px-4">
                <div className="relative group/banner">
                    <Swiper
                        modules={[Autoplay]}
                        autoplay={{ delay: 6000, disableOnInteraction: false }}
                        spaceBetween={24}
                        slidesPerView={1}
                        _swiper={setSwiperInstance}
                        onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
                        className="rounded-3xl md:rounded-[2.5rem] overflow-hidden shadow-2xl"
                    >
                        {activeDeals.map((deal, index) => {
                            const title = getLocalizedField(deal, 'title');
                            const subtitle = getLocalizedField(deal, 'subtitle');
                            const description = getLocalizedField(deal, 'description');
                            const isActive = index === activeIndex;

                            return (
                                <SwiperSlide key={deal.id}>
                                    {deal.image_url ? (
                                        <Link
                                            href={deal.link_url || '#'}
                                            className="relative block w-full overflow-hidden aspect-16/6 group/image"
                                        >
                                            <Image
                                                src={deal.image_url}
                                                alt={title}
                                                fill
                                                priority
                                                sizes="100vw"
                                                className="object-cover transition-transform duration-700 group-hover/image:scale-[1.03]"
                                            />
                                        </Link>
                                    ) : (
                                        <div className="relative w-full overflow-hidden bg-linear-to-br from-orange-600 via-orange-500 to-orange-600 text-white aspect-16/6 p-4 sm:p-6 md:p-12 lg:p-16 flex items-center">
                                            {/* Premium Ambient Background Blobs */}
                                            <div
                                                className={`absolute inset-e-[-10%] top-[-20%] w-[60%] h-[70%] rounded-full bg-primary/15 blur-[130px] pointer-events-none transition-all duration-1000 ${isActive ? 'scale-110 translate-x-2' : 'scale-95 translate-x-0'
                                                    }`}
                                            />
                                            <div
                                                className={`absolute inset-s-[-15%] bottom-[-20%] w-[50%] h-[60%] rounded-full bg-indigo-500/10 blur-[110px] pointer-events-none transition-all duration-1000 ${isActive ? 'scale-110 -translate-x-2' : 'scale-95 translate-x-0'
                                                    }`}
                                            />
                                            <div className="absolute inset-e-[40%] bottom-[10%] w-[30%] h-[40%] rounded-full bg-primary/5 blur-[90px] pointer-events-none" />

                                            {/* Content Block (Centered on mobile, left-aligned on desktop, right-aligned on RTL desktop) */}
                                            <div className="relative z-10 w-full">
                                                <motion.div
                                                    initial="hidden"
                                                    animate={isActive ? "visible" : "hidden"}
                                                    variants={containerVariants}
                                                    className="flex flex-col items-center text-center md:items-start md:text-start space-y-1.5 sm:space-y-4 md:space-y-6 max-w-2xl"
                                                >
                                                    {subtitle && (
                                                        <motion.div
                                                            variants={itemVariants}
                                                            className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-2.5 py-1 sm:px-4 sm:py-1.5 text-[9px] sm:text-xs font-bold uppercase tracking-wider border border-white/15 text-primary shadow-sm"
                                                        >
                                                            <Zap className="h-3 w-3 md:h-3.5 md:w-3.5 animate-pulse fill-primary" />
                                                            <span className="text-white">{subtitle}</span>
                                                        </motion.div>
                                                    )}

                                                    <motion.h2
                                                        variants={itemVariants}
                                                        className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black leading-tight tracking-tight drop-shadow-md text-white"
                                                    >
                                                        {title}
                                                    </motion.h2>

                                                    <motion.p
                                                        variants={itemVariants}
                                                        className="text-[10px] sm:text-sm md:text-lg font-medium text-slate-300/90 leading-relaxed balance-text line-clamp-2 md:line-clamp-none"
                                                    >
                                                        {description}
                                                    </motion.p>

                                                    <motion.div variants={itemVariants} className="pt-1 md:pt-4">
                                                        <Link
                                                            href={deal.link_url || '#'}
                                                            className="group/btn inline-flex items-center gap-2.5 bg-white text-slate-950 px-4 py-2 sm:px-8 sm:py-3.5 md:px-10 md:py-4 rounded-xl md:rounded-2xl font-bold text-[10px] sm:text-sm md:text-base hover:bg-primary hover:text-white active:scale-95 transition-all duration-300 shadow-lg shadow-white/5 hover:shadow-primary/20"
                                                        >
                                                            {t("home.shopNow")}
                                                            <span className="transition-transform duration-300 group-hover/btn:translate-x-1 rtl:group-hover/btn:-translate-x-1">
                                                                {isRTL ? <ArrowLeft className="h-3 w-3 sm:h-4.5 sm:w-4.5" /> : <ArrowRight className="h-3 w-3 sm:h-4.5 sm:w-4.5" />}
                                                            </span>
                                                        </Link>
                                                    </motion.div>
                                                </motion.div>
                                            </div>
                                        </div>
                                    )}
                                </SwiperSlide>
                            );
                        })}
                    </Swiper>

                    {/* Navigation Arrows (Desktop hover trigger) */}
                    {activeDeals.length > 1 && (
                        <>
                            <button
                                onClick={() => swiperInstance?.slidePrev()}
                                disabled={activeIndex === 0}
                                className="absolute inset-s-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-12 w-12 items-center justify-center rounded-full bg-slate-950/40 backdrop-blur-md border border-white/10 text-white shadow-lg cursor-pointer transition-all duration-300 hover:bg-slate-950/80 hover:scale-105 active:scale-95 hover:border-slate-950/20 opacity-0 group-hover/banner:opacity-100 disabled:opacity-0 disabled:pointer-events-none"
                                aria-label="Previous slide"
                            >
                                {isRTL ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
                            </button>

                            <button
                                onClick={() => swiperInstance?.slideNext()}
                                disabled={activeIndex === activeDeals.length - 1}
                                className="absolute inset-e-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-12 w-12 items-center justify-center rounded-full bg-slate-950/40 backdrop-blur-md border border-white/10 text-white shadow-lg cursor-pointer transition-all duration-300 hover:bg-slate-950/80 hover:scale-105 active:scale-95 hover:border-slate-950/20 opacity-0 group-hover/banner:opacity-100 disabled:opacity-0 disabled:pointer-events-none"
                                aria-label="Next slide"
                            >
                                {isRTL ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
                            </button>
                        </>
                    )}

                    {/* Premium Pagination Indicator (Pills style) */}
                    {activeDeals.length > 1 && (
                        <div className="absolute -bottom-6 inset-s-1/2 -translate-x-1/2 z-20 flex gap-2">
                            {activeDeals.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => swiperInstance?.slideTo(idx)}
                                    className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${activeIndex === idx
                                        ? "w-8 bg-primary shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                                        : "w-2.5 bg-primary/35 hover:bg-primary/60"
                                        }`}
                                    aria-label={`Go to slide ${idx + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}