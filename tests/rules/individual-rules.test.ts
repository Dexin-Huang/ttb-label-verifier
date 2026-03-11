import { describe, it, expect } from 'vitest';
import type { Application, GeminiExtractionResult } from '@/lib/types';
import type { RuleInput } from '@/lib/rules/engine';
import { evaluateBrandName } from '@/lib/rules/brand-name';
import { evaluateClassType } from '@/lib/rules/class-type';
import { evaluateAlcoholContent } from '@/lib/rules/alcohol-content';
import { evaluateNetContents } from '@/lib/rules/net-contents';
import { evaluateBottlerAddress } from '@/lib/rules/bottler-address';
import { evaluateCountryOfOrigin } from '@/lib/rules/country-of-origin';
import {
  evaluateWarningPresence,
  evaluateWarningText,
  evaluateWarningHeading,
  CANONICAL_WARNING_TEXT,
} from '@/lib/rules/government-warning';

// ---------------------------------------------------------------------------
// Helper: build a minimal RuleInput from partial overrides
// ---------------------------------------------------------------------------

const defaultApplication: Application = {
  id: 'test-app-id',
  beverage_type: 'distilled_spirits',
  brand_name: 'OLD TOM DISTILLERY',
  class_type: 'Kentucky Straight Bourbon Whiskey',
  alcohol_content: '45% Alc./Vol. (90 Proof)',
  net_contents: '750 mL',
  bottler_name_address: 'Old Tom Distillery, Bardstown, KY',
  country_of_origin: 'United States',
  requires_government_warning: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const defaultExtraction: GeminiExtractionResult = {
  brand_name: { raw_text: 'OLD TOM DISTILLERY', confidence: 'high' },
  class_type: { raw_text: 'Kentucky Straight Bourbon Whiskey', confidence: 'high' },
  alcohol_content: { raw_text: '45% Alc./Vol. (90 Proof)', confidence: 'high' },
  net_contents: { raw_text: '750 mL', confidence: 'high' },
  bottler_name_address: { raw_text: 'Old Tom Distillery, Bardstown, KY', confidence: 'high' },
  country_of_origin: { raw_text: 'United States', confidence: 'high' },
  government_warning: {
    present: true,
    full_text: 'GOVERNMENT WARNING: ' + CANONICAL_WARNING_TEXT,
    heading_text: 'GOVERNMENT WARNING:',
    heading_appears_bold: true,
    heading_appears_all_caps: true,
    body_text: CANONICAL_WARNING_TEXT,
    confidence: 'high',
  },
};

function buildInput(overrides: {
  application?: Partial<Application>;
  extraction?: Partial<GeminiExtractionResult>;
  context?: Partial<RuleInput['context']>;
} = {}): RuleInput {
  return {
    application: { ...defaultApplication, ...overrides.application },
    extraction: { ...defaultExtraction, ...overrides.extraction },
    context: {
      beverage_type: 'distilled_spirits',
      requires_government_warning: true,
      ...overrides.context,
    },
  };
}

// ===========================================================================
// Brand Name
// ===========================================================================
describe('evaluateBrandName', () => {
  it('exact match after normalization -> pass, NORMALIZED_MATCH', () => {
    const input = buildInput({
      application: { brand_name: 'OLD TOM DISTILLERY' },
      extraction: { brand_name: { raw_text: 'Old Tom Distillery', confidence: 'high' } },
    });
    const result = evaluateBrandName(input);
    expect(result.status).toBe('pass');
    expect(result.reason_code).toBe('NORMALIZED_MATCH');
  });

  it('partial match above threshold -> needs_review, PARTIAL_MATCH_REVIEW', () => {
    const input = buildInput({
      application: { brand_name: 'OLD TOM DISTILLERY' },
      extraction: { brand_name: { raw_text: 'Old Tom Distillry', confidence: 'high' } },
    });
    const result = evaluateBrandName(input);
    expect(result.status).toBe('needs_review');
    expect(result.reason_code).toBe('PARTIAL_MATCH_REVIEW');
  });

  it('mismatch below threshold -> fail, VALUE_MISMATCH', () => {
    const input = buildInput({
      application: { brand_name: 'OLD TOM DISTILLERY' },
      extraction: { brand_name: { raw_text: 'Completely Different Brand', confidence: 'high' } },
    });
    const result = evaluateBrandName(input);
    expect(result.status).toBe('fail');
    expect(result.reason_code).toBe('VALUE_MISMATCH');
  });

  it('missing in application -> skipped', () => {
    const input = buildInput({
      application: { brand_name: null },
    });
    const result = evaluateBrandName(input);
    expect(result.status).toBe('skipped');
    expect(result.reason_code).toBe('MISSING_IN_APPLICATION');
  });
});

// ===========================================================================
// Class Type
// ===========================================================================
describe('evaluateClassType', () => {
  it('normalized match -> pass', () => {
    const input = buildInput({
      application: { class_type: 'Kentucky Straight Bourbon Whiskey' },
      extraction: { class_type: { raw_text: 'kentucky straight bourbon whiskey', confidence: 'high' } },
    });
    const result = evaluateClassType(input);
    expect(result.status).toBe('pass');
    expect(result.reason_code).toBe('NORMALIZED_MATCH');
  });

  it('partial match -> needs_review', () => {
    const input = buildInput({
      application: { class_type: 'Kentucky Straight Bourbon Whiskey' },
      extraction: { class_type: { raw_text: 'Kentucky Straight Bourbon Whisky', confidence: 'high' } },
    });
    const result = evaluateClassType(input);
    expect(result.status).toBe('needs_review');
    expect(result.reason_code).toBe('PARTIAL_MATCH_REVIEW');
  });

  it('mismatch -> fail', () => {
    const input = buildInput({
      application: { class_type: 'Kentucky Straight Bourbon Whiskey' },
      extraction: { class_type: { raw_text: 'White Rum', confidence: 'high' } },
    });
    const result = evaluateClassType(input);
    expect(result.status).toBe('fail');
    expect(result.reason_code).toBe('VALUE_MISMATCH');
  });
});

// ===========================================================================
// Alcohol Content
// ===========================================================================
describe('evaluateAlcoholContent', () => {
  it('ABV match -> pass, VALUE_MATCH', () => {
    const input = buildInput({
      application: { alcohol_content: '45% Alc./Vol. (90 Proof)' },
      extraction: { alcohol_content: { raw_text: '45% Alc./Vol. (90 Proof)', confidence: 'high' } },
    });
    const result = evaluateAlcoholContent(input);
    expect(result.status).toBe('pass');
    expect(result.reason_code).toBe('VALUE_MATCH');
  });

  it('ABV mismatch -> fail, VALUE_MISMATCH', () => {
    const input = buildInput({
      application: { alcohol_content: '45% Alc./Vol.' },
      extraction: { alcohol_content: { raw_text: '40% Alc./Vol.', confidence: 'high' } },
    });
    const result = evaluateAlcoholContent(input);
    expect(result.status).toBe('fail');
    expect(result.reason_code).toBe('VALUE_MISMATCH');
  });

  it('proof mismatch -> fail', () => {
    const input = buildInput({
      application: { alcohol_content: '45% Alc./Vol. (90 Proof)' },
      extraction: { alcohol_content: { raw_text: '45% Alc./Vol. (80 Proof)', confidence: 'high' } },
    });
    const result = evaluateAlcoholContent(input);
    expect(result.status).toBe('fail');
    expect(result.reason_code).toBe('VALUE_MISMATCH');
  });

  it('unparseable -> needs_review, PARSE_FAILED', () => {
    const input = buildInput({
      application: { alcohol_content: '45% Alc./Vol.' },
      extraction: { alcohol_content: { raw_text: 'no alcohol info', confidence: 'high' } },
    });
    const result = evaluateAlcoholContent(input);
    expect(result.status).toBe('needs_review');
    expect(result.reason_code).toBe('PARSE_FAILED');
  });
});

// ===========================================================================
// Net Contents
// ===========================================================================
describe('evaluateNetContents', () => {
  it('mL match -> pass', () => {
    const input = buildInput({
      application: { net_contents: '750 mL' },
      extraction: { net_contents: { raw_text: '750 mL', confidence: 'high' } },
    });
    const result = evaluateNetContents(input);
    expect(result.status).toBe('pass');
    expect(result.reason_code).toBe('VALUE_MATCH');
  });

  it('unit conversion match (L to mL) -> pass', () => {
    const input = buildInput({
      application: { net_contents: '1.75 L' },
      extraction: { net_contents: { raw_text: '1750 mL', confidence: 'high' } },
    });
    const result = evaluateNetContents(input);
    expect(result.status).toBe('pass');
    expect(result.reason_code).toBe('VALUE_MATCH');
  });

  it('mismatch -> fail', () => {
    const input = buildInput({
      application: { net_contents: '750 mL' },
      extraction: { net_contents: { raw_text: '375 mL', confidence: 'high' } },
    });
    const result = evaluateNetContents(input);
    expect(result.status).toBe('fail');
    expect(result.reason_code).toBe('VALUE_MISMATCH');
  });
});

// ===========================================================================
// Bottler Address
// ===========================================================================
describe('evaluateBottlerAddress', () => {
  it('normalized match -> pass', () => {
    const input = buildInput({
      application: { bottler_name_address: 'Old Tom Distillery, Bardstown, KY' },
      extraction: { bottler_name_address: { raw_text: 'old tom distillery, bardstown, ky', confidence: 'high' } },
    });
    const result = evaluateBottlerAddress(input);
    expect(result.status).toBe('pass');
    expect(result.reason_code).toBe('NORMALIZED_MATCH');
  });

  it('partial match -> needs_review', () => {
    const input = buildInput({
      application: { bottler_name_address: 'Old Tom Distillery, Bardstown, KY' },
      extraction: { bottler_name_address: { raw_text: 'Old Tom Distillery, Bardstown', confidence: 'high' } },
    });
    const result = evaluateBottlerAddress(input);
    expect(result.status).toBe('needs_review');
    expect(result.reason_code).toBe('PARTIAL_MATCH_REVIEW');
  });

  it('mismatch -> fail', () => {
    const input = buildInput({
      application: { bottler_name_address: 'Old Tom Distillery, Bardstown, KY' },
      extraction: { bottler_name_address: { raw_text: 'Acme Corp, Springfield, IL', confidence: 'high' } },
    });
    const result = evaluateBottlerAddress(input);
    expect(result.status).toBe('fail');
    expect(result.reason_code).toBe('VALUE_MISMATCH');
  });
});

// ===========================================================================
// Country of Origin
// ===========================================================================
describe('evaluateCountryOfOrigin', () => {
  it('match -> pass', () => {
    const input = buildInput({
      application: { country_of_origin: 'United States' },
      extraction: { country_of_origin: { raw_text: 'UNITED STATES', confidence: 'high' } },
    });
    const result = evaluateCountryOfOrigin(input);
    expect(result.status).toBe('pass');
    expect(result.reason_code).toBe('NORMALIZED_MATCH');
  });

  it('missing on label -> fail', () => {
    const input = buildInput({
      application: { country_of_origin: 'United States' },
      extraction: { country_of_origin: null },
    });
    const result = evaluateCountryOfOrigin(input);
    expect(result.status).toBe('fail');
    expect(result.reason_code).toBe('MISSING_ON_LABEL');
  });

  it('not provided in application -> skipped', () => {
    const input = buildInput({
      application: { country_of_origin: '' },
    });
    const result = evaluateCountryOfOrigin(input);
    expect(result.status).toBe('skipped');
    expect(result.reason_code).toBe('FIELD_NOT_APPLICABLE');
  });
});

// ===========================================================================
// Government Warning - Presence
// ===========================================================================
describe('evaluateWarningPresence', () => {
  it('present when required -> pass', () => {
    const input = buildInput({
      context: { requires_government_warning: true },
    });
    const result = evaluateWarningPresence(input);
    expect(result.status).toBe('pass');
    expect(result.reason_code).toBe('EXACT_MATCH');
  });

  it('missing when required -> fail', () => {
    const input = buildInput({
      extraction: {
        government_warning: {
          present: false,
          full_text: null,
          heading_text: null,
          heading_appears_bold: null,
          heading_appears_all_caps: null,
          body_text: null,
          confidence: 'high',
        },
      },
      context: { requires_government_warning: true },
    });
    const result = evaluateWarningPresence(input);
    expect(result.status).toBe('fail');
    expect(result.reason_code).toBe('WARNING_MISSING');
  });

  it('not required -> skipped', () => {
    const input = buildInput({
      context: { requires_government_warning: false },
    });
    const result = evaluateWarningPresence(input);
    expect(result.status).toBe('skipped');
    expect(result.reason_code).toBe('FIELD_NOT_APPLICABLE');
  });
});

// ===========================================================================
// Government Warning - Text
// ===========================================================================
describe('evaluateWarningText', () => {
  it('canonical text match -> pass', () => {
    const input = buildInput({
      extraction: {
        government_warning: {
          present: true,
          full_text: 'GOVERNMENT WARNING: ' + CANONICAL_WARNING_TEXT,
          heading_text: 'GOVERNMENT WARNING:',
          heading_appears_bold: true,
          heading_appears_all_caps: true,
          body_text: CANONICAL_WARNING_TEXT,
          confidence: 'high',
        },
      },
      context: { requires_government_warning: true },
    });
    const result = evaluateWarningText(input);
    expect(result.status).toBe('pass');
    expect(result.reason_code).toBe('EXACT_MATCH');
  });

  it('near-match (high similarity) -> needs_review', () => {
    // Introduce a minor OCR-style typo that keeps similarity >= 0.95
    const nearText = CANONICAL_WARNING_TEXT.replace('Surgeon General', 'Surgeon Generai');
    const input = buildInput({
      extraction: {
        government_warning: {
          present: true,
          full_text: 'GOVERNMENT WARNING: ' + nearText,
          heading_text: 'GOVERNMENT WARNING:',
          heading_appears_bold: true,
          heading_appears_all_caps: true,
          body_text: nearText,
          confidence: 'high',
        },
      },
      context: { requires_government_warning: true },
    });
    const result = evaluateWarningText(input);
    expect(result.status).toBe('needs_review');
    expect(result.reason_code).toBe('PARTIAL_MATCH_REVIEW');
  });

  it('mismatch -> fail', () => {
    const input = buildInput({
      extraction: {
        government_warning: {
          present: true,
          full_text: 'GOVERNMENT WARNING: This is totally wrong text.',
          heading_text: 'GOVERNMENT WARNING:',
          heading_appears_bold: true,
          heading_appears_all_caps: true,
          body_text: 'This is totally wrong text.',
          confidence: 'high',
        },
      },
      context: { requires_government_warning: true },
    });
    const result = evaluateWarningText(input);
    expect(result.status).toBe('fail');
    expect(result.reason_code).toBe('WARNING_TEXT_MISMATCH');
  });
});

// ===========================================================================
// Government Warning - Heading
// ===========================================================================
describe('evaluateWarningHeading', () => {
  it('all caps + bold -> pass', () => {
    const input = buildInput({
      extraction: {
        government_warning: {
          present: true,
          full_text: 'GOVERNMENT WARNING: ...',
          heading_text: 'GOVERNMENT WARNING:',
          heading_appears_bold: true,
          heading_appears_all_caps: true,
          body_text: CANONICAL_WARNING_TEXT,
          confidence: 'high',
        },
      },
      context: { requires_government_warning: true },
    });
    const result = evaluateWarningHeading(input);
    expect(result.status).toBe('pass');
    expect(result.reason_code).toBe('EXACT_MATCH');
  });

  it('not all caps -> fail', () => {
    const input = buildInput({
      extraction: {
        government_warning: {
          present: true,
          full_text: 'Government Warning: ...',
          heading_text: 'Government Warning:',
          heading_appears_bold: true,
          heading_appears_all_caps: false,
          body_text: CANONICAL_WARNING_TEXT,
          confidence: 'high',
        },
      },
      context: { requires_government_warning: true },
    });
    const result = evaluateWarningHeading(input);
    expect(result.status).toBe('fail');
    expect(result.reason_code).toBe('WARNING_HEADING_NOT_ALL_CAPS');
  });

  it('bold uncertain -> needs_review', () => {
    const input = buildInput({
      extraction: {
        government_warning: {
          present: true,
          full_text: 'GOVERNMENT WARNING: ...',
          heading_text: 'GOVERNMENT WARNING:',
          heading_appears_bold: null,
          heading_appears_all_caps: true,
          body_text: CANONICAL_WARNING_TEXT,
          confidence: 'high',
        },
      },
      context: { requires_government_warning: true },
    });
    const result = evaluateWarningHeading(input);
    expect(result.status).toBe('needs_review');
    expect(result.reason_code).toBe('WARNING_BOLD_UNCERTAIN');
  });

  it('not bold -> fail', () => {
    const input = buildInput({
      extraction: {
        government_warning: {
          present: true,
          full_text: 'GOVERNMENT WARNING: ...',
          heading_text: 'GOVERNMENT WARNING:',
          heading_appears_bold: false,
          heading_appears_all_caps: true,
          body_text: CANONICAL_WARNING_TEXT,
          confidence: 'high',
        },
      },
      context: { requires_government_warning: true },
    });
    const result = evaluateWarningHeading(input);
    expect(result.status).toBe('fail');
    expect(result.reason_code).toBe('WARNING_HEADING_NOT_BOLD');
  });
});

// ===========================================================================
// Low Confidence Extraction (via fuzzy-text-rule)
// ===========================================================================
describe('Low Confidence Extraction', () => {
  it('extraction with confidence low -> needs_review, EXTRACTION_LOW_CONFIDENCE', () => {
    const input = buildInput({
      application: { brand_name: 'OLD TOM DISTILLERY' },
      extraction: { brand_name: { raw_text: 'OLD TOM DISTILLERY', confidence: 'low' } },
    });
    const result = evaluateBrandName(input);
    expect(result.status).toBe('needs_review');
    expect(result.reason_code).toBe('EXTRACTION_LOW_CONFIDENCE');
    expect(result.details).toHaveProperty('extraction_confidence', 'low');
  });
});
