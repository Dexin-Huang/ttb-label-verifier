import type { CreateApplicationRequest } from '@/lib/types';
import { parseCsv } from '@/lib/csv';
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

function sanitizeApplicationRecord(raw: Record<string, unknown>): CreateApplicationRequest {
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

function extractJsonApplication(raw: unknown): CreateApplicationRequest {
  if (Array.isArray(raw)) {
    if (raw.length !== 1 || typeof raw[0] !== 'object' || raw[0] === null) {
      throw new Error('The JSON file must contain a single application record.');
    }

    return sanitizeApplicationRecord(raw[0] as Record<string, unknown>);
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new Error('The JSON file must contain an application record object.');
  }

  const record = 'application' in raw && typeof raw.application === 'object' && raw.application !== null
    ? (raw.application as Record<string, unknown>)
    : (raw as Record<string, unknown>);

  return sanitizeApplicationRecord(record);
}

function extractCsvApplication(text: string): CreateApplicationRequest {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    throw new Error('The CSV file does not contain any application rows.');
  }

  if (rows.length > 1) {
    throw new Error('Single review accepts one application row at a time.');
  }

  return sanitizeApplicationRecord(rows[0]);
}

export async function parseApplicationUpload(file: File): Promise<CreateApplicationRequest> {
  const text = await file.text();
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.json')) {
    try {
      return extractJsonApplication(JSON.parse(text));
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('The JSON file could not be parsed.');
      }
      throw error;
    }
  }

  if (lowerName.endsWith('.csv')) {
    return extractCsvApplication(text);
  }

  throw new Error('Use a JSON or CSV application file for single review.');
}
