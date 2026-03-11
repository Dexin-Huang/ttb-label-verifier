import { extractLabelFields } from '@/lib/gemini';
import { runRuleEngine } from '@/lib/rules/engine';
import type {
  Application,
  CreateApplicationRequest,
  ReviewStatus,
  StatelessReviewResult,
} from '@/lib/types';

const EMPTY_SUMMARY = { pass: 0, needs_review: 0, fail: 0, skipped: 0 };

function toRuntimeApplication(application: CreateApplicationRequest): Application {
  const now = new Date().toISOString();
  return {
    id: `runtime_${crypto.randomUUID()}`,
    beverage_type: application.beverage_type,
    brand_name: application.brand_name,
    class_type: application.class_type,
    alcohol_content: application.alcohol_content,
    net_contents: application.net_contents,
    bottler_name_address: application.bottler_name_address,
    country_of_origin: application.country_of_origin,
    requires_government_warning: application.requires_government_warning,
    created_at: now,
    updated_at: now,
  };
}

interface RunStatelessReviewInput {
  application: CreateApplicationRequest;
  fileBuffer: Buffer;
  mimeType: string;
  filename: string;
  fileSizeBytes: number;
  source?: 'single' | 'batch';
  batchId?: string | null;
}

export async function runStatelessReview(
  input: RunStatelessReviewInput,
): Promise<StatelessReviewResult> {
  const startTime = Date.now();
  const runtimeApplication = toRuntimeApplication(input.application);
  const createdAt = new Date().toISOString();

  try {
    const extraction = await extractLabelFields(input.fileBuffer, input.mimeType);
    const ruleResult = runRuleEngine({
      application: runtimeApplication,
      extraction,
      context: {
        beverage_type: runtimeApplication.beverage_type,
        requires_government_warning: runtimeApplication.requires_government_warning,
      },
    });

    return {
      id: `review_${crypto.randomUUID()}`,
      created_at: createdAt,
      source: input.source ?? 'single',
      batch_id: input.batchId ?? null,
      status: ruleResult.overall_status,
      summary: ruleResult.summary,
      field_results: ruleResult.field_results,
      extraction_raw: extraction,
      latency_ms: Date.now() - startTime,
      error_message: null,
      application: input.application,
      label: {
        filename: input.filename,
        mime_type: input.mimeType,
        file_size_bytes: input.fileSizeBytes,
        file_store_id: null,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Gemini extraction failed';

    return {
      id: `review_${crypto.randomUUID()}`,
      created_at: createdAt,
      source: input.source ?? 'single',
      batch_id: input.batchId ?? null,
      status: 'failed_system' as ReviewStatus,
      summary: EMPTY_SUMMARY,
      field_results: [],
      extraction_raw: null,
      latency_ms: Date.now() - startTime,
      error_message: errorMessage,
      application: input.application,
      label: {
        filename: input.filename,
        mime_type: input.mimeType,
        file_size_bytes: input.fileSizeBytes,
        file_store_id: null,
      },
    };
  }
}
