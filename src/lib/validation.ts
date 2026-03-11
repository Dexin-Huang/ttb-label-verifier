import { z } from 'zod';

export const applicationSchema = z.object({
  beverage_type: z.enum(['distilled_spirits', 'wine', 'malt_beverage']),
  brand_name: z.string().min(1, 'Brand name is required'),
  class_type: z.string().min(1, 'Class/type is required'),
  alcohol_content: z.string().min(1, 'Alcohol content is required'),
  net_contents: z.string().min(1, 'Net contents is required'),
  bottler_name_address: z.string().min(1, 'Bottler/producer info is required'),
  country_of_origin: z.string().optional().default(''),
  requires_government_warning: z.boolean().default(true),
});

export type ApplicationFormData = z.infer<typeof applicationSchema>;

export const labelUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size <= 25 * 1024 * 1024, 'File must be under 25 MB')
    .refine(
      (f) => ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'].includes(f.type),
      'File must be PNG, JPG, or PDF'
    ),
});
