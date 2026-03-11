import * as fuzzball from 'fuzzball';
import type { FieldResult, FieldType, ExtractedField } from '@/lib/types';
import type { RuleInput } from './engine';
import { makeResult } from './helpers';
import { softNormalize } from './normalize';

/**
 * Evaluate a text field using normalize-then-fuzzy-match logic.
 * Shared by brand_name, class_type, and bottler_name_address rules.
 *
 * If the Gemini extraction confidence is 'low', the field is routed
 * to needs_review regardless of fuzzy match quality.
 */
export function evaluateFuzzyTextField(
  input: RuleInput,
  fieldType: FieldType,
  appValue: string | null | undefined,
  extractedField: ExtractedField | null | undefined,
  fuzzyThreshold: number,
): FieldResult {
  if (!appValue) {
    return makeResult(fieldType, 'skipped', 'MISSING_IN_APPLICATION', null, null);
  }
  if (!extractedField?.raw_text) {
    return makeResult(fieldType, 'fail', 'NO_EXTRACTED_CANDIDATE', appValue, null);
  }

  const extractedRawText = extractedField.raw_text;

  // Low-confidence extraction → always route to human review
  if (extractedField.confidence === 'low') {
    return makeResult(
      fieldType, 'needs_review', 'EXTRACTION_LOW_CONFIDENCE',
      appValue, extractedRawText, null, null,
      { extraction_confidence: extractedField.confidence },
      0.40,
    );
  }

  const normApp = softNormalize(appValue);
  const normExt = softNormalize(extractedRawText);

  if (normApp === normExt) {
    return makeResult(
      fieldType, 'pass', 'NORMALIZED_MATCH',
      appValue, extractedRawText, normApp, normExt,
      {},
      0.99,
    );
  }

  const similarity = fuzzball.ratio(normApp, normExt) / 100;

  if (similarity >= fuzzyThreshold) {
    return makeResult(
      fieldType, 'needs_review', 'PARTIAL_MATCH_REVIEW',
      appValue, extractedRawText, normApp, normExt, { similarity },
      similarity,
    );
  }

  return makeResult(
    fieldType, 'fail', 'VALUE_MISMATCH',
    appValue, extractedRawText, normApp, normExt, { similarity },
    0.95,
  );
}
