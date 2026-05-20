import { z } from 'zod';

export const searchSchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty').max(100, 'Search query is too long'),
});

export type SearchInput = z.infer<typeof searchSchema>;
