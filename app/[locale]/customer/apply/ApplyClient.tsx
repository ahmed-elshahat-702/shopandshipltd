"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useRouter } from "@/i18n/navigation";
import {
  Building2,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShieldCheck,
  Store,
  User as UserIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useUser } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { submitMerchantApplicationAction, getMerchantApplicationAction } from "@/app/actions/merchant";
import Image from "next/image";
import useSWR from "swr";
import LoadingSpinner from "@/components/LoadingSpinner";
import { merchantApplySchema, type MerchantApplyInput } from "@/lib/validations/settings";
import { cn } from "@/lib/utils";

const STEPS = ["step1", "step2", "step3", "step4"];

export default function ApplyClient() {
  const t = useTranslations();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: applicationData, isLoading: appLoading } = useSWR(
    user ? ["merchant-application", user.id] : null,
    () => getMerchantApplicationAction(user!.id)
  );

  const application = applicationData && "application" in applicationData ? applicationData.application : null;

  const [formData, setFormData] = useState({
    storeType: "",
    nationality: "",
    idType: "",
    idNumber: "",
    idExpiry: "",
    issuingCountry: "",
    storeName: "",
    storeDescription: "",
    storeCategory: "",
    storeLogo: null as string | null,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof MerchantApplyInput, string>>>({});

  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    idFront: null,
    idBack: null,
    selfie: null,
    storeLogo: null,
  });

  const [previews, setPreviews] = useState<{ [key: string]: string | null }>({
    idFront: null,
    idBack: null,
    selfie: null,
    storeLogo: null,
  });

  // Cleanup object URLs on unmount or when previews change
  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previews]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/");
    }
  }, [userLoading, user, router]);

  if (userLoading || appLoading) return (
    <div className="flex justify-center py-24">
      <LoadingSpinner />
    </div>
  );

  if (application && currentStep < 4) {
    return (
      <main className="min-h-screen bg-slate-50/50 py-12 px-4 flex items-center justify-center">
        <div className="max-w-lg w-full text-center space-y-6 bg-white p-12 rounded-[3rem] border-2 shadow-2xl shadow-primary/10 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-2 ${application.status === 'approved' ? 'bg-green-500' : application.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'}`} />
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-2xl border-8 ${application.status === 'approved' ? 'bg-green-500 border-green-50 text-white' : application.status === 'rejected' ? 'bg-red-500 border-red-50 text-white' : 'bg-yellow-500 border-yellow-50 text-white'}`}>
             {application.status === 'approved' ? <CheckCircle2 size={48} /> : <ShieldCheck size={48} />}
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight">
              {application.status === 'pending' ? t("merchant.kyc.pending") : application.status === 'approved' ? t("merchant.kyc.approved") : t("merchant.kyc.rejected")}
            </h2>
            <p className="text-muted-foreground font-medium text-lg leading-relaxed">
              {application.status === 'pending' ? t("merchant.kyc.kycPendingDesc") : application.status === 'approved' ? t("merchant.kyc.kycApprovedDesc") : application.rejection_reason || t("merchant.kyc.kycRejectedDesc")}
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="rounded-2xl px-12 h-14 font-black shadow-xl hover:scale-105 transition-transform mt-6"
          >
            <Link href="/customer/account">
              {t("common.backToHome")}
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep((v) => v + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep((v) => v - 1);
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // Revoke old preview if it exists
      if (previews[key]) {
        URL.revokeObjectURL(previews[key]!);
      }

      const url = URL.createObjectURL(file);
      setFiles((prev) => ({ ...prev, [key]: file }));
      setPreviews((prev) => ({ ...prev, [key]: url }));
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Final validation
    if (!formData.storeType || !files.idFront || !files.selfie) {
      toast.error(t("messages.fillAllFields") || "Please fill all required fields and upload documents");
      return;
    }

    const result = merchantApplySchema.safeParse(formData);
    if (!result.success) {
      const errors: Partial<Record<keyof MerchantApplyInput, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof MerchantApplyInput;
        errors[field] = issue.message;
      }
      setFieldErrors(errors);
      // Go back to the step with the error
      if (errors.nationality || errors.idType || errors.idNumber || errors.idExpiry || errors.issuingCountry) {
        setCurrentStep(1);
      } else if (errors.storeName || errors.storeDescription) {
        setCurrentStep(3);
      }
      toast.error(t("messages.fillAllFields") || "Please fix the errors in the form");
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    
    try {
      const data = new FormData();
      data.append("storeType", formData.storeType);
      data.append("storeName", formData.storeName);
      data.append("storeDescription", formData.storeDescription);
      data.append("nationality", formData.nationality);
      data.append("idType", formData.idType);
      data.append("idNumber", formData.idNumber);
      data.append("idExpiry", formData.idExpiry);
      data.append("issuingCountry", formData.issuingCountry);
      
      if (files.idFront) data.append("idFront", files.idFront);
      if (files.idBack) data.append("idBack", files.idBack);
      if (files.selfie) data.append("selfie", files.selfie);
      if (files.storeLogo) data.append("storeLogo", files.storeLogo);

      const res = await submitMerchantApplicationAction(data);

      if ('error' in res && res.error) throw new Error(res.error);

      toast.success(t("merchant.apply.successTitle"));
      setCurrentStep(4); // Success step
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-black">
                {t("merchant.apply.selectStoreType")}
              </h2>
              <p className="text-muted-foreground font-medium">
                {t("customer.account.switchToMerchantDesc")}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  id: "personal",
                  icon: UserIcon,
                  label: t("merchant.apply.personalStore"),
                  desc: t("merchant.apply.personalStoreDesc"),
                },
                {
                  id: "enterprise",
                  icon: Building2,
                  label: t("merchant.apply.enterpriseStore"),
                  desc: t("merchant.apply.enterpriseStoreDesc"),
                },
                {
                  id: "charity",
                  icon: Heart,
                  label: t("merchant.apply.charityStore"),
                  desc: t("merchant.apply.charityStoreDesc"),
                },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() =>
                    setFormData({ ...formData, storeType: type.id })
                  }
                  className={`flex flex-col items-center p-8 rounded-[2.5rem] border-4 transition-all gap-4 text-center group ${
                    formData.storeType === type.id
                      ? "border-primary bg-primary/5 ring-8 ring-primary/5"
                      : "border-muted bg-background hover:border-primary/20"
                  }`}
                >
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                      formData.storeType === type.id
                        ? "bg-primary text-white scale-110 shadow-xl shadow-primary/20"
                        : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    }`}
                  >
                    <type.icon size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-lg">{type.label}</h3>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      {type.desc}
                    </p>
                  </div>
                  <div
                    className={`mt-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      formData.storeType === type.id
                        ? "bg-primary border-primary text-white"
                        : "border-muted"
                    }`}
                  >
                    {formData.storeType === type.id && (
                      <CheckCircle2 size={14} fill="currentColor" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-black">
                {t("merchant.apply.fillPersonalInfo")}
              </h2>
              <p className="text-muted-foreground font-medium">
                {t("kyc.uploadDocumentsDesc")}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-[2.5rem] border-2">
              <div className="space-y-2">
                <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">
                  {t("merchant.apply.nationality")}
                </Label>
                <Input
                  value={formData.nationality}
                  onChange={(e) => {
                    setFormData({ ...formData, nationality: e.target.value })
                    if (fieldErrors.nationality) setFieldErrors(prev => ({ ...prev, nationality: undefined }));
                  }}
                  placeholder={t("merchant.apply.placeholderNationality")}
                  className={cn(
                    "rounded-xl h-12 font-bold border-2 focus:border-primary transition-all",
                    fieldErrors.nationality ? "border-destructive focus-visible:ring-destructive" : ""
                  )}
                />
                {fieldErrors.nationality && (
                  <p className="text-xs text-destructive">{fieldErrors.nationality}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">
                  {t("merchant.apply.idType")}
                </Label>
                <Select
                  onValueChange={(v) => {
                    setFormData({ ...formData, idType: v })
                    if (fieldErrors.idType) setFieldErrors(prev => ({ ...prev, idType: undefined }));
                  }}
                >
                  <SelectTrigger className={cn(
                    "rounded-xl h-12 font-bold border-2",
                    fieldErrors.idType ? "border-destructive focus:ring-destructive" : ""
                  )}>
                    <SelectValue placeholder={t("merchant.apply.idType")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2 shadow-xl">
                    <SelectItem
                      value="passport"
                      className="rounded-lg font-bold"
                    >
                      {t("merchant.apply.passport")}
                    </SelectItem>
                    <SelectItem value="id" className="rounded-lg font-bold">
                      {t("merchant.apply.nationalId")}
                    </SelectItem>
                    <SelectItem
                      value="license"
                      className="rounded-lg font-bold"
                    >
                      {t("merchant.apply.drivingLicense")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">
                  {t("merchant.apply.idNumber")}
                </Label>
                <Input
                  value={formData.idNumber}
                  onChange={(e) => {
                    setFormData({ ...formData, idNumber: e.target.value })
                    if (fieldErrors.idNumber) setFieldErrors(prev => ({ ...prev, idNumber: undefined }));
                  }}
                  placeholder={t("merchant.apply.placeholderIdNumber")}
                  className={cn(
                    "rounded-xl h-12 font-bold border-2",
                    fieldErrors.idNumber ? "border-destructive focus-visible:ring-destructive" : ""
                  )}
                />
                {fieldErrors.idNumber && (
                  <p className="text-xs text-destructive">{fieldErrors.idNumber}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">
                  {t("merchant.apply.idExpiry")}
                </Label>
                <Input
                  type="date"
                  value={formData.idExpiry}
                  onChange={(e) => {
                    setFormData({ ...formData, idExpiry: e.target.value })
                    if (fieldErrors.idExpiry) setFieldErrors(prev => ({ ...prev, idExpiry: undefined }));
                  }}
                  className={cn(
                    "rounded-xl h-12 font-bold border-2",
                    fieldErrors.idExpiry ? "border-destructive focus-visible:ring-destructive" : ""
                  )}
                />
                {fieldErrors.idExpiry && (
                  <p className="text-xs text-destructive">{fieldErrors.idExpiry}</p>
                )}
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">
                  {t("merchant.apply.issuingCountry")}
                </Label>
                <Input
                  value={formData.issuingCountry}
                  onChange={(e) => {
                    setFormData({ ...formData, issuingCountry: e.target.value })
                    if (fieldErrors.issuingCountry) setFieldErrors(prev => ({ ...prev, issuingCountry: undefined }));
                  }}
                  placeholder={t("merchant.apply.placeholderIssuingCountry")}
                  className={cn(
                    "rounded-xl h-12 font-bold border-2",
                    fieldErrors.issuingCountry ? "border-destructive focus-visible:ring-destructive" : ""
                  )}
                />
                {fieldErrors.issuingCountry && (
                  <p className="text-xs text-destructive">{fieldErrors.issuingCountry}</p>
                )}
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-black">
                {t("merchant.apply.uploadVerification")}
              </h2>
              <p className="text-muted-foreground font-medium">
                {t("kyc.uploadDocumentsDesc")}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  id: "idFront",
                  label: t("merchant.apply.idFront"),
                  icon: ShieldCheck,
                },
                {
                  id: "idBack",
                  label: t("merchant.apply.idBack"),
                  icon: ShieldCheck,
                },
                {
                  id: "selfie",
                  label: t("merchant.apply.selfie"),
                  icon: Camera,
                },
              ].map((file) => (
                <div key={file.id} className="relative group">
                  <input
                    type="file"
                    id={file.id}
                    className="hidden"
                    onChange={(e) => handleFileChange(e, file.id)}
                    accept="image/*"
                  />
                  <label
                    htmlFor={file.id}
                    className={`flex flex-col items-center justify-center p-8 rounded-[2.5rem] border-4 border-dashed transition-all cursor-pointer bg-white h-full gap-4 text-center relative overflow-hidden group ${
                      files[file.id]
                        ? "border-green-500 bg-green-50/50"
                        : "border-muted hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    {previews[file.id] ? (
                      <div className="absolute inset-0 w-full h-full">
                        <Image
                          src={previews[file.id]!}
                          alt={file.label}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera size={32} className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                            files[file.id]
                              ? "bg-green-500 text-white shadow-lg"
                              : "bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                          }`}
                        >
                          {files[file.id] ? (
                            <CheckCircle2 size={32} />
                          ) : (
                            <file.icon size={32} />
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-sm">{file.label}</p>
                          <p className="text-[10px] font-bold text-muted-foreground">
                            JPG, PNG (Max 10MB)
                          </p>
                        </div>
                        {files[file.id] && (
                          <p className="text-[10px] font-black text-green-600 truncate max-w-full px-2">
                            {files[file.id]?.name}
                          </p>
                        )}
                      </>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-black">
                {t("merchant.apply.finalStep")}
              </h2>
              <p className="text-muted-foreground font-medium">
                {t("merchant.settingsDesc")}
              </p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border-2 space-y-6">
              <div className="space-y-2">
                <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">
                  {t("merchant.storeName")}
                </Label>
                <div className="relative">
                  <Store
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={18}
                  />
                  <Input
                    value={formData.storeName}
                    onChange={(e) => {
                      setFormData({ ...formData, storeName: e.target.value })
                      if (fieldErrors.storeName) setFieldErrors(prev => ({ ...prev, storeName: undefined }));
                    }}
                    placeholder={t("merchant.storeNamePlaceholder")}
                    className={cn(
                      "rounded-xl h-14 pl-12 font-black text-lg border-2",
                      fieldErrors.storeName ? "border-destructive focus-visible:ring-destructive" : ""
                    )}
                  />
                </div>
                {fieldErrors.storeName && (
                  <p className="text-xs text-destructive">{fieldErrors.storeName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">
                  {t("merchant.storeDescription")}
                </Label>
                <Input
                  value={formData.storeDescription}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      storeDescription: e.target.value,
                    })
                    if (fieldErrors.storeDescription) setFieldErrors(prev => ({ ...prev, storeDescription: undefined }));
                  }}
                  placeholder={t("merchant.storeDescriptionPlaceholder")}
                  className={cn(
                    "rounded-xl h-14 font-bold border-2",
                    fieldErrors.storeDescription ? "border-destructive focus-visible:ring-destructive" : ""
                  )}
                />
                {fieldErrors.storeDescription && (
                  <p className="text-xs text-destructive">{fieldErrors.storeDescription}</p>
                )}
              </div>

              {/* Store Logo Upload */}
              <div className="space-y-4 pt-4">
                <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground block text-center">
                  {t("merchant.apply.storeLogo")}
                </Label>
                <div className="flex justify-center">
                  <div className="relative group w-32 h-32">
                    <input
                      type="file"
                      id="storeLogo"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, "storeLogo")}
                      accept="image/*"
                    />
                    <label
                      htmlFor="storeLogo"
                      className={`flex flex-col items-center justify-center w-full h-full rounded-[2rem] border-4 border-dashed transition-all cursor-pointer bg-slate-50 relative overflow-hidden group ${
                        files.storeLogo
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/40 hover:bg-white"
                      }`}
                    >
                      {previews.storeLogo ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={previews.storeLogo}
                            alt="Logo Preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Camera
                            size={24}
                            className="text-muted-foreground group-hover:text-primary transition-colors"
                          />
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {t("common.change") || "Upload"}
                          </span>
                        </div>
                      )}

                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera size={24} className="text-white" />
                      </div>
                    </label>
                  </div>
                </div>
                <p className="text-center text-[10px] font-medium text-muted-foreground">
                  {t("merchant.apply.storeLogoDesc")}
                </p>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="max-w-lg mx-auto text-center space-y-6 bg-white p-12 rounded-[3rem] border-2 shadow-2xl shadow-primary/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-green-500" />
            <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-500/40 border-8 border-green-50">
              <CheckCircle2 size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight">
                {t("merchant.apply.successTitle")}
              </h2>
              <p className="text-muted-foreground font-medium text-lg leading-relaxed">
                {t("merchant.apply.successDesc")}
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="rounded-2xl px-12 h-14 font-black shadow-xl hover:scale-105 transition-transform mt-6"
            >
              <Link href="/customer/account">
                {t("common.backToHome") || "Back to Account"}
              </Link>
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-slate-50/50 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Stepper UI */}
        {currentStep < 4 && (
          <div className="relative">
            <div className="flex items-center justify-between relative z-10">
              {STEPS.map((step, idx) => (
                <div key={step} className="flex flex-col items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all duration-500 border-2 ${
                      idx < currentStep
                        ? "bg-primary border-primary text-white shadow-lg"
                        : idx === currentStep
                          ? "bg-primary/10 border-primary text-primary scale-110"
                          : "bg-white border-muted text-muted-foreground"
                    }`}
                  >
                    {idx < currentStep ? <CheckCircle2 size={24} /> : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest hidden md:block ${
                      idx === currentStep
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {t(`merchant.apply.${step}`)}
                  </span>
                </div>
              ))}
            </div>
            {/* Background line */}
            <div className="absolute top-6 left-0 w-full h-0.5 bg-muted z-0" />
            <div
              className="absolute top-6 left-0 h-0.5 bg-primary transition-all duration-700 ease-out z-0"
              style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        )}

        {/* Form Content */}
        <div className="py-8 min-h-100">{renderStep()}</div>

        {/* Actions */}
        {currentStep < 4 && (
          <div className="flex items-center justify-between max-w-2xl mx-auto pt-8 border-t border-dashed">
            <Button
              variant="outline"
              disabled={currentStep === 0 || isSubmitting}
              onClick={prevStep}
              className="rounded-2xl h-14 px-8 font-bold gap-2 border-2"
            >
              <ChevronLeft size={20} />
              {t("common.prev") || "Previous"}
            </Button>

            {currentStep === STEPS.length - 1 ? (
              <Button
                disabled={isSubmitting || !formData.storeName}
                onClick={handleSubmit}
                className="rounded-2xl h-14 px-12 font-black shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t("common.submitting") || "Submitting..."}
                  </span>
                ) : (
                  t("common.submit") || "Submit Application"
                )}
              </Button>
            ) : (
              <Button
                disabled={
                  (currentStep === 0 && !formData.storeType) ||
                  (currentStep === 1 &&
                    (!formData.nationality || !formData.idType)) ||
                  (currentStep === 2 && !files.idFront)
                }
                onClick={nextStep}
                className="rounded-2xl h-14 px-12 font-black shadow-xl shadow-primary/20 hover:scale-105 transition-transform gap-2"
              >
                {t("common.next") || "Next"}
                <ChevronRight size={20} />
              </Button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
