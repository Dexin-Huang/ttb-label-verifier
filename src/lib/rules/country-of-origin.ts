import type { FieldResult } from '@/lib/types';
import type { RuleInput } from './engine';
import { makeResult } from './helpers';
import { softNormalize } from './normalize';

export function evaluateCountryOfOrigin(input: RuleInput): FieldResult {
  const { application, extraction } = input;
  const appValue = application.country_of_origin;
  const extracted = extraction.country_of_origin;

  // Only apply if country_of_origin is provided in the application
  if (!appValue) {
    return makeResult(
      'country_of_origin', 'skipped', 'FIELD_NOT_APPLICABLE', null, null,
    );
  }

  if (!extracted?.raw_text) {
    return makeResult(
      'country_of_origin', 'fail', 'MISSING_ON_LABEL', appValue, null,
      null, null, {},
      0.90,
    );
  }

  // Low-confidence extraction → always route to human review
  if (extracted.confidence === 'low') {
    return makeResult(
      'country_of_origin', 'needs_review', 'EXTRACTION_LOW_CONFIDENCE',
      appValue, extracted.raw_text, null, null,
      { extraction_confidence: 'low' },
      0.40,
    );
  }

  const normApp = softNormalize(appValue);
  const normExt = softNormalize(extracted.raw_text);

  if (normApp === normExt) {
    return makeResult(
      'country_of_origin', 'pass', 'NORMALIZED_MATCH',
      appValue, extracted.raw_text, normApp, normExt,
      {},
      0.99,
    );
  }

  return makeResult(
    'country_of_origin', 'fail', 'VALUE_MISMATCH',
    appValue, extracted.raw_text, normApp, normExt,
  );
}
