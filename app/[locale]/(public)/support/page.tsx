import {
  Headset,
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { getPlatformSettingsAction } from "@/app/actions/admin";

export default async function SupportPage() {
  const t = await getTranslations();
  const settingsRes = await getPlatformSettingsAction();
  const settings = "error" in settingsRes ? null : settingsRes;
  
  const whatsapp = settings?.whatsappNumber || "+15852303334";
  const telegram = settings?.telegramNumber || "+15852303334";
  const email = settings?.supportEmail || "support@shopandshipltd.com";
  const phone = settings?.supportPhone || "+15852303334";

  const contactMethods = [
    {
      icon: MessageCircle,
      title: t("merchant.contactViaWhatsapp"),
      value: whatsapp,
      description: t("merchant.supportDescription"),
      color: "bg-green-500/10 text-green-600",
      action: `https://wa.me/${whatsapp.replace(/[^0-9+]/g, '')}`,
    },
    {
      icon: Send,
      title: t("merchant.contactViaTelegram"),
      value: telegram,
      description: t("merchant.supportDescription"),
      color: "bg-blue-500/10 text-blue-600",
      action: `https://t.me/${telegram.replace(/[^0-9+A-Za-z]/g, '')}`,
    },
    {
      icon: Mail,
      title: t("merchant.contactViaEmail"),
      value: email,
      description: t("merchant.supportDescription"),
      color: "bg-red-500/10 text-red-600",
      action: `mailto:${email}`,
    },
    {
      icon: Phone,
      title: t("merchant.phoneSupport"),
      value: phone,
      description: t("merchant.supportDescription"),
      color: "bg-orange-500/10 text-orange-600",
      action: `tel:${phone.replace(/[^0-9+]/g, '')}`,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto py-16 px-4 space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-[0.2em] mb-2">
          <Headset size={14} />
          {t("merchant.needHelp")}
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground">
          {t("merchant.customerService")}
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-medium">
          {t("merchant.customerServiceDesc")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {contactMethods.map((method, idx) => (
          <Card
            key={idx}
            className="rounded-[2.5rem] border-2 border-transparent hover:border-primary/20 hover:bg-primary/2 transition-all group overflow-hidden shadow-none bg-muted/30"
          >
            <CardContent className="p-8 space-y-6 flex flex-col h-full">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${method.color} group-hover:scale-110 transition-transform`}
              >
                <method.icon size={28} />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-xl font-black tracking-tight">
                  {method.title}
                </h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  {method.description}
                </p>
                <p className="text-lg font-bold text-foreground pt-2">
                  {method.value}
                </p>
              </div>
              <Button
                asChild
                className="w-full rounded-2xl font-black h-12 shadow-lg shadow-primary/5"
              >
                <a
                  href={method.action}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("common.contact")}
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12">
        <Card className="rounded-[2.5rem] bg-linear-to-br from-primary/10 to-transparent border-none shadow-none p-10">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center text-primary shadow-sm">
              <MapPin size={24} />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-black">{t("footer.about")}</h4>
              <p className="text-muted-foreground font-medium">
                {t("footer.aboutDesc")}
              </p>
            </div>
          </div>
        </Card>
        <Card className="rounded-[2.5rem] bg-muted/40 border-none shadow-none p-10">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center text-primary shadow-sm">
              <Clock size={24} />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-black">{t("footer.workingHours")}</h4>
              <ul className="text-muted-foreground font-medium space-y-1">
                <li className="flex justify-between px-2">
                  <span>{t("footer.sundayToThursday")}</span>{" "}
                  <span className="font-bold text-foreground px-2">
                    9:00 AM - 6:00 PM
                  </span>
                </li>
                <li className="flex justify-between px-2">
                  <span>{t("footer.friday")}</span>{" "}
                  <span className="font-bold text-foreground px-2">
                    {t("footer.closed")}
                  </span>
                </li>
                <li className="flex justify-between px-2">
                  <span>{t("footer.saturday")}</span>{" "}
                  <span className="font-bold text-foreground px-2">
                    10:00 AM - 4:00 PM
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
