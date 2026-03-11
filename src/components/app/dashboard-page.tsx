'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import {
  clearSessionReviews,
  loadSessionReviews,
  toDashboardHistoryItems,
  type DashboardHistoryItem,
} from '@/lib/review-session';
import { PageShell, SectionEyebrow } from './chrome';
import { PulseIndicator, StatusBadge } from './status';

const REVIEW_HISTORY_GRID_CLASS =
  'md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.35fr)_minmax(8.5rem,0.9fr)_minmax(8.5rem,0.95fr)_minmax(8rem,0.85fr)]';

function SingleReviewCard({ compact }: { compact: boolean }) {
  return (
    <Link
      href="/reviews/new"
      className={`group flex flex-col justify-center bg-surface text-left transition-colors hover:bg-hover ${
        compact ? 'h-48 p-12' : 'h-[450px] p-20'
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <PulseIndicator />
          <SectionEyebrow>One Application</SectionEyebrow>
        </div>
        <h2
          className={`display-serif leading-[1.04] tracking-[0.015em] ${
            compact ? 'text-[3.1rem]' : 'text-[5.2rem]'
          }`}
        >
          Single Review
        </h2>
        {!compact ? (
          <p className="max-w-md pt-4 text-[15px] italic leading-7 text-subtle">
            Compare one application form to one label image.
          </p>
        ) : null}
      </div>

      <div className="mt-8">
        <span className="app-link-underline">Begin Single Review</span>
      </div>
    </Link>
  );
}

function BatchReviewCard({ compact }: { compact: boolean }) {
  return (
    <Link
      href="/batches/new"
      className={`group flex flex-col justify-center bg-surface text-left transition-colors hover:bg-hover ${
        compact ? 'h-48 p-12' : 'h-[450px] p-20'
      }`}
    >
      <div className="space-y-4">
        <SectionEyebrow>Multiple Applications</SectionEyebrow>
        <h2
          className={`display-serif max-w-[18.5rem] leading-[1.08] tracking-[0.012em] ${
            compact ? 'text-[2.6rem]' : 'text-[3.75rem]'
          }`}
        >
          Batch Review
        </h2>
        {!compact ? (
          <p className="max-w-[13rem] pt-2 text-[13px] italic leading-6 text-subtle">
            Upload a CSV manifest and matching label images.
          </p>
        ) : null}
      </div>

      <div className="mt-8">
        <span className="app-link-underline">Begin Batch Review</span>
      </div>
    </Link>
  );
}

function QueueFilterButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-3 border px-4 py-2 text-left transition-colors ${
        active
          ? 'border-fg bg-fg text-surface'
          : 'border-border bg-surface text-fg hover:bg-hover'
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{label}</span>
      <span
        className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
          active ? 'text-surface/80' : 'text-muted'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function IssueCount({ count }: { count: number }) {
  return (
    <span className="display-serif text-[1.55rem] leading-none tracking-[0.01em] text-fg">
      {count}
    </span>
  );
}

function ReviewHistory({
  isClearing,
  items,
  onClearSession,
}: {
  isClearing: boolean;
  items: DashboardHistoryItem[];
  onClearSession: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'clear' | 'issues'>('all');

  const visibleItems =
    filter === 'clear'
      ? items.filter((item) => item.issueCount === 0)
      : filter === 'issues'
        ? items.filter((item) => item.issueCount > 0)
        : items;

  const clearCount = items.filter((item) => item.issueCount === 0).length;
  const issuesCount = items.length - clearCount;

  return (
    <section className="space-y-8">
      <div className="space-y-6 border-b border-border pb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <SectionEyebrow>Dashboard</SectionEyebrow>
            <div className="space-y-1">
              <h2 className="display-serif text-[2.15rem] leading-[1.08] tracking-[0.01em]">
                Review History
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-subtle">
                Scan completed reviews by issue count, then open the record for the
                field-by-field checklist.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <QueueFilterButton
              active={filter === 'all'}
              count={items.length}
              label="All"
              onClick={() => setFilter('all')}
            />
            <QueueFilterButton
              active={filter === 'clear'}
              count={clearCount}
              label="Pass"
              onClick={() => setFilter('clear')}
            />
            <QueueFilterButton
              active={filter === 'issues'}
              count={issuesCount}
              label="Issues"
              onClick={() => setFilter('issues')}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
            {visibleItems.length} visible {visibleItems.length === 1 ? 'review' : 'reviews'}
          </div>
          <button
            type="button"
            onClick={onClearSession}
            disabled={isClearing}
            className="app-outline-button disabled:cursor-not-allowed disabled:opacity-35"
          >
            {isClearing ? 'Clearing...' : 'Clear Session'}
          </button>
        </div>
      </div>

      <div className="app-grid-frame overflow-hidden">
        <div className={`hidden gap-px bg-border md:grid ${REVIEW_HISTORY_GRID_CLASS}`}>
          <div className="bg-surface-muted px-6 py-4 text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
            Application
          </div>
          <div className="bg-surface-muted px-6 py-4 text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
            Class / Type
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

        {visibleItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`group grid grid-cols-1 gap-px border-t border-border bg-border first:border-t-0 md:items-stretch ${REVIEW_HISTORY_GRID_CLASS}`}
          >
            <div className="space-y-3 bg-surface px-6 py-5 transition-colors group-hover:bg-bg md:space-y-2">
              <div className="flex items-center gap-3">
                <StatusBadge
                  label={item.source}
                  tone={item.tone}
                  labelClassName="tracking-[0.18em]"
                />
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                  {item.reviewedAt}
                </span>
              </div>
              <div className="space-y-1">
                <p className="display-serif text-[1.45rem] leading-[1.08] tracking-[0.01em]">
                  {item.brand}
                </p>
                <p className="text-xs leading-5 text-subtle">{item.id}</p>
              </div>
            </div>

            <div className="bg-surface px-6 py-5 transition-colors group-hover:bg-bg">
              <div className="space-y-1">
                <p className="app-data-label md:hidden">Class / Type</p>
                <p className="text-sm leading-6 text-fg">{item.type}</p>
              </div>
            </div>

            <div className="bg-surface px-6 py-5 transition-colors group-hover:bg-bg md:flex md:items-center md:justify-center">
              <div className="space-y-1 md:text-center">
                <p className="app-data-label md:hidden">Issues</p>
                <IssueCount count={item.issueCount} />
              </div>
            </div>

            <div className="bg-surface px-6 py-5 transition-colors group-hover:bg-bg md:flex md:items-center md:justify-center">
              <div className="space-y-1 md:text-center">
                <p className="app-data-label md:hidden">Status</p>
                <StatusBadge label={item.label} tone={item.tone} emphasize />
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
        ))}
      </div>
    </section>
  );
}

export function DashboardPage() {
  const [history, setHistory] = useState<DashboardHistoryItem[]>(() =>
    typeof window === 'undefined' ? [] : toDashboardHistoryItems(loadSessionReviews())
  );
  const [isClearing, setIsClearing] = useState(false);

  const hasHistory = history.length > 0;

  const handleClearSession = async () => {
    setIsClearing(true);
    try {
      await clearSessionReviews();
      setHistory([]);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <PageShell className="app-stage space-y-[var(--section-gap)]">
      {!hasHistory ? (
        <section className="app-grid-frame grid grid-cols-1 gap-px shadow-sm md:grid-cols-12">
          <div className="md:col-span-8">
            <SingleReviewCard compact={false} />
          </div>
          <div className="md:col-span-4 md:border-l md:border-border">
            <BatchReviewCard compact={false} />
          </div>
        </section>
      ) : null}

      {hasHistory ? (
        <ReviewHistory
          isClearing={isClearing}
          items={history}
          onClearSession={() => void handleClearSession()}
        />
      ) : null}
    </PageShell>
  );
}
