import type { CreateApplicationRequest } from '@/lib/types';
import { applicationSchema } from '@/lib/validation';

function coerceBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false;
  }

  return undefined;
}

export function sanitizeApplicationRecord(
  raw: Record<string, unknown>,
): CreateApplicationRequest {
  const candidate = {
    alcohol_content: raw.alcohol_content,
    beverage_type: raw.beverage_type,
    bottler_name_address: raw.bottler_name_address,
    brand_name: raw.brand_name,
    class_type: raw.class_type,
    country_of_origin: raw.country_of_origin ?? '',
    net_contents: raw.net_contents,
    requires_government_warning:
      coerceBoolean(raw.requires_government_warning) ?? true,
  };

  const parsed = applicationSchema.safeParse(candidate);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw new Error(firstIssue?.message ?? 'The application file is invalid.');
  }

  return parsed.data;
}
