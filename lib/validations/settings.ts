import { z } from 'zod';

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password is too long')
    .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'New password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const personalInfoSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long').optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().min(5, 'Phone number is too short').max(20, 'Phone number is too long').optional().or(z.literal('')),
  walletAddress: z.string().optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  profileImageUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export type PersonalInfoInput = z.infer<typeof personalInfoSchema>;

export const merchantStoreSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters').max(100, 'Store name is too long'),
  description: z.string().max(1000, 'Description is too long').optional().or(z.literal('')),
  category: z.string().max(50, 'Category is too long').optional().or(z.literal('')),
  slug: z.string().min(2, 'Store slug must be at least 2 characters').max(50, 'Store slug is too long').regex(/^[a-z0-9-]+$/, 'Store slug can only contain lowercase letters, numbers, and hyphens'),
  walletAddress: z.string().optional().or(z.literal('')),
  country: z.string().max(50, 'Country is too long').optional().or(z.literal('')),
  city: z.string().max(50, 'City is too long').optional().or(z.literal('')),
});

export type MerchantStoreInput = z.infer<typeof merchantStoreSchema>;

export const merchantApplySchema = z.object({
  storeType: z.string().min(1, 'Store type is required'),
  nationality: z.string().min(2, 'Nationality is required'),
  idType: z.string().min(2, 'ID type is required'),
  idNumber: z.string().min(4, 'ID number is required'),
  idExpiry: z.string().min(1, 'ID expiry is required'),
  issuingCountry: z.string().min(2, 'Issuing country is required'),
  storeName: z.string().min(2, 'Store name is required'),
  storeDescription: z.string().max(1000, 'Description is too long').optional().or(z.literal('')),
});

export type MerchantApplyInput = z.infer<typeof merchantApplySchema>;

export const platformSettingsSchema = z.object({
  platformName: z.string().min(2, 'Platform name must be at least 2 characters'),
  maxFileUploadSize: z.number().positive('Must be a positive number'),
  platformCommission: z.number().min(0, 'Cannot be negative').max(100, 'Cannot exceed 100'),
  minWithdrawalAmount: z.number().min(0, 'Cannot be negative'),
  adminWalletAddress: z.string().optional().or(z.literal('')),
});

export type PlatformSettingsInput = z.infer<typeof platformSettingsSchema>;
