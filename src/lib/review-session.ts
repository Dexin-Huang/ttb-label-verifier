import type {
  FieldResult,
  ReviewStatus,
  SessionReviewRecord,
  StatelessReviewResult,
} from '@/lib/types';
import {
  FIELD_LABELS,
  formatApplicationValue,
  formatExtractedValue,
  formatReasonLabel,
} from '@/lib/review-display';
import { clearSessionBatches } from '@/lib/review-batches';
import { clearReviewFiles, saveReviewFile } from '@/lib/review-session-files';

const SESSION_REVIEWS_KEY = 'label-verifier-session-reviews';

export interface DashboardIssueItem {
  applicationValue: string;
  extractedValue: string;
  fieldLabel: string;
  fieldType: FieldResult['field_type'] | 'system_error';
  reasonLabel: string;
  tone: 'review' | 'fail';
}

export interface DashboardHistoryItem {
  brand: string;
  href: string;
  id: string;
  issueCount: number;
  issues: DashboardIssueItem[];
  label: string;
  reviewedAt: string;
  source: 'Single Review' | 'Batch Review';
  tone: 'pass' | 'review' | 'fail';
  type: string;
}

function hasSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function formatReviewDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate));
}

export function getReviewStatusLabel(status: ReviewStatus): string {
  switch (status) {
    case 'pass_candidate':
      return 'Pass';
    case 'needs_review':
      return 'Needs Review';
    case 'likely_fail':
      return 'Likely Fail';
    case 'failed_system':
      return 'System Error';
    case 'processing':
      return 'Processing';
    default:
      return 'Review';
  }
}

export function getReviewTone(status: ReviewStatus): 'pass' | 'review' | 'fail' {
  switch (status) {
    case 'pass_candidate':
      return 'pass';
    case 'needs_review':
    case 'processing':
      return 'review';
    case 'likely_fail':
    case 'failed_system':
      return 'fail';
    default:
      return 'review';
  }
}

export function getIssueCount(
  review: Pick<SessionReviewRecord, 'status' | 'summary'> | Pick<StatelessReviewResult, 'status' | 'summary'>,
): number {
  const count = review.summary.fail + review.summary.needs_review;
  if (count > 0) {
    return count;
  }

  return review.status === 'failed_system' ? 1 : 0;
}

export function loadSessionReviews(): SessionReviewRecord[] {
  if (!hasSessionStorage()) {
    return [];
  }

  const raw = window.sessionStorage.getItem(SESSION_REVIEWS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SessionReviewRecord[]) : [];
  } catch {
    return [];
  }
}

function writeSessionReviews(reviews: SessionReviewRecord[]): void {
  if (!hasSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(SESSION_REVIEWS_KEY, JSON.stringify(reviews));
}

export function getSessionReview(reviewId: string): SessionReviewRecord | null {
  return loadSessionReviews().find((review) => review.id === reviewId) ?? null;
}

export async function clearSessionReviews(): Promise<void> {
  const reviews = loadSessionReviews();
  const fileStoreIds = reviews
    .map((review) => review.label.file_store_id)
    .filter((value): value is string => Boolean(value));

  await clearReviewFiles(fileStoreIds);

  if (!hasSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(SESSION_REVIEWS_KEY);
  clearSessionBatches();
}

export function saveSessionReview(review: SessionReviewRecord): void {
  const existing = loadSessionReviews().filter((item) => item.id !== review.id);
  writeSessionReviews([review, ...existing].slice(0, 50));
}

export async function persistSessionReview(
  review: StatelessReviewResult,
  labelFile: File,
): Promise<SessionReviewRecord> {
  const fileStoreId = `review-file:${review.id}`;
  await saveReviewFile(fileStoreId, labelFile);

  const storedReview: SessionReviewRecord = {
    ...review,
    label: {
      ...review.label,
      file_store_id: fileStoreId,
    },
  };

  saveSessionReview(storedReview);
  return storedReview;
}

function issueSortWeight(field: FieldResult): number {
  if (field.status === 'fail') {
    return 0;
  }

  if (field.status === 'needs_review') {
    return 1;
  }

  return 2;
}

function toDashboardIssueItems(review: SessionReviewRecord): DashboardIssueItem[] {
  const issues: DashboardIssueItem[] = review.field_results
    .filter((field) => field.status === 'fail' || field.status === 'needs_review')
    .sort((left, right) => issueSortWeight(left) - issueSortWeight(right))
    .map((field) => ({
      applicationValue: formatApplicationValue(field),
      extractedValue: formatExtractedValue(field),
      fieldLabel: FIELD_LABELS[field.field_type],
      fieldType: field.field_type,
      reasonLabel: formatReasonLabel(field.reason_code),
      tone: field.status === 'fail' ? 'fail' : 'review',
    }));

  if (issues.length > 0) {
    return issues;
  }

  if (review.status === 'failed_system') {
    return [
      {
        applicationValue: 'Application data provided',
        extractedValue: review.error_message ?? 'The review did not complete successfully.',
        fieldLabel: 'System Error',
        fieldType: 'system_error',
        reasonLabel: 'Review could not be completed',
        tone: 'fail',
      },
    ];
  }

  return [];
}

export function toDashboardHistoryItems(reviews: SessionReviewRecord[]): DashboardHistoryItem[] {
  return reviews.map((review) => ({
    brand: review.application.brand_name,
    href: `/reviews/${review.id}`,
    id: review.id,
    issueCount: getIssueCount(review),
    issues: toDashboardIssueItems(review),
    label: getReviewStatusLabel(review.status),
    reviewedAt: formatReviewDate(review.created_at),
    source: review.source === 'batch' ? 'Batch Review' : 'Single Review',
    tone: getReviewTone(review.status),
    type: review.application.class_type,
  }));
}
