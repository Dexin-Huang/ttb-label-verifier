import type {
  ReviewStatus,
  SessionReviewRecord,
  StatelessReviewResult,
} from '@/lib/types';
import { clearReviewFiles, saveReviewFile } from '@/lib/review-session-files';

const SESSION_REVIEWS_KEY = 'label-verifier-session-reviews';

export interface DashboardHistoryItem {
  brand: string;
  href: string;
  id: string;
  issueCount: number;
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

export function toDashboardHistoryItems(reviews: SessionReviewRecord[]): DashboardHistoryItem[] {
  return reviews.map((review) => ({
    brand: review.application.brand_name,
    href: `/reviews/${review.id}`,
    id: review.id,
    issueCount: getIssueCount(review),
    label: getReviewStatusLabel(review.status),
    reviewedAt: formatReviewDate(review.created_at),
    source: review.source === 'batch' ? 'Batch Review' : 'Single Review',
    tone: getReviewTone(review.status),
    type: review.application.class_type,
  }));
}
