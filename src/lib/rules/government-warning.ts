import * as fuzzball from 'fuzzball';
import type { FieldResult } from '@/lib/types';
import type { RuleInput } from './engine';
import { makeResult } from './helpers';
import { RULE_CONFIG } from './config';

export const CANONICAL_WARNING_TEXT =
  '(1) According to the Surgeon General, women should not drink alcoholic beverages during ' +
  'pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages ' +
  'impairs your ability to drive a car or operate machinery, and may cause health problems.';

/**
 * Sub-rule 1: Check whether the government warning is present on the label.
 * Fails if required and not found.
 */
export function evaluateWarningPresence(input: RuleInput): FieldResult {
  if (!input.context.requires_government_warning) {
    return makeResult(
      'government_warning_presence', 'skipped', 'FIELD_NOT_APPLICABLE', null, null,
    );
  }

  const warning = input.extraction.government_warning;

  if (!warning?.present) {
    return makeResult(
      'government_warning_presence', 'fail', 'WARNING_MISSING', 'required', null,
    );
  }

  return makeResult(
    'government_warning_presence', 'pass', 'EXACT_MATCH', 'required', 'present',
    null, null, {},
    0.99,
  );
}

/**
 * Sub-rule 2: Compare extracted warning body text against the canonical
 * government warning statement. Uses fuzzy matching with a 0.95 threshold.
 */
export function evaluateWarningText(input: RuleInput): FieldResult {
  if (!input.context.requires_government_warning) {
    return makeResult(
      'government_warning_text', 'skipped', 'FIELD_NOT_APPLICABLE', null, null,
    );
  }

  const warning = input.extraction.government_warning;

  if (!warning?.present || !warning.body_text) {
    return makeResult(
      'government_warning_text', 'skipped', 'NO_EXTRACTED_CANDIDATE', null, null,
    );
  }

  // Low-confidence extraction → always route to human review
  if (warning.confidence === 'low') {
    return makeResult(
      'government_warning_text', 'needs_review', 'EXTRACTION_LOW_CONFIDENCE',
      CANONICAL_WARNING_TEXT, warning.body_text, null, null,
      { extraction_confidence: 'low' },
      0.40,
    );
  }

  // Normalize whitespace for comparison but preserve wording
  const normalizeForComparison = (s: string) =>
    s.replace(/\s+/g, ' ').trim().toLowerCase();

  const canonicalNorm = normalizeForComparison(CANONICAL_WARNING_TEXT);
  const extractedNorm = normalizeForComparison(warning.body_text);

  if (canonicalNorm === extractedNorm) {
    return makeResult(
      'government_warning_text', 'pass', 'EXACT_MATCH',
      CANONICAL_WARNING_TEXT, warning.body_text,
      null, null, {},
      0.99,
    );
  }

  // Check similarity for near-matches (possible OCR artifacts)
  const similarity = fuzzball.ratio(canonicalNorm, extractedNorm) / 100;

  if (similarity >= RULE_CONFIG.WARNING_TEXT_FUZZY_THRESHOLD) {
    return makeResult(
      'government_warning_text', 'needs_review', 'PARTIAL_MATCH_REVIEW',
      CANONICAL_WARNING_TEXT, warning.body_text, null, null, { similarity },
      similarity,
    );
  }

  return makeResult(
    'government_warning_text', 'fail', 'WARNING_TEXT_MISMATCH',
    CANONICAL_WARNING_TEXT, warning.body_text, null, null, { similarity },
  );
}

/**
 * Sub-rule 3: Check that the warning heading is all-caps and bold.
 * Bold detection from Gemini: true → pass, false → fail, null → needs_review.
 */
export function evaluateWarningHeading(input: RuleInput): FieldResult {
  if (!input.context.requires_government_warning) {
    return makeResult(
      'government_warning_heading', 'skipped', 'FIELD_NOT_APPLICABLE', null, null,
    );
  }

  const warning = input.extraction.government_warning;

  if (!warning?.present || !warning.heading_text) {
    return makeResult(
      'government_warning_heading', 'skipped', 'NO_EXTRACTED_CANDIDATE', null, null,
    );
  }

  // Low-confidence extraction → always route to human review
  if (warning.confidence === 'low') {
    return makeResult(
      'government_warning_heading', 'needs_review', 'EXTRACTION_LOW_CONFIDENCE',
      'GOVERNMENT WARNING:', warning.heading_text, null, null,
      { extraction_confidence: 'low' },
      0.40,
    );
  }

  // Check all-caps
  const heading = warning.heading_text.trim();
  const isAllCaps = heading === heading.toUpperCase() && /[A-Z]/.test(heading);

  if (!isAllCaps) {
    return makeResult(
      'government_warning_heading', 'fail', 'WARNING_HEADING_NOT_ALL_CAPS',
      'GOVERNMENT WARNING:', heading,
      null, null, {},
      0.95,
    );
  }

  // Check bold
  if (warning.heading_appears_bold === true) {
    return makeResult(
      'government_warning_heading', 'pass', 'EXACT_MATCH',
      'GOVERNMENT WARNING:', heading, null, null, { bold: true },
      0.99,
    );
  }

  if (warning.heading_appears_bold === false) {
    return makeResult(
      'government_warning_heading', 'fail', 'WARNING_HEADING_NOT_BOLD',
      'GOVERNMENT WARNING:', heading, null, null, { bold: false },
      0.95,
    );
  }

  // Bold uncertain — do not silently pass
  return makeResult(
    'government_warning_heading', 'needs_review', 'WARNING_BOLD_UNCERTAIN',
    'GOVERNMENT WARNING:', heading, null, null, { bold: null },
    0.50,
  );
}
