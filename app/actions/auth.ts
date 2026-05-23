"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin-client";
import { getCurrentUserProfile, getUser } from "@/utils/supabase";
import { getPlatformSettingsAction } from "./admin";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export async function loginAction(formData: {
  email?: string;
  password?: string;
}) {
  try {
    const { email, password } = formData;

    if (!email || !password) {
      return { error: "Email and password are required" };
    }

    const supabase = await createClient();

    const settingsRes = await getPlatformSettingsAction();
    const settings = "error" in settingsRes ? null : settingsRes;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message === "Email not confirmed") {
        if (!settings?.emailVerificationRequired) {
          // If platform allows unverified but Supabase blocks it, we can't do much here
          // without changing Supabase settings, but we return the error anyway.
          return {
            error: "Your account requires email confirmation by the provider.",
          };
        }
        return { error: "Email not verified", unverifiedEmail: email };
      }
      return { error: error.message };
    }

    if (!data.user) {
      return { error: "Login failed" };
    }

    // Check if user is active
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", data.user.id)
      .single();

    if (profile && !profile.is_active) {
      await supabase.auth.signOut();
      return { error: "account_deactivated" };
    }

    // Use metadata from JWT session instead of an extra DB query where possible
    const role = data.user.user_metadata?.role || "customer";
    const emailVerified = !!data.user.email_confirmed_at;

    if (settings?.emailVerificationRequired && !emailVerified) {
      await supabase.auth.signOut();
      return { error: "Email not verified", unverifiedEmail: email };
    }

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: role,
        emailVerified: emailVerified,
      },
    };
  } catch (error) {
    console.error("[Auth Login Error]:", error);
    return { error: "Internal server error" };
  }
}

export async function logoutAction() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: error.message };
    }
  } catch (error) {
    console.error("[Auth Logout Error]:", error);
    return { error: "Internal server error" };
  }

  const locale = await getLocale();
  redirect({ href: "/", locale });
}

export async function registerAction(formData: {
  email?: string;
  password?: string;
  fullName?: string;
  role?: string;
}) {
  try {
    const { email, password, fullName, role } = formData;

    if (!email || !password || !fullName) {
      return { error: "Email, password, and full name are required" };
    }

    const userRole = role || "customer";

    const adminSupabase = createAdminClient();
    const { data: existingUser } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return { error: "This email is already registered" };
    }

    const supabase = await createClient();

    // Sign up user with metadata for immediate role availability in JWT
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: userRole,
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    if (!data.user) {
      return { error: "Registration failed" };
    }

    return {
      success: true,
      message: "Registration successful. Please verify your email.",
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    };
  } catch (error) {
    console.error("[Auth Register Error]:", error);
    return { error: "Internal server error" };
  }
}

export async function resetPasswordAction(formData: { password?: string }) {
  try {
    const { password } = formData;

    if (!password) {
      return { error: "Password is required" };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return { error: error.message };
    }

    return {
      success: true,
      message: "Password reset successfully",
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    };
  } catch (error) {
    console.error("[Reset Password Error]:", error);
    return { error: "Internal server error" };
  }
}

export async function forgotPasswordAction(formData: { email?: string }) {
  try {
    const { email } = formData;

    if (!email) {
      return { error: "Email is required" };
    }

    const supabase = await createClient();

    // In a production app, we would add a redirectTo option here
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      return { error: error.message };
    }

    return {
      success: true,
      message: "Password reset code sent. Check your inbox.",
    };
  } catch (error) {
    console.error("[Forgot Password Error]:", error);
    return { error: "Internal server error" };
  }
}

export async function verifyOtpAction(formData: {
  email?: string;
  otp?: string;
}) {
  try {
    const { email, otp } = formData;

    if (!email || !otp) {
      return { error: "Email and OTP are required" };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (error) {
      return { error: error.message };
    }

    // Manual profile update removed: handled by sync_email_verified trigger

    return {
      success: true,
      message: "Email verified successfully",
    };
  } catch (error) {
    console.error("[Verify OTP Error]:", error);
    return { error: "Internal server error" };
  }
}

export async function verifyRecoveryOtpAction(formData: {
  email?: string;
  otp?: string;
}) {
  try {
    const { email, otp } = formData;

    if (!email || !otp) {
      return { error: "Email and OTP are required" };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "recovery",
    });

    if (error) {
      return { error: error.message };
    }

    return {
      success: true,
      message: "Code verified successfully",
    };
  } catch (error) {
    console.error("[Verify Recovery OTP Error]:", error);
    return { error: "Internal server error" };
  }
}

export async function getMeAction() {
  try {
    const user = await getUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const profile = await getCurrentUserProfile();

    if (!profile) {
      return { error: "User profile not found" };
    }

    return {
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        phone: profile.phone,
        profileImageUrl: profile.profile_image_url,
        role: profile.role,
        isActive: profile.is_active,
        emailVerified: profile.email_verified,
        createdAt: profile.created_at,
      },
    };
  } catch (error) {
    console.error("[Get User Error]:", error);
    return { error: "Internal server error" };
  }
}

export async function resendOtpAction(formData: { email?: string }) {
  try {
    const { email } = formData;

    if (!email) {
      return { error: "Email is required" };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      return { error: error.message };
    }

    return {
      success: true,
      message: "Verification code resent successfully",
    };
  } catch (error) {
    console.error("[Resend OTP Error]:", error);
    return { error: "Internal server error" };
  }
}

export async function deleteAccountAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Instead of absolute deletion which requires admin privileges in Supabase Auth,
    // we mark the profile as inactive and sign out the user.
    // This is a safer and standard practice for user-initiated "deletion".
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", user.id);

    if (profileError) {
      return { error: profileError.message };
    }

    await supabase.auth.signOut();

    return {
      success: true,
      message: "Account deactivated successfully",
    };
  } catch (error) {
    console.error("[Delete Account Error]:", error);
    return { error: "Internal server error" };
  }
}
