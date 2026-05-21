import { getTranslations } from "next-intl/server";
import { getPlatformSettingsAction } from "@/app/actions/admin";
import {
  MessageCircle,
  Mail,
  Headphones,
  ExternalLink,
  Send,
  PhoneCall,
} from "lucide-react";

export default async function CustomerServicePage() {
  const t = await getTranslations();
  const settingsRes = await getPlatformSettingsAction();
  const settings = "error" in settingsRes ? null : settingsRes;
  
  const whatsapp = settings?.whatsappNumber || "+15852303334";
  const telegram = settings?.telegramNumber || "+15852303334";
  const email = settings?.supportEmail || "support@shopandshipltd.com";
  const phone = settings?.supportPhone || "+15852303334";

  const contactMethods = [
    {
      title: t("merchant.contactViaWhatsapp"),
      description: t("merchant.supportDescription"),
      icon: <MessageCircle className="text-green-500" size={32} />,
      link: `https://wa.me/${whatsapp.replace(/[^0-9+]/g, '')}`,
      label: whatsapp,
      color: "hover:border-green-500/50",
      bg: "bg-green-50",
    },
    {
      title: t("merchant.contactViaTelegram"),
      description: t("merchant.supportDescription"),
      icon: <Send className="text-blue-500" size={32} />,
      link: `https://t.me/${telegram.replace(/[^0-9+A-Za-z]/g, '')}`,
      label: telegram,
      color: "hover:border-blue-500/50",
      bg: "bg-blue-50",
    },
    {
      title: t("merchant.contactViaPhone"),
      description: t("merchant.supportDescription"),
      icon: <PhoneCall className="text-orange-500" size={32} />,
      link: `tel:${phone.replace(/[^0-9+]/g, '')}`,
      label: phone,
      color: "hover:border-orange-500/50",
      bg: "bg-orange-50",
    },
    {
      title: t("merchant.contactViaEmail"),
      description: t("merchant.supportDescription"),
      icon: <Mail className="text-red-500" size={32} />,
      link: `mailto:${email}`,
      label: email,
      color: "hover:border-red-500/50",
      bg: "bg-red-50",
    },
  ];

  return (
    <main className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <div className="max-w-4xl mx-auto space-y-10 px-4 sm:px-6">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest shadow-sm">
            <Headphones size={12} />
            {t("merchant.customerService")}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">
            {t("merchant.customerService")}
          </h1>
          <p className="text-muted-foreground font-medium text-lg max-w-2xl mx-auto">
            {t("merchant.customerServiceDesc")}
          </p>
        </div>

        {/* Contact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {contactMethods.map((method, idx) => (
            <a
              key={idx}
              href={method.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex flex-col p-8 bg-card rounded-[2.5rem] border-2 border-border transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] ${method.color}`}
            >
              <div
                className={`w-16 h-16 ${method.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}
              >
                {method.icon}
              </div>
              <h3 className="text-2xl font-black text-foreground mb-3">
                {method.title}
              </h3>
              <p className="text-muted-foreground font-medium mb-8 flex-1">
                {method.description}
              </p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-sm font-black text-foreground opacity-50 group-hover:opacity-100 transition-opacity">
                  {method.label}
                </span>
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 group-hover:translate-x-2 transition-transform">
                  <ExternalLink size={18} />
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* FAQ/Info Section */}
        {/* <div className="bg-foreground text-background rounded-[3rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
           <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                 <h2 className="text-3xl sm:text-4xl font-black leading-tight">
                   Common Inquiries & Support
                 </h2>
                 <div className="space-y-4">
                    <div className="flex items-start gap-4">
                       <ShieldCheck className="text-primary mt-1 shrink-0" size={24} />
                       <p className="text-background/70 font-medium">Verified support agents available across all timezones to ensure your business keeps moving.</p>
                    </div>
                    <div className="flex items-start gap-4">
                       <Zap className="text-primary mt-1 shrink-0" size={24} />
                       <p className="text-background/70 font-medium">Average response time for merchants is less than 2 hours during business week.</p>
                    </div>
                 </div>
                 <Button className="bg-primary text-white hover:bg-primary/90 rounded-2xl h-14 px-10 font-black text-lg gap-3 mt-4">
                   Browse FAQ
                   <ArrowRight size={20} />
                 </Button>
              </div>
              <div className="hidden lg:flex justify-center">
                 <div className="w-64 h-64 bg-white/5 rounded-full border border-white/10 flex items-center justify-center animate-pulse">
                    <HelpCircle size={120} className="text-white/10" />
                 </div>
              </div>
           </div>
           
           {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        {/* </div> */}
      </div>
    </main>
  );
}
