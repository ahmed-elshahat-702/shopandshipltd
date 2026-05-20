import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(
  request: NextRequest,
  response: NextResponse,
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user = null;

  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      // Fetch role and status from profiles table (source of truth)
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", authUser.id)
        .single();

      user = {
        ...authUser,
        role: profile?.role || "customer",
        isActive: profile?.is_active ?? true,
      };
    }
  } catch (error) {
    console.error("Middleware auth check error:", error);
  }

  // 0. Handle inactive users early
  if (user && !user.isActive) {
    const pathname = request.nextUrl.pathname;
    const locale = pathname.split("/")[1] || "en";
    const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

    const authRoutes = [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
    ];

    const isAuthRoute = authRoutes.some((route) =>
      pathWithoutLocale.startsWith(route),
    );
    const isSupportRoute = pathWithoutLocale.startsWith("/support");

    if (!isAuthRoute && !isSupportRoute && !pathname.startsWith("/api")) {
      const redirectUrl = new URL(`/${locale}/login`, request.url);
      redirectUrl.searchParams.set("error", "account_deactivated");

      const redirectResponse = NextResponse.redirect(redirectUrl);
      return redirectResponse;
    }

    return response;
  }

  const pathname = request.nextUrl.pathname;
  const locale = pathname.split("/")[1] || "en";
  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  // Skip middleware logic for API routes and static files
  if (
    pathname.startsWith("/api") ||
    pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|webp)$/)
  ) {
    return response;
  }

  // Routes that require login but aren't role-prefixed
  const unprefixedProtectedRoutes = [
    "/account",
    "/apply",
    "/orders",
    "/wallet",
    "/settings",
  ];

  const authRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ];

  const publicRoutes = [
    "/",
    "/products",
    "/merchants",
    "/cart",
    "/wishlist",
    "/search",
    "/support",
  ];

  const isAuthRoute = authRoutes.some((route) =>
    pathWithoutLocale.startsWith(route),
  );
  const isPublicRoute =
    pathWithoutLocale === "/" ||
    publicRoutes.some(
      (route) => route !== "/" && pathWithoutLocale.startsWith(route),
    );
  const isChatRoute = pathWithoutLocale.startsWith("/chat");

  let redirectUrl: URL | null = null;

  // 1. Redirect authenticated active users away from auth pages
  if (
    user &&
    user.isActive &&
    isAuthRoute &&
    !pathWithoutLocale.startsWith("/reset-password")
  ) {
    const nextParam = request.nextUrl.searchParams.get("next");
    if (nextParam && nextParam.startsWith("/") && nextParam !== "/") {
      redirectUrl = new URL(`/${locale}${nextParam}`, request.url);
    } else {
      // Better default: redirect to role-specific dashboard
      const role = user.role;
      if (role === "admin" || role === "superadmin") {
        redirectUrl = new URL(`/${locale}/admin/dashboard`, request.url);
      } else if (role === "merchant") {
        redirectUrl = new URL(`/${locale}/merchant/dashboard`, request.url);
      } else {
        redirectUrl = new URL(`/${locale}/`, request.url);
      }
    }
  }

  // 2. Redirect unauthenticated users to login for protected areas
  else if (!user) {
    const isProtectedRoute =
      pathWithoutLocale.startsWith("/customer") ||
      pathWithoutLocale.startsWith("/merchant") ||
      pathWithoutLocale.startsWith("/admin") ||
      isChatRoute ||
      unprefixedProtectedRoutes.some((route) =>
        pathWithoutLocale.startsWith(route),
      );

    if (isProtectedRoute && !isPublicRoute) {
      redirectUrl = new URL(`/${locale}/login`, request.url);
      if (pathWithoutLocale !== "/") {
        redirectUrl.searchParams.set("next", pathWithoutLocale);
      }
    }
  }

  // 3. Role-based access control for authenticated users
  else if (user) {
    const userRole = user.role;
    const isAdmin = userRole === "admin" || userRole === "superadmin";
    const isMerchant = userRole === "merchant";
    const isCustomer = userRole === "customer";

    // Public paths allowed for Admins and Merchants
    const specializedAllowedPublic = ["/merchants", "/products", "/chat"];
    const isSpecializedAllowedPublic = specializedAllowedPublic.some((route) =>
      pathWithoutLocale.startsWith(route),
    );

    if (isAdmin) {
      const isAdminArea = pathWithoutLocale.startsWith("/admin");
      // Admin only allowed in /admin area or browsing merchants/products/chat
      if (!isAdminArea && !isSpecializedAllowedPublic) {
        redirectUrl = new URL(`/${locale}/admin/dashboard`, request.url);
      }
    } else if (isMerchant) {
      const isMerchantArea = pathWithoutLocale.startsWith("/merchant");
      // Merchant only allowed in /merchant area or browsing merchants/products/chat
      if (!isMerchantArea && !isSpecializedAllowedPublic) {
        redirectUrl = new URL(`/${locale}/merchant/dashboard`, request.url);
      }
    } else if (isCustomer) {
      const isForbiddenArea =
        pathWithoutLocale === "/admin" ||
        pathWithoutLocale.startsWith("/admin/") ||
        pathWithoutLocale === "/merchant" ||
        pathWithoutLocale.startsWith("/merchant/");

      const isUnprefixed = unprefixedProtectedRoutes.some(
        (route) =>
          pathWithoutLocale === route ||
          pathWithoutLocale.startsWith(route + "/"),
      );

      // Only redirect if it's a forbidden area AND not a public route AND not chat
      if (isForbiddenArea && !isPublicRoute && !isChatRoute) {
        redirectUrl = new URL(`/${locale}/`, request.url);
      } else if (isUnprefixed) {
        // Redirect legacy unprefixed routes to /customer/...
        redirectUrl = new URL(
          `/${locale}/customer${pathWithoutLocale}`,
          request.url,
        );
      }
    }
  }

  if (redirectUrl) {
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Preserve cookies set by next-intl and supabase during this request
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });

    return redirectResponse;
  }

  return response;
}
