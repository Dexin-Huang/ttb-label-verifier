'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { downloadBatchCsv } from '@/lib/review-export';
import {
  getIssueCount,
  getReviewStatusLabel,
  getReviewTone,
} from '@/lib/review-session';
import type { ReviewStatus, SessionBatchItem, SessionBatchRecord, SessionReviewRecord } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BackLink, PageHeading, PageShell, SectionEyebrow } from './chrome';
import { STATUS_TONE_STYLES, StatusBadge } from './status';

function getBatchReview(
  item: SessionBatchItem,
  reviewMap: Map<string, SessionReviewRecord>,
): SessionReviewRecord | null {
  if (!item.review_id) {
    return null;
  }

  return reviewMap.get(item.review_id) ?? null;
}

function getItemStatus(item: SessionBatchItem, review: SessionReviewRecord | null): ReviewStatus {
  return review?.status ?? item.review_status ?? 'failed_system';
}

function getItemIssueCount(item: SessionBatchItem, review: SessionReviewRecord | null): number {
  if (review) {
    return getIssueCount(review);
  }

  return getIssueCount({
    status: item.review_status ?? 'failed_system',
    summary: item.review_summary ?? { fail: 0, needs_review: 0, pass: 0, skipped: 0 },
  });
}

function BatchStat({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: keyof typeof STATUS_TONE_STYLES;
}) {
  return (
    <div className="bg-surface p-8">
      <p className={cn('display-serif text-4xl', STATUS_TONE_STYLES[tone].accentTextClass)}>
        {count}
      </p>
      <p
        className={cn(
          'mt-2 text-[10px] font-bold uppercase tracking-[0.18em]',
          STATUS_TONE_STYLES[tone].accentTextClass
        )}
      >
        {label}
      </p>
    </div>
  );
}

function BatchResultRow({
  item,
  review,
}: {
  item: SessionBatchItem;
  review: SessionReviewRecord | null;
}) {
  const reviewStatus = getItemStatus(item, review);
  const issueCount = getItemIssueCount(item, review);
  const tone = getReviewTone(reviewStatus);
  const label = getReviewStatusLabel(reviewStatus);
  const href = review ? `/reviews/${review.id}` : '#';

  return (
    <Link
      href={href}
      className="group grid grid-cols-1 gap-px border-t border-border bg-border first:border-t-0 md:grid-cols-[minmax(0,2fr)_minmax(0,1.15fr)_minmax(7rem,0.7fr)_minmax(9rem,0.9fr)_minmax(7.5rem,0.85fr)]"
    >
      <div className="space-y-1 bg-surface px-6 py-5 transition-colors group-hover:bg-bg">
        <p className="display-serif text-[1.35rem] leading-[1.08] tracking-[0.01em] text-fg">
          {item.application.brand_name}
        </p>
        <p className="text-xs leading-5 text-subtle">{item.application.class_type}</p>
      </div>

      <div className="space-y-1 bg-surface px-6 py-5 transition-colors group-hover:bg-bg">
        <p className="app-data-label md:hidden">Label File</p>
        <p className="text-sm leading-6 text-fg">{item.label_filename}</p>
        <p className="text-xs leading-5 text-muted">
          {item.external_reference ?? `Row ${item.row_number}`}
        </p>
      </div>

      <div className="bg-surface px-6 py-5 transition-colors group-hover:bg-bg md:flex md:items-center md:justify-center">
        <div className="space-y-1 md:text-center">
          <p className="app-data-label md:hidden">Issues</p>
          <p className="display-serif text-[1.5rem] leading-none tracking-[0.01em] text-fg">
            {issueCount}
          </p>
        </div>
      </div>

      <div className="bg-surface px-6 py-5 transition-colors group-hover:bg-bg md:flex md:items-center md:justify-center">
        <div className="space-y-1 md:text-center">
          <p className="app-data-label md:hidden">Status</p>
          <StatusBadge label={label} tone={tone} emphasize />
        </div>
      </div>

      <div className="flex items-center justify-between gap-6 bg-surface px-6 py-5 transition-colors group-hover:bg-bg md:justify-center">
        <div className="space-y-1 md:text-center">
          <p className="app-data-label md:hidden">Open</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            View Review
          </p>
        </div>
        <ChevronRight
          size={18}
          className="text-border transition-colors group-hover:text-fg"
        />
      </div>
    </Link>
  );
}

export function BatchResultView({
  backHref,
  batch,
  onStartNew,
  reviews,
}: {
  backHref?: string;
  batch: SessionBatchRecord;
  onStartNew?: () => void;
  reviews: SessionReviewRecord[];
}) {
  const reviewMap = new Map(reviews.map((review) => [review.id, review]));
  const passCount = batch.items.filter((item) => getReviewTone(getItemStatus(item, getBatchReview(item, reviewMap))) === 'pass').length;
  const reviewCount = batch.items.filter((item) => getReviewTone(getItemStatus(item, getBatchReview(item, reviewMap))) === 'review').length;
  const failCount = batch.items.filter((item) => getReviewTone(getItemStatus(item, getBatchReview(item, reviewMap))) === 'fail').length;

  return (
    <PageShell className="app-stage max-w-6xl space-y-12">
      {backHref ? <BackLink href={backHref}>Back to Dashboard</BackLink> : null}

      <PageHeading
        eyebrow="Batch Review"
        title="Batch Review Results"
        subtitle={`${batch.processed_items} of ${batch.total_items} reviews completed from the CSV manifest and label images.`}
        actions={
          <>
            <button
              type="button"
              onClick={() => downloadBatchCsv(batch, reviewMap)}
              className="app-solid-button"
            >
              Export CSV
            </button>
            {onStartNew ? (
              <button type="button" onClick={onStartNew} className="app-outline-button">
                New Batch
              </button>
            ) : null}
          </>
        }
      />

      <section className="app-grid-frame grid grid-cols-1 gap-px md:grid-cols-3">
        <BatchStat count={passCount} label="Pass" tone="pass" />
        <BatchStat count={reviewCount} label="Needs Review" tone="review" />
        <BatchStat count={failCount} label="Likely Fail" tone="fail" />
      </section>

      <section className="space-y-6">
        <div className="space-y-1 border-b border-border pb-6">
          <SectionEyebrow>Batch Results</SectionEyebrow>
          <p className="text-sm leading-6 text-subtle">
            Each row below is a completed single review run from the uploaded batch.
          </p>
        </div>

        <div className="app-grid-frame overflow-hidden">
          <div className="hidden gap-px bg-border md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.15fr)_minmax(7rem,0.7fr)_minmax(9rem,0.9fr)_minmax(7.5rem,0.85fr)]">
            <div className="bg-surface-muted px-6 py-4 text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
              Application
            </div>
            <div className="bg-surface-muted px-6 py-4 text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
              Label File
            </div>
            <div className="bg-surface-muted px-6 py-4 text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
              Issues
            </div>
            <div className="bg-surface-muted px-6 py-4 text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
              Status
            </div>
            <div className="bg-surface-muted px-6 py-4 text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
              Record
            </div>
          </div>

          {batch.items.map((item) => (
            <BatchResultRow
              key={item.id}
              item={item}
              review={getBatchReview(item, reviewMap)}
            />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
