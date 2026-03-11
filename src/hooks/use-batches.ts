'use client';

import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSessionReviews } from '@/components/layout/SessionReviewsProvider';
import { downloadBatchCsv } from '@/lib/review-export';
import type { SessionBatchItem, SessionBatchRecord, SessionReviewRecord } from '@/lib/types';

export type BatchItemDetail = SessionBatchItem;

interface CreateBatchInput {
  manifest: File;
  files: File[];
}

interface UseBatchResult {
  data: SessionBatchRecord | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function useBatches() {
  const { batches, isHydrated } = useSessionReviews();

  return useMemo(
    () => ({
      data: { items: batches, page: 1, pageSize: batches.length, total: batches.length },
      isLoading: !isHydrated,
      error: null,
    }),
    [batches, isHydrated],
  );
}

export function useBatch(id: string): UseBatchResult {
  const { getBatch, isHydrated } = useSessionReviews();
  return {
    data: getBatch(id),
    isLoading: !isHydrated,
    error: null,
  };
}

export function useCreateBatch() {
  const { startBatch } = useSessionReviews();

  return useMutation<SessionBatchRecord, Error, CreateBatchInput>({
    mutationFn: async ({ manifest, files }) => {
      const manifestText = await manifest.text();
      return startBatch({
        name: manifest.name.replace(/\.csv$/i, '') || 'Batch Upload',
        manifestText,
        files,
      });
    },
  });
}

function reviewMapFromReviews(reviews: SessionReviewRecord[]): Map<string, SessionReviewRecord> {
  return new Map(reviews.map((review) => [review.id, review]));
}

export function useExportBatch() {
  const { reviews } = useSessionReviews();

  return useMutation<void, Error, SessionBatchRecord>({
    mutationFn: async (batch) => {
      const reviewMap = reviewMapFromReviews(reviews);
      downloadBatchCsv(batch, reviewMap);
    },
  });
}
