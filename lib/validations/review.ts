import { z } from 'zod';

export const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  comment: z.string().min(3, 'Comment must be at least 3 characters').max(1000, 'Comment is too long'),
  productId: z.string().uuid('Invalid product ID'),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
