import type { FieldType, FieldStatus, ReasonCode, FieldResult } from '@/lib/types';

const STATUS_CONFIDENCE: Record<FieldStatus, number> = {
  pass: 0.99,
  needs_review: 0.7,
  fail: 0.95,
  skipped: 0.99,
};

/**
 * Create a FieldResult object with consistent structure.
 * Confidence is derived from status via STATUS_CONFIDENCE unless an
 * explicit override is provided by the caller.
 */
export function makeResult(
  field_type: FieldType,
  status: FieldStatus,
  reason_code: ReasonCode,
  application_value: string | null,
  extracted_value: string | null,
  normalized_application_value: string | null = null,
  normalized_extracted_value: string | null = null,
  details: Record<string, unknown> = {},
  confidence?: number,
): FieldResult {
  return {
    field_type,
    status,
    reason_code,
    confidence: confidence ?? STATUS_CONFIDENCE[status],
    application_value,
    extracted_value,
    normalized_application_value,
    normalized_extracted_value,
    details,
  };
}
