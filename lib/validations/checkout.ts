import { z } from 'zod';

export const checkoutSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone number is too short'),
  address: z.string().min(5, 'Address is too short'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(4, 'ZIP code is required'),
  country: z.string().min(2, 'Country is required'),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
