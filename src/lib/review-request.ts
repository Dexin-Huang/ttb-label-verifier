'use client';

import type { CreateApplicationRequest, StatelessReviewResult } from '@/lib/types';

export async function submitReviewRequest(
  application: CreateApplicationRequest,
  file: File,
): Promise<StatelessReviewResult> {
  const formData = new FormData();
  formData.append('application', JSON.stringify(application));
  formData.append('file', file);

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
