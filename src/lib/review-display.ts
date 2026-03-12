import type { FieldResult, FieldStatus, FieldType, ReasonCode } from '@/lib/types';

export const FIELD_LABELS: Record<FieldType, string> = {
  alcohol_content: 'Alcohol Content',
  bottler_name_address: 'Bottler / Producer',
  brand_name: 'Brand Name',
  class_type: 'Class / Type',
  country_of_origin: 'Country of Origin',
  government_warning_heading: 'Warning Heading',
  government_warning_presence: 'Warning Present',
  government_warning_text: 'Warning Text',
  net_contents: 'Net Contents',
};

export const REASON_LABELS: Partial<Record<ReasonCode, string>> = {
  EXTRACTION_LOW_CONFIDENCE: 'Low confidence',
  FIELD_NOT_APPLICABLE: 'Not required',
  MISSING_IN_APPLICATION: 'Missing in application',
  MISSING_ON_LABEL: 'Missing on label',
  NO_EXTRACTED_CANDIDATE: 'Not found on label',
  NORMALIZED_MATCH: 'Matched after normalization',
  PARSE_FAILED: 'Needs manual review',
  PARTIAL_MATCH_REVIEW: 'Close match',
  VALUE_MISMATCH: 'Value mismatch',
  WARNING_BOLD_UNCERTAIN: 'Bold formatting uncertain',
  WARNING_HEADING_NOT_ALL_CAPS: 'Heading not all caps',
  WARNING_HEADING_NOT_BOLD: 'Heading not bold',
  WARNING_MISSING: 'Warning missing',
  WARNING_TEXT_MISMATCH: 'Warning text mismatch',
};

export function formatApplicationValue(field: FieldResult): string {
  if (field.status === 'skipped' && field.reason_code === 'FIELD_NOT_APPLICABLE') {
    return 'Not applicable';
  }

  if (field.status === 'skipped' && field.reason_code === 'MISSING_IN_APPLICATION') {
    return 'Not provided';
  }

  if (field.field_type === 'government_warning_presence') {
    return field.application_value === 'required' ? 'Required' : 'Not Required';
  }

  return field.application_value?.trim() || 'Not provided';
}

export function formatExtractedValue(field: FieldResult): string {
  if (field.status === 'skipped' && field.reason_code === 'FIELD_NOT_APPLICABLE') {
    return 'Not applicable';
  }

  if (field.field_type === 'government_warning_presence') {
    return field.extracted_value === 'present' ? 'Present' : 'Not found';
  }

  if (field.status === 'skipped') {
    return 'Not applicable';
  }

  return field.extracted_value?.trim() || 'Not found';
}

export function formatReasonLabel(reasonCode: ReasonCode): string {
  return REASON_LABELS[reasonCode] ?? reasonCode.replace(/_/g, ' ').toLowerCase();
}

export function getFieldTone(status: FieldStatus): 'pass' | 'review' | 'fail' {
  switch (status) {
    case 'pass':
      return 'pass';
    case 'fail':
      return 'fail';
    default:
      return 'review';
  }
}
