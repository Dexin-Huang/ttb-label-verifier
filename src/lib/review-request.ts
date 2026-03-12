'use client';

import type { CreateApplicationRequest, StatelessReviewResult } from '@/lib/types';

interface SubmitReviewOptions {
  batchId?: string | null;
  source?: 'single' | 'batch';
}

export async function submitReviewRequest(
  application: CreateApplicationRequest,
  file: File,
  options?: SubmitReviewOptions,
): Promise<StatelessReviewResult> {
  const formData = new FormData();
  formData.append('application', JSON.stringify(application));
  formData.append('file', file);
  if (options?.source) {
    formData.append('source', options.source);
  }
  if (options?.batchId) {
    formData.append('batch_id', options.batchId);
  }

  const response = await fetch('/api/review', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: { message: 'Review failed' } }));
    throw new Error(payload.error?.message ?? 'Review failed');
  }

  return response.json() as Promise<StatelessReviewResult>;
}
