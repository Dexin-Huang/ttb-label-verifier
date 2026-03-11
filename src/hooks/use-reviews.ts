'use client';

import { useMutation } from '@tanstack/react-query';
import { submitReviewRequest } from '@/lib/review-request';
import type { RunSingleReviewRequest, StatelessReviewResult } from '@/lib/types';

export function useRunReview() {
  return useMutation({
    mutationFn: (data: RunSingleReviewRequest): Promise<StatelessReviewResult> =>
      submitReviewRequest(data.application, data.file),
  });
}
