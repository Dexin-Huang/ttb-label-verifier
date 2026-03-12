import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/review/route';
import { runStatelessReview } from '@/lib/run-stateless-review';
import type { CreateApplicationRequest, StatelessReviewResult } from '@/lib/types';

vi.mock('@/lib/run-stateless-review', () => ({
  runStatelessReview: vi.fn(),
}));

const application: CreateApplicationRequest = {
  alcohol_content: '57.5% ALC./VOL. 115 PROOF',
  beverage_type: 'distilled_spirits',
  bottler_name_address: 'BOTTLED BY WHISKEY THIEF DISTILLING CO. FRANKFORT, KENTUCKY, USA',
  brand_name: 'GOOD TIMES',
  class_type: 'STRAIGHT RYE WHISKEY',
  country_of_origin: '',
  net_contents: '750ML',
  requires_government_warning: true,
};

const reviewResult: StatelessReviewResult = {
  application,
  batch_id: null,
  created_at: '2026-03-11T12:00:00.000Z',
  error_message: null,
  extraction_raw: null,
  field_results: [],
  id: 'review-1',
  label: {
    file_size_bytes: 5,
    file_store_id: null,
    filename: 'label.png',
    mime_type: 'image/png',
  },
  latency_ms: 1234,
  source: 'single',
  status: 'pass_candidate',
  summary: {
    fail: 0,
    needs_review: 0,
    pass: 9,
    skipped: 0,
  },
};

describe('POST /api/review', () => {
  const mockedRunStatelessReview = vi.mocked(runStatelessReview);

  beforeEach(() => {
    mockedRunStatelessReview.mockReset();
  });

  it('submits valid review input to the shared review pipeline', async () => {
    mockedRunStatelessReview.mockResolvedValue(reviewResult);

    const formData = new FormData();
    formData.set('application', JSON.stringify(application));
    formData.set('file', new File(['label'], 'label.png', { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/review', {
      body: formData,
      method: 'POST',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe('review-1');
    expect(mockedRunStatelessReview).toHaveBeenCalledWith(
      expect.objectContaining({
        application,
        batchId: null,
        filename: 'label.png',
        fileSizeBytes: 5,
        mimeType: 'image/png',
        source: 'single',
      }),
    );
  });

  it('rejects invalid application JSON before calling the review runner', async () => {
    const formData = new FormData();
    formData.set('application', '{not-json');
    formData.set('file', new File(['label'], 'label.png', { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/review', {
      body: formData,
      method: 'POST',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mockedRunStatelessReview).not.toHaveBeenCalled();
  });
});
