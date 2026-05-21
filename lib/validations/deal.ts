import { z } from 'zod';

export const dealSchema = z.object({
  title_en: z.string().min(1, 'Title (English) is required'),
  title_ar: z.string().min(1, 'Title (Arabic) is required'),
  title_ko: z.string().min(1, 'Title (Korean) is required'),
  subtitle_en: z.string().optional(),
  subtitle_ar: z.string().optional(),
  subtitle_ko: z.string().optional(),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  description_ko: z.string().optional(),
  image_url: z.string().optional().nullable(),
  link_url: z.string().min(1, 'Link URL is required'),
  is_active: z.boolean().default(true),
  sort_order: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().default(0)
  ),
});

export type DealInput = z.infer<typeof dealSchema>;
