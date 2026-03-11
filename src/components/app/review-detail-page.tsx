'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionReviewRecord } from '@/lib/types';
import { getSessionReview } from '@/lib/review-session';
import { loadReviewFile } from '@/lib/review-session-files';
import { BackLink, PageShell, PlaceholderCard } from './chrome';
import { ReviewResultView } from './review-result';

export function ReviewDetailPage({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [review] = useState<SessionReviewRecord | null>(() =>
    typeof window === 'undefined' ? null : getSessionReview(reviewId)
  );

  useEffect(() => {
    const fileStoreId = review?.label.file_store_id;
    if (!fileStoreId) {
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      const blob = await loadReviewFile(fileStoreId);
      if (!blob || blob.type === 'application/pdf' || cancelled) {
        return;
      }

      objectUrl = URL.createObjectURL(blob);
      if (!cancelled) {
        setImageSrc(objectUrl);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [review]);

  if (!review) {
    return (
      <PageShell className="app-stage max-w-3xl space-y-10">
        <BackLink href="/">Back to Dashboard</BackLink>
        <PlaceholderCard
          title="Review Not Found"
          description="This review is not available in the current browser session."
        />
      </PageShell>
    );
  }

  return (
    <ReviewResultView
      backHref="/"
      imageSrc={imageSrc}
      onStartNew={() => router.push('/reviews/new')}
      review={review}
    />
  );
}
