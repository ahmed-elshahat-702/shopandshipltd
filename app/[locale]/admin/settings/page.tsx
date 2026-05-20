import {
  getPlatformSettingsAction,
  getCurrentUserAction,
} from "@/app/actions/admin";
import SettingsClient from "./client";
import { PlatformSettings } from "@/lib/types";

export default async function SettingsPage() {
  const [initialSettings, userProfile] = await Promise.all([
    getPlatformSettingsAction(),
    getCurrentUserAction(),
  ]);

  const settings: PlatformSettings =
    "error" in initialSettings
      ? {
          platformName: "Shop & Ship LTD",
          platformCommission: 15,
          maxFileUploadSize: 10485760,
          emailVerificationRequired: true,
          kycRequiredForMerchant: true,
          minWithdrawalAmount: 10,
          allowCustomerWithdrawal: true,
          allowMerchantWithdrawal: true,
          autoApproveKYC: false,
          emailNotifications: true,
          maintenanceMode: false,
          adminWalletAddress: "",
        }
      : (initialSettings as PlatformSettings);

  return (
    <SettingsClient initialSettings={settings} userProfile={userProfile} />
  );
}
