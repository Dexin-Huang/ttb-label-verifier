// ============================================================
// Enums and constants
// ============================================================

export const BEVERAGE_TYPES = ['distilled_spirits', 'wine', 'malt_beverage'] as const;
export type BeverageType = typeof BEVERAGE_TYPES[number];

export const FIELD_STATUSES = ['pass', 'needs_review', 'fail', 'skipped'] as const;
export type FieldStatus = typeof FIELD_STATUSES[number];

export const REVIEW_STATUSES = [
  'pass_candidate', 'needs_review', 'likely_fail', 'processing', 'failed_system'
] as const;
export type ReviewStatus = typeof REVIEW_STATUSES[number];

export const FIELD_TYPES = [
  'brand_name',
  'class_type',
  'alcohol_content',
  'net_contents',
  'bottler_name_address',
  'country_of_origin',
  'government_warning_presence',
  'government_warning_text',
  'government_warning_heading',
] as const;
export type FieldType = typeof FIELD_TYPES[number];

// ============================================================
// Reason codes
// ============================================================

export const REASON_CODES = [
  'EXACT_MATCH',
  'NORMALIZED_MATCH',
  'VALUE_MATCH',
  'PARTIAL_MATCH_REVIEW',
  'MISSING_ON_LABEL',
  'MISSING_IN_APPLICATION',
  'VALUE_MISMATCH',
  'PARSE_FAILED',
  'EXTRACTION_LOW_CONFIDENCE',
  'WARNING_MISSING',
  'WARNING_TEXT_MISMATCH',
  'WARNING_HEADING_NOT_ALL_CAPS',
  'WARNING_HEADING_NOT_BOLD',
  'WARNING_BOLD_UNCERTAIN',
  'FIELD_NOT_APPLICABLE',
  'NO_EXTRACTED_CANDIDATE',
] as const;
export type ReasonCode = typeof REASON_CODES[number];

// ============================================================
// Domain models
// ============================================================

export interface Application {
  id: string;
  beverage_type: BeverageType;
  brand_name: string | null;
  class_type: string | null;
  alcohol_content: string | null;
  net_contents: string | null;
  bottler_name_address: string | null;
  country_of_origin: string | null;
  requires_government_warning: boolean;
  created_at: string;
  updated_at: string;
}

export interface FieldResult {
  field_type: FieldType;
  status: FieldStatus;
  reason_code: ReasonCode;
  confidence: number;
  application_value: string | null;
  extracted_value: string | null;
  normalized_application_value: string | null;
  normalized_extracted_value: string | null;
  details: Record<string, unknown>;
}

export interface ReviewSummary {
  pass: number;
  needs_review: number;
  fail: number;
  skipped: number;
}

export type ReviewSource = 'single' | 'batch';

export interface SessionLabelAsset {
  filename: string;
  mime_type: string;
  file_size_bytes: number;
  file_store_id: string | null;
}

export interface SessionReviewRecord {
  id: string;
  created_at: string;
  source: ReviewSource;
  batch_id: string | null;
  status: ReviewStatus;
  summary: ReviewSummary;
  field_results: FieldResult[];
  extraction_raw: GeminiExtractionResult | null;
  latency_ms: number;
  error_message: string | null;
  application: CreateApplicationRequest;
  label: SessionLabelAsset;
}

export interface SessionBatchItem {
  id: string;
  batch_id: string;
  row_number: number;
  label_filename: string;
  external_reference: string | null;
  application: CreateApplicationRequest;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  review_id: string | null;
  review_status: ReviewStatus | null;
  review_summary: ReviewSummary | null;
}

export interface SessionBatchRecord {
  id: string;
  name: string;
  status: BatchStatus;
  total_items: number;
  processed_items: number;
  failed_items: number;
  created_at: string;
  completed_at: string | null;
  concurrency: number;
  items: SessionBatchItem[];
}

// ============================================================
// Gemini extraction types
// ============================================================

export interface GeminiExtractionResult {
  brand_name: ExtractedField | null;
  class_type: ExtractedField | null;
  alcohol_content: ExtractedField | null;
  net_contents: ExtractedField | null;
  bottler_name_address: ExtractedField | null;
  country_of_origin: ExtractedField | null;
  government_warning: GovernmentWarningExtraction | null;
}

export interface ExtractedField {
  raw_text: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface GovernmentWarningExtraction {
  present: boolean;
  full_text: string | null;
  heading_text: string | null;
  heading_appears_bold: boolean | null;
  heading_appears_all_caps: boolean | null;
  body_text: string | null;
  confidence: 'high' | 'medium' | 'low';
}

// ============================================================
// API request/response types
// ============================================================

export interface CreateApplicationRequest {
  beverage_type: BeverageType;
  brand_name: string;
  class_type: string;
  alcohol_content: string;
  net_contents: string;
  bottler_name_address: string;
  country_of_origin: string;
  requires_government_warning: boolean;
}

export interface RunSingleReviewRequest {
  application: CreateApplicationRequest;
  file: File;
}

export interface StatelessReviewResult {
  id: string;
  created_at: string;
  source: ReviewSource;
  batch_id: string | null;
  status: ReviewStatus;
  summary: ReviewSummary;
  field_results: FieldResult[];
  extraction_raw: GeminiExtractionResult | null;
  latency_ms: number;
  error_message: string | null;
  application: CreateApplicationRequest;
  label: SessionLabelAsset;
}

export type BatchStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';
