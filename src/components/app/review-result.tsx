'use client';

import Image from 'next/image';
import type {
  FieldResult,
  FieldStatus,
  FieldType,
  ReasonCode,
  SessionReviewRecord,
  StatelessReviewResult,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { BackLink, PageHeading, PageShell, SectionEyebrow } from './chrome';
import { StatusBadge } from './status';
import {
  getIssueCount,
  getReviewStatusLabel,
  getReviewTone,
} from '@/lib/review-session';

type ReviewRecord = SessionReviewRecord | StatelessReviewResult;

const FIELD_LABELS: Record<FieldType, string> = {
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

const REASON_LABELS: Partial<Record<ReasonCode, string>> = {
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

function formatRowApplicationValue(field: FieldResult): string {
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

function formatRowExtractedValue(field: FieldResult): string {
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

function fieldStatusMeta(status: FieldStatus): {
  badgeLabel: string;
  badgeTone: 'pass' | 'review' | 'fail';
} {
  switch (status) {
    case 'pass':
      return { badgeLabel: 'Pass', badgeTone: 'pass' };
    case 'needs_review':
      return { badgeLabel: 'Issue', badgeTone: 'review' };
    case 'fail':
      return { badgeLabel: 'Issue', badgeTone: 'fail' };
    case 'skipped':
      return { badgeLabel: 'N/A', badgeTone: 'review' };
    default:
      return { badgeLabel: 'Review', badgeTone: 'review' };
  }
}

function ReviewMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'pass' | 'review' | 'fail';
}) {
  const valueClass =
    tone === 'pass'
      ? 'text-pass'
      : tone === 'fail'
        ? 'text-fail'
        : tone === 'review'
          ? 'text-review'
          : 'text-fg';

  return (
    <div className="bg-surface px-6 py-7 md:px-8">
      <p className="app-data-label">{label}</p>
      <p className={cn('mt-3 display-serif text-[2.35rem] leading-none tracking-[0.01em]', valueClass)}>
        {value}
      </p>
    </div>
  );
}

function ReviewChecklistRow({ field }: { field: FieldResult }) {
  const statusMeta = fieldStatusMeta(field.status);
  const reasonLabel = REASON_LABELS[field.reason_code] ?? field.reason_code.replace(/_/g, ' ').toLowerCase();

  return (
    <div className="grid grid-cols-1 gap-px border-t border-border bg-border first:border-t-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(8rem,0.7fr)]">
      <div className="space-y-1 bg-surface px-6 py-5">
        <p className="app-data-label md:hidden">Field</p>
        <p className="text-sm leading-6 text-fg">{FIELD_LABELS[field.field_type]}</p>
        {field.status !== 'pass' ? (
          <p className="text-xs leading-5 text-muted">{reasonLabel}</p>
        ) : null}
      </div>

      <div className="bg-surface px-6 py-5">
        <p className="app-data-label md:hidden">Application Form</p>
        <p className="font-serif text-sm leading-6 text-fg">{formatRowApplicationValue(field)}</p>
      </div>

      <div className="bg-surface px-6 py-5">
        <p className="app-data-label md:hidden">Extracted From Label</p>
        <p className="font-serif text-sm leading-6 text-fg">{formatRowExtractedValue(field)}</p>
      </div>

      <div className="bg-surface px-6 py-5">
        <p className="app-data-label md:hidden">Status</p>
        <StatusBadge label={statusMeta.badgeLabel} tone={statusMeta.badgeTone} emphasize />
      </div>
    </div>
  );
}

export function ReviewResultView({
  backHref,
  imageSrc,
  onStartNew,
  review,
}: {
  backHref?: string;
  imageSrc: string | null;
  onStartNew?: () => void;
  review: ReviewRecord;
}) {
  const issueCount = getIssueCount(review);
  const statusTone = getReviewTone(review.status);
  const statusLabel = getReviewStatusLabel(review.status);
  const orderedFieldResults = review.field_results.filter((field) => field.status !== 'skipped').concat(
    review.field_results.filter((field) => field.status === 'skipped')
  );

  return (
    <PageShell className="app-stage space-y-12">
      {backHref ? <BackLink href={backHref}>Back to Dashboard</BackLink> : null}

      <PageHeading
        eyebrow="Single Review"
        title={issueCount === 0 ? 'Pass' : `${issueCount} ${issueCount === 1 ? 'Issue' : 'Issues'}`}
        subtitle="Compare the submitted application values to the extracted label text."
        actions={
          onStartNew ? (
            <button type="button" onClick={onStartNew} className="app-outline-button">
              New Review
            </button>
          ) : null
        }
      />

      <section className="app-grid-frame grid grid-cols-1 gap-px md:grid-cols-3">
        <ReviewMetric label="Issues" value={String(issueCount)} />
        <div className="bg-surface px-6 py-7 md:px-8">
          <p className="app-data-label">Status</p>
          <div className="mt-4">
            <StatusBadge label={statusLabel} tone={statusTone} emphasize />
          </div>
        </div>
        <ReviewMetric label="Latency" value={`${review.latency_ms} ms`} />
      </section>

      <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="space-y-4 lg:col-span-5">
          <SectionEyebrow>Label Image</SectionEyebrow>
          <div className="app-panel sticky top-28 p-6 shadow-[var(--shadow-paper)]">
            {imageSrc ? (
              <Image
                src={imageSrc}
                alt="Uploaded label"
                width={900}
                height={1200}
                unoptimized
                className="aspect-[3/4] w-full object-contain opacity-90 mix-blend-multiply"
              />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center bg-surface-muted text-sm text-muted">
                Preview unavailable
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-7">
          <div className="space-y-2">
            <SectionEyebrow>Checklist</SectionEyebrow>
            <p className="text-sm leading-6 text-subtle">
              Each row compares the submitted application form to the text extracted from
              the label.
            </p>
          </div>

          <div className="app-grid-frame overflow-hidden">
            <div className="hidden gap-px bg-border md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(8rem,0.7fr)]">
              <div className="bg-surface-muted px-6 py-4 text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
                Field
              </div>
              <div className="bg-surface-muted px-6 py-4 text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
                Application Form
              </div>
              <div className="bg-surface-muted px-6 py-4 text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
                Extracted From Label
              </div>
              <div className="bg-surface-muted px-6 py-4 text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
                Status
              </div>
            </div>

            {orderedFieldResults.map((field) => (
              <ReviewChecklistRow key={field.field_type} field={field} />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
