import { describe, expect, it } from 'vitest';
import type { RuleInput } from '@/lib/rules/engine';
import {
  CANONICAL_WARNING_TEXT,
  evaluateWarningHeading,
  evaluateWarningPresence,
  evaluateWarningText,
} from '@/lib/rules/government-warning';

function buildRuleInput(overrides?: Partial<RuleInput['extraction']['government_warning']>): RuleInput {
  return {
    application: {
      alcohol_content: '57.5% ALC./VOL. 115 PROOF',
      beverage_type: 'distilled_spirits',
      bottler_name_address: 'BOTTLED BY WHISKEY THIEF DISTILLING CO. FRANKFORT, KENTUCKY, USA',
      brand_name: 'GOOD TIMES',
      class_type: 'STRAIGHT RYE WHISKEY',
      country_of_origin: '',
      created_at: '2026-03-11T12:00:00.000Z',
      id: 'app-1',
      net_contents: '750ML',
      requires_government_warning: true,
      updated_at: '2026-03-11T12:00:00.000Z',
    },
    context: {
      beverage_type: 'distilled_spirits',
      requires_government_warning: true,
    },
    extraction: {
      alcohol_content: null,
      bottler_name_address: null,
      brand_name: null,
      class_type: null,
      country_of_origin: null,
      government_warning: {
        body_text: CANONICAL_WARNING_TEXT,
        confidence: 'high',
        full_text: `GOVERNMENT WARNING: ${CANONICAL_WARNING_TEXT}`,
        heading_appears_all_caps: true,
        heading_appears_bold: true,
        heading_text: 'GOVERNMENT WARNING:',
        present: true,
        ...overrides,
      },
      net_contents: null,
    },
  };
}

describe('government warning rules', () => {
  it('passes the canonical warning when it is present, exact, and bold', () => {
    const input = buildRuleInput();

    expect(evaluateWarningPresence(input)).toMatchObject({
      reason_code: 'EXACT_MATCH',
      status: 'pass',
    });
    expect(evaluateWarningText(input)).toMatchObject({
      reason_code: 'EXACT_MATCH',
      status: 'pass',
    });
    expect(evaluateWarningHeading(input)).toMatchObject({
      reason_code: 'EXACT_MATCH',
      status: 'pass',
    });
  });

  it('fails missing warning presence and routes low-confidence warning text to review', () => {
    const missingInput = buildRuleInput({
      body_text: null,
      full_text: null,
      heading_appears_bold: null,
      heading_text: null,
      present: false,
    });

    expect(evaluateWarningPresence(missingInput)).toMatchObject({
      reason_code: 'WARNING_MISSING',
      status: 'fail',
    });

    const uncertainTextInput = buildRuleInput({
      confidence: 'low',
    });

    expect(evaluateWarningText(uncertainTextInput)).toMatchObject({
      reason_code: 'EXTRACTION_LOW_CONFIDENCE',
      status: 'needs_review',
    });
  });
});
