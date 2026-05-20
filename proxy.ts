import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest } from "next/server";
import { updateSession } from "./utils/supabase/proxy";

const intlProxy = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const response = intlProxy(request);

  return await updateSession(request, response);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};
