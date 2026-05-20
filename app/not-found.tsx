"use client";

import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Cairo, Roboto } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/navigation";

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

export default function NotFound() {
  const router = useRouter();

  return (
    <html lang="en">
      <body className={`${cairo.className} ${roboto.className}`}>
        <div className="flex flex-col min-h-screen bg-background">
          <main className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            {/* Decorative LTD Glows */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -z-10 animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse delay-700" />

            <div className="space-y-8 max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="relative inline-block">
                <h1 className="text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-b from-primary to-primary/40 leading-none pb-4">
                  404
                </h1>
                {/* <div className="absolute -top-4 -right-4 text-primary animate-bounce">
                  <ShoppingBag
                    size={48}
                    className="drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                  />
                </div> */}
              </div>

              <div className="space-y-4">
                <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
                  404 - Page Not Found
                </h2>
                <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-lg mx-auto leading-relaxed">
                  Oops! The page you&apos;re looking for doesn&apos;t exist or
                  has been moved.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto h-12 md:h-14 px-8 rounded-2xl font-bold text-base md:text-lg border-2"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Go Back
                </Button>

                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-auto h-12 md:h-14 px-10 rounded-2xl font-bold text-base md:text-lg shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Link href="/">
                    <Home className="mr-2 h-5 w-5" />
                    Back to Home
                  </Link>
                </Button>
              </div>

              <div className="pt-8">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 text-primary font-bold hover:underline group"
                >
                  <Search
                    size={18}
                    className="group-hover:scale-110 transition-transform"
                  />
                  Browse Products
                </Link>
              </div>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
