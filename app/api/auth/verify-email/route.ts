import { createClient } from "@/utils/supabase/server";
import { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = request.nextUrl;
    const token = searchParams.get("token");
    const type = searchParams.get("type");

    if (!token || !type) {
      return NextResponse.redirect(
        new URL("/error?message=Invalid verification token", origin),
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as EmailOtpType,
    });

    if (error) {
      return NextResponse.redirect(
        new URL("/error?message=Email verification failed", origin),
      );
    }

    // Manual profile update removed because it's now handled by the sync_email_verified DB trigger
    // established in scripts/init-supabase.sql

    return NextResponse.redirect(new URL("/email-verified", origin));
  } catch (error) {
    console.error("[Email Verification Error]:", error);
    return NextResponse.redirect(
      new URL("/error?message=Internal server error", request.nextUrl.origin),
    );
  }
}
