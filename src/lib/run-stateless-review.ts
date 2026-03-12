import { adjudicateFlaggedFields, extractLabelFields } from '@/lib/gemini';
import { runRuleEngine } from '@/lib/rules/engine';
import type {
  Application,
  CreateApplicationRequest,
  GeminiExtractionResult,
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

function runRules(
  application: Application,
  extraction: GeminiExtractionResult,
) {
  return runRuleEngine({
    application,
    extraction,
    context: {
      beverage_type: application.beverage_type,
      requires_government_warning: application.requires_government_warning,
    },
  });
}

function hasExtractionPatch(patch: Partial<GeminiExtractionResult>): boolean {
  return Object.values(patch).some((value) => value !== undefined);
}

export async function runStatelessReview(
  input: RunStatelessReviewInput,
): Promise<StatelessReviewResult> {
  const startTime = Date.now();
  const runtimeApplication = toRuntimeApplication(input.application);
  const createdAt = new Date().toISOString();

  try {
    const initialExtraction = await extractLabelFields(input.fileBuffer, input.mimeType);
    const initialRuleResult = runRules(runtimeApplication, initialExtraction);

    let finalExtraction = initialExtraction;
    let finalRuleResult = initialRuleResult;

    try {
      const adjudicationPatch = await adjudicateFlaggedFields(
        input.fileBuffer,
        input.mimeType,
        initialRuleResult.field_results,
      );

      if (hasExtractionPatch(adjudicationPatch)) {
        finalExtraction = {
          ...initialExtraction,
          ...adjudicationPatch,
        };
        finalRuleResult = runRules(runtimeApplication, finalExtraction);
      }
    } catch {
      finalExtraction = initialExtraction;
      finalRuleResult = initialRuleResult;
    }

    return {
      id: `review_${crypto.randomUUID()}`,
      created_at: createdAt,
      source: input.source ?? 'single',
      batch_id: input.batchId ?? null,
      status: finalRuleResult.overall_status,
      summary: finalRuleResult.summary,
      field_results: finalRuleResult.field_results,
      extraction_raw: finalExtraction,
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
