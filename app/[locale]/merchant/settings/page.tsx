import { createClient } from "@/utils/supabase/server";
import { getMerchantDetailsByUserIdAction } from "@/app/actions/merchant";
import MerchantSettingsClient from "./client";
import { redirect } from "next/navigation";

export default async function MerchantSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile from DB
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, profile_image_url, email")
    .eq("id", user.id)
    .single();

  let merchantId = "";
  let storeName = "";
  let storeDescription = "";
  let businessCategory = "";
  let storeSlug = "";
  let walletAddress = "";
  let country = "";
  let city = "";
  let logoUrl = "";
  let bannerUrl = "";

  try {
    const merchantResponse = await getMerchantDetailsByUserIdAction(user.id);
    const merchant = "merchant" in merchantResponse ? merchantResponse.merchant : null;
    merchantId = merchant?.id ?? "";
    storeName = merchant?.business_name ?? "";
    storeDescription = merchant?.business_description ?? "";
    businessCategory = merchant?.business_category ?? "";
    storeSlug = merchant?.store_slug ?? "";
    walletAddress = merchant?.wallet_address ?? "";
    country = merchant?.country ?? "";
    city = merchant?.city ?? "";
    logoUrl = merchant?.logo_url ?? "";
    bannerUrl = merchant?.banner_url ?? "";
  } catch {
    // Merchant profile not found — settings will still work for personal info
  }

  return (
    <MerchantSettingsClient
      userId={user.id}
      merchantId={merchantId}
      initialFullName={profile?.full_name ?? ""}
      initialPhone={profile?.phone ?? ""}
      initialEmail={profile?.email ?? user.email ?? ""}
      initialProfileImageUrl={profile?.profile_image_url ?? ""}
      initialStoreName={storeName}
      initialStoreDescription={storeDescription}
      initialBusinessCategory={businessCategory}
      initialStoreSlug={storeSlug}
      initialWalletAddress={walletAddress}
      initialCountry={country}
      initialCity={city}
      initialStoreLogoUrl={logoUrl}
      initialStoreBannerUrl={bannerUrl}
    />
  );
}
