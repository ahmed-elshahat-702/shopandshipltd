import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { HelpCircle, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function FAQPage() {
  const t = await getTranslations();

  const categories = [
    {
      id: "general",
      title: t("faq.general") || "Operational Standards",
      icon: ShieldCheck,
      questions: [
        { q: t("faq.q1"), a: t("faq.a1") },
        { q: t("faq.q2"), a: t("faq.a2") },
        { q: t("faq.q3"), a: t("faq.a3") },
        { q: t("faq.q4"), a: t("faq.a4") },
        { q: t("faq.q5"), a: t("faq.a5") },
        { q: t("faq.q6"), a: t("faq.a6") },
      ],
    },
  ];

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Header */}
      <section className="py-20 bg-muted/30 border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-[0.2em] mb-2">
            <HelpCircle size={14} />
            {t("faq.helpCenter") || "Help Center"}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground">
            {t("faq.title") || "Frequently Asked Questions"}
          </h1>
          <p className="text-muted-foreground text-lg font-medium max-w-2xl mx-auto">
            {t("faq.subtitle") ||
              "Find quick answers to common questions about our platform and services."}
          </p>
        </div>
      </section>

      {/* Accordions */}
      <section className="max-w-4xl mx-auto px-4 py-20 space-y-16">
        {categories.map((cat) => (
          <div key={cat.id} className="space-y-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <cat.icon size={22} />
              </div>
              <h2 className="text-2xl font-black tracking-tight">
                {cat.title}
              </h2>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {cat.questions.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`${cat.id}-${i}`}
                  className="border-2 border-border/50 rounded-2xl md:rounded-3xl px-4 md:px-6 bg-card data-[state=open]:border-primary/30 data-[state=open]:bg-primary/1 transition-all"
                >
                  <AccordionTrigger className="hover:no-underline py-5 md:py-6 text-left font-black text-base md:text-lg leading-tight">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 text-muted-foreground font-medium text-sm md:text-base leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4">
        <Card className="rounded-[2rem] md:rounded-[2.5rem] bg-foreground text-background p-8 md:p-16 text-center space-y-6 shadow-2xl shadow-black/10">
          <h3 className="text-2xl md:text-4xl font-black">
            {t("faq.stillNeedHelp") || "Still need help?"}
          </h3>
          <p className="opacity-70 font-medium max-w-md mx-auto text-sm md:text-base">
            {t("faq.contactUsDesc") ||
              "Cant find the answer you are looking for? Our support team is here to help you 24/7."}
          </p>
          <div className="pt-4">
            <Link
              href="/support"
              className="inline-flex items-center justify-center h-12 md:h-14 px-8 md:px-10 rounded-xl md:rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] md:text-xs hover:scale-105 transition-all shadow-lg shadow-primary/20"
            >
              {t("common.contactSupport") || "Contact Support"}
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
