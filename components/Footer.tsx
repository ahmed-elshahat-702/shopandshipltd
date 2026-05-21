import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Mail, Phone, MessageCircle, Send } from "lucide-react";
import { getPlatformSettingsAction } from "@/app/actions/admin";

export async function Footer() {
  const t = await getTranslations("footer");
  const settingsRes = await getPlatformSettingsAction();
  const settings = "error" in settingsRes ? null : settingsRes;
  
  const whatsapp = settings?.whatsappNumber || "+15852303334";
  const telegram = settings?.telegramNumber || "+15852303334";
  const email = settings?.supportEmail || "support@shopandshipltd.com";
  const phone = settings?.supportPhone || "+15852303334";

  return (
    <footer className="bg-background border-t">
      {/* Trust Signals Strip */}
      {/* <div className="border-b bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: '🚚', title: 'Free Shipping', desc: 'On orders over $30' },
              { icon: '↩️', title: '90-Day Returns', desc: 'Hassle-free returns' },
              { icon: '🔒', title: 'Secure Payment', desc: '100% protected' },
              { icon: '🎧', title: '24/7 Support', desc: 'Always here to help' },
            ].map((item) => (
              <div key={item.title} className="flex flex-col items-center gap-1">
                <span className="text-2xl">{item.icon}</span>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div> */}

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-xl font-extrabold tracking-tight">
              <span className="text-primary">{t("brandPart1")}</span>
              {t("brandPart2")}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {t("aboutDesc")}
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4 text-primary" />
                {email}
              </a>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                {phone}
              </div>
              {/* <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {t("worldwideDelivery")}
              </div> */}
            </div>
            {/* Social */}
            <div className="flex gap-3 pt-1">
              {[
                { icon: MessageCircle, herf: `https://wa.me/${whatsapp.replace(/[^0-9+]/g, '')}` },
                { icon: Send, herf: `https://t.me/${telegram.replace(/[^0-9+A-Za-z]/g, '')}` },
              ].map((social, i) => (
                <Link
                  target="_blank"
                  key={i}
                  href={social.herf}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  <social.icon size={18} />
                </Link>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold text-sm mb-4 text-foreground">
              {t("about")}
            </h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: t("about"), href: "/about" },
                { label: t("contact"), href: "/contact" },
                { label: t("faq"), href: "/faq" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-sm mb-4 text-foreground">
              {t("legal")}
            </h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: t("privacy"), href: "/privacy" },
                { label: t("terms"), href: "/terms" },
                { label: t("cookies"), href: "/cookies" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          {/* <div>
            <h4 className="font-bold text-sm mb-4 text-foreground">{t('newsletterTitle')}</h4>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              {t('newsletterDesc')}
            </p>
            <div className="flex rounded-full overflow-hidden border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground min-w-0"
              />
              <button className="bg-primary text-primary-foreground px-4 text-xs font-bold hover:bg-primary/90 transition-colors shrink-0">
                {t('join')}
              </button>
        </div>
      </div>*/}
        </div>
        <div className="border-t pt-6">
          {/* Bottom Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
            <div>
              <p>
                {t("copyrightBrand", {
                  defaultMessage: "Shop & Ship LTD - © 2021 -",
                })}{" "}
                {t("allRightsReserved")}{" "}
                <span className="text-muted-foreground ">
                  {t("by", { defaultMessage: "by" })}
                  <Link
                    href="https://www.facebook.com/share/18XwkmBQXy/"
                    target="_blank"
                    className="text-primary p-1 hover:underline"
                  >
                    Reactech
                  </Link>
                </span>
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/privacy"
                className="hover:text-primary transition-colors"
              >
                {t("privacy")}
              </Link>
              <Link
                href="/terms"
                className="hover:text-primary transition-colors"
              >
                {t("terms")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
