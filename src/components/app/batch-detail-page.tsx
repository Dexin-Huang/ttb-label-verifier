'use client';

import { useState } from 'react';
import { getSessionBatch } from '@/lib/review-batches';
import { loadSessionReviews } from '@/lib/review-session';
import type { SessionBatchRecord, SessionReviewRecord } from '@/lib/types';
import { BatchResultView } from './batch-result-view';
import { BackLink, PageShell, PlaceholderCard } from './chrome';

export function BatchDetailPage({ batchId }: { batchId: string }) {
  const [batch] = useState<SessionBatchRecord | null>(() =>
    typeof window === 'undefined' ? null : getSessionBatch(batchId)
  );
  const [reviews] = useState<SessionReviewRecord[]>(() =>
    typeof window === 'undefined' ? [] : loadSessionReviews()
  );

  if (!batch) {
    return (
      <PageShell className="app-stage max-w-3xl space-y-10">
        <BackLink href="/">Back to Dashboard</BackLink>
        <PlaceholderCard
          title="Batch Not Found"
          description="This batch is not available in the current browser session."
        />
      </PageShell>
    );
  }

  return <BatchResultView backHref="/" batch={batch} reviews={reviews} />;
}
