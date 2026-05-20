import { getTranslations } from "next-intl/server";
import LoginForm from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <div className="w-full md:max-w-lg md:p-8 min-h-screen md:min-h-0 flex items-center">
      <div className="w-full h-full md:h-auto bg-card md:bg-card/95 border-0 md:border border-border md:rounded-xl shadow-none md:shadow-2xl p-8 space-y-8 backdrop-blur-sm flex flex-col justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            {t("login")}
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            {t("loginDesc")}
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
