import type { FieldResult } from '@/lib/types';
import type { RuleInput } from './engine';
import { makeResult } from './helpers';
import { parseNetContents } from './normalize';
import { RULE_CONFIG } from './config';

export function evaluateNetContents(input: RuleInput): FieldResult {
  const { application, extraction } = input;
  const appValue = application.net_contents;
  const extracted = extraction.net_contents;

  if (!appValue) {
    return makeResult('net_contents', 'skipped', 'MISSING_IN_APPLICATION', null, null);
  }
  if (!extracted?.raw_text) {
    return makeResult('net_contents', 'fail', 'NO_EXTRACTED_CANDIDATE', appValue, null);
  }

  // Low-confidence extraction → always route to human review
  if (extracted.confidence === 'low') {
    return makeResult(
      'net_contents', 'needs_review', 'EXTRACTION_LOW_CONFIDENCE',
      appValue, extracted.raw_text, null, null,
      { extraction_confidence: 'low' },
      0.40,
    );
  }

  const appParsed = parseNetContents(appValue);
  const extParsed = parseNetContents(extracted.raw_text);

  if (appParsed.value_ml === null || extParsed.value_ml === null) {
    return makeResult(
      'net_contents', 'needs_review', 'PARSE_FAILED',
      appValue, extracted.raw_text,
      null, null, {},
      0.50,
    );
  }

  if (Math.abs(appParsed.value_ml - extParsed.value_ml) > RULE_CONFIG.NET_CONTENTS_TOLERANCE_ML) {
    return makeResult(
      'net_contents', 'fail', 'VALUE_MISMATCH',
      appValue, extracted.raw_text, null, null, {
        app_ml: appParsed.value_ml,
        ext_ml: extParsed.value_ml,
      },
      0.98,
    );
  }

  return makeResult(
    'net_contents', 'pass', 'VALUE_MATCH',
    appValue, extracted.raw_text, null, null, {
      value_ml: appParsed.value_ml,
    },
    0.99,
  );
}
