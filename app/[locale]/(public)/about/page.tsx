import { Card, CardContent } from "@/components/ui/card";
import { Globe, Lightbulb, Scale, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AboutPage() {
  const t = await getTranslations();

  const mandatePoints = [
    {
      icon: Globe,
      title: t("about.mandate1Title"),
      content: t("about.mandate1Content"),
      color: "text-blue-600 bg-blue-50",
    },
    {
      icon: Truck,
      title: t("about.mandate2Title"),
      content: t("about.mandate2Content"),
      color: "text-green-600 bg-green-50",
    },
    {
      icon: Lightbulb,
      title: t("about.mandate3Title"),
      content: t("about.mandate3Content"),
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div className="bg-background pb-24">
      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden bg-primary/5">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="max-w-4xl space-y-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold tracking-widest uppercase mb-4">
              {t("about.heroTitle")}
            </div>
            <h1 className="text-4xl md:text-7xl font-black tracking-tight text-foreground leading-[1.1]">
              {t("about.heroTitle")}
            </h1>
            <p className="text-xl text-muted-foreground font-medium leading-relaxed max-w-2xl">
              {t("footer.brandDesc")}
            </p>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-120 h-120 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(#000_1px,transparent_1px)] bg-size-[40px_40px]" />
        </div>
      </section>

      {/* Intro & Philosophy */}
      <section className="py-24 max-w-5xl mx-auto px-4">
        <div className="space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-12">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-2xl font-bold leading-snug text-foreground/90 first-letter:text-xl first-letter:font-black first-letter:text-primary ">
                {t("about.introContent").split("\n\n")[0]}
              </p>
              <div className="h-px w-full bg-linear-to-r from-primary/50 to-transparent my-12" />
              <p className="text-xl text-muted-foreground leading-relaxed italic border-l-4 border-primary pl-8 py-2">
                {t("about.introContent").split("\n\n")[1]}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Strategic Mandate */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">
              {t("about.mandateTitle")}
            </h2>
            <div className="w-24 h-2 bg-primary mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {mandatePoints.map((point, i) => (
              <Card
                key={i}
                className="border-none shadow-2xl rounded-[3rem] bg-card overflow-hidden hover:-translate-y-2.5 transition-all duration-500"
              >
                <CardContent className="p-10 space-y-8">
                  <div
                    className={`w-20 h-20 rounded-[2rem] flex items-center justify-center ${point.color} shadow-lg`}
                  >
                    <point.icon size={36} />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black leading-tight tracking-tight">
                      {point.title}
                    </h3>
                    <p className="text-muted-foreground text-base font-medium leading-relaxed">
                      {point.content}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Legal Declaration */}
      <section className="py-32 max-w-5xl mx-auto px-4">
        <div className="p-12 md:p-20 rounded-[4rem] bg-foreground text-background relative overflow-hidden shadow-2xl">
          <div className="relative z-10 space-y-10">
            <div className="flex items-center gap-4 text-primary">
              <Scale size={48} />
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase">
                {t("about.legalTitle")}
              </h2>
            </div>
            <p className="text-xl md:text-2xl leading-relaxed font-bold opacity-90">
              {t("about.legalContent")}
            </p>
          </div>
          <div className="absolute right-[-10%] top-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px]" />
          <div className="absolute left-[-5%] bottom-[-5%] w-[30%] h-[30%] bg-blue-500/20 rounded-full blur-[80px]" />
        </div>
      </section>
    </div>
  );
}
