import type { FieldResult } from '@/lib/types';
import type { RuleInput } from './engine';
import { makeResult } from './helpers';
import { parseAlcoholContent } from './normalize';
import { RULE_CONFIG } from './config';

export function evaluateAlcoholContent(input: RuleInput): FieldResult {
  const { application, extraction } = input;
  const appValue = application.alcohol_content;
  const extracted = extraction.alcohol_content;

  if (!appValue) {
    return makeResult('alcohol_content', 'skipped', 'MISSING_IN_APPLICATION', null, null);
  }
  if (!extracted?.raw_text) {
    return makeResult('alcohol_content', 'fail', 'NO_EXTRACTED_CANDIDATE', appValue, null);
  }

  // Low-confidence extraction → always route to human review
  if (extracted.confidence === 'low') {
    return makeResult(
      'alcohol_content', 'needs_review', 'EXTRACTION_LOW_CONFIDENCE',
      appValue, extracted.raw_text, null, null,
      { extraction_confidence: 'low' },
      0.40,
    );
  }

  const appParsed = parseAlcoholContent(appValue);
  const extParsed = parseAlcoholContent(extracted.raw_text);

  if (appParsed.abv === null || extParsed.abv === null) {
    return makeResult(
      'alcohol_content', 'needs_review', 'PARSE_FAILED',
      appValue, extracted.raw_text,
      null, null, {},
      0.50,
    );
  }

  if (Math.abs(appParsed.abv - extParsed.abv) > RULE_CONFIG.ABV_TOLERANCE) {
    return makeResult(
      'alcohol_content', 'fail', 'VALUE_MISMATCH',
      appValue, extracted.raw_text, null, null, {
        app_abv: appParsed.abv,
        ext_abv: extParsed.abv,
      },
      0.98,
    );
  }

  // ABV matches — check proof if both present
  if (
    appParsed.proof !== null &&
    extParsed.proof !== null &&
    appParsed.proof !== extParsed.proof
  ) {
    return makeResult(
      'alcohol_content', 'fail', 'VALUE_MISMATCH',
      appValue, extracted.raw_text, null, null, {
        app_proof: appParsed.proof,
        ext_proof: extParsed.proof,
      },
      0.98,
    );
  }

  if (appParsed.proof !== null && extParsed.proof === null) {
    return makeResult(
      'alcohol_content', 'needs_review', 'PARTIAL_MATCH_REVIEW',
      appValue, extracted.raw_text, null, null, {
        note: 'Proof present in application but not found on label',
      },
    );
  }

  return makeResult(
    'alcohol_content', 'pass', 'VALUE_MATCH',
    appValue, extracted.raw_text, null, null, {
      abv: appParsed.abv,
    },
    0.99,
  );
}
