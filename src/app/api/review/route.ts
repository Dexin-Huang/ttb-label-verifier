import { NextRequest, NextResponse } from 'next/server';
import { errorMessage, errorResponse } from '@/lib/api-helpers';
import { runStatelessReview } from '@/lib/run-stateless-review';
import { RULE_CONFIG } from '@/lib/rules/config';
import { applicationSchema } from '@/lib/validation';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const applicationRaw = formData.get('application');
    const batchIdRaw = formData.get('batch_id');
    const file = formData.get('file');
    const sourceRaw = formData.get('source');

    if (typeof applicationRaw !== 'string') {
      return errorResponse('VALIDATION_ERROR', 'application is required', 400);
    }

    if (!(file instanceof File)) {
      return errorResponse('VALIDATION_ERROR', 'file is required', 400);
    }

    const source =
      sourceRaw === 'batch' || sourceRaw === 'single' ? sourceRaw : 'single';
    const batchId =
      typeof batchIdRaw === 'string' && batchIdRaw.trim().length > 0
        ? batchIdRaw.trim()
        : null;

    if (!RULE_CONFIG.ALLOWED_MIME_TYPES.includes(file.type)) {
      return errorResponse(
        'VALIDATION_ERROR',
        `Invalid file type: ${file.type}. Allowed: PNG, JPG, JPEG, PDF`,
        400,
      );
    }

    if (file.size > RULE_CONFIG.MAX_UPLOAD_BYTES) {
      return errorResponse('VALIDATION_ERROR', 'File must be under 25 MB', 400);
    }

    let parsedApplication: unknown;
    try {
      parsedApplication = JSON.parse(applicationRaw);
    } catch {
      return errorResponse('VALIDATION_ERROR', 'application must be valid JSON', 400);
    }

    const applicationResult = applicationSchema.safeParse(parsedApplication);
    if (!applicationResult.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'application payload is invalid',
        400,
        applicationResult.error.flatten(),
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const review = await runStatelessReview({
      application: applicationResult.data,
      fileBuffer: Buffer.from(arrayBuffer),
      mimeType: file.type,
      filename: file.name,
      fileSizeBytes: file.size,
      source,
      batchId,
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    return errorResponse('INTERNAL_ERROR', errorMessage(error), 500);
  }
}
