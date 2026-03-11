import { describe, it, expect } from 'vitest';
import { runRuleEngine } from '@/lib/rules/engine';
import type { Application, GeminiExtractionResult } from '@/lib/types';
import samplePass from '../../fixtures/extraction-responses/sample-pass.json';
import sampleFail from '../../fixtures/extraction-responses/sample-fail.json';

const baseApplication: Application = {
  id: 'test-app-id',
  beverage_type: 'distilled_spirits',
  brand_name: 'OLD TOM DISTILLERY',
  class_type: 'Kentucky Straight Bourbon Whiskey',
  alcohol_content: '45% Alc./Vol. (90 Proof)',
  net_contents: '750 mL',
  bottler_name_address: 'Old Tom Distillery, Bardstown, KY',
  country_of_origin: '',
  requires_government_warning: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('runRuleEngine', () => {
  it('returns pass_candidate for matching extraction', () => {
    const result = runRuleEngine({
      application: baseApplication,
      extraction: samplePass as GeminiExtractionResult,
      context: {
        beverage_type: 'distilled_spirits',
        requires_government_warning: true,
      },
    });

    expect(result.overall_status).toBe('pass_candidate');
    expect(result.summary.fail).toBe(0);
    expect(result.field_results.length).toBe(9);
  });

  it('returns likely_fail for mismatched extraction', () => {
    const result = runRuleEngine({
      application: baseApplication,
      extraction: sampleFail as GeminiExtractionResult,
      context: {
        beverage_type: 'distilled_spirits',
        requires_government_warning: true,
      },
    });

    expect(result.overall_status).toBe('likely_fail');
    expect(result.summary.fail).toBeGreaterThan(0);
  });

  it('handles case-only brand name difference as pass', () => {
    const extraction: GeminiExtractionResult = {
      ...(samplePass as GeminiExtractionResult),
      brand_name: { raw_text: "Old Tom Distillery", confidence: 'high' },
    };

    const result = runRuleEngine({
      application: baseApplication,
      extraction,
      context: {
        beverage_type: 'distilled_spirits',
        requires_government_warning: true,
      },
    });

    const brandResult = result.field_results.find(r => r.field_type === 'brand_name');
    expect(brandResult?.status).toBe('pass');
    expect(brandResult?.reason_code).toBe('NORMALIZED_MATCH');
  });

  it('skips country_of_origin when not provided', () => {
    const result = runRuleEngine({
      application: { ...baseApplication, country_of_origin: '' },
      extraction: samplePass as GeminiExtractionResult,
      context: {
        beverage_type: 'distilled_spirits',
        requires_government_warning: true,
      },
    });

    const countryResult = result.field_results.find(r => r.field_type === 'country_of_origin');
    expect(countryResult?.status).toBe('skipped');
  });

  it('detects title-case government warning heading as fail', () => {
    const extraction: GeminiExtractionResult = {
      ...(samplePass as GeminiExtractionResult),
      government_warning: {
        present: true,
        full_text: 'Government Warning: ...',
        heading_text: 'Government Warning:',
        heading_appears_bold: true,
        heading_appears_all_caps: false,
        body_text: (samplePass as GeminiExtractionResult).government_warning!.body_text,
        confidence: 'high',
      },
    };

    const result = runRuleEngine({
      application: baseApplication,
      extraction,
      context: {
        beverage_type: 'distilled_spirits',
        requires_government_warning: true,
      },
    });

    const headingResult = result.field_results.find(r => r.field_type === 'government_warning_heading');
    expect(headingResult?.status).toBe('fail');
    expect(headingResult?.reason_code).toBe('WARNING_HEADING_NOT_ALL_CAPS');
  });

  it('returns needs_review when bold is uncertain', () => {
    const extraction: GeminiExtractionResult = {
      ...(samplePass as GeminiExtractionResult),
      government_warning: {
        present: true,
        full_text: 'GOVERNMENT WARNING: ...',
        heading_text: 'GOVERNMENT WARNING:',
        heading_appears_bold: null,
        heading_appears_all_caps: true,
        body_text: (samplePass as GeminiExtractionResult).government_warning!.body_text,
        confidence: 'high',
      },
    };

    const result = runRuleEngine({
      application: baseApplication,
      extraction,
      context: {
        beverage_type: 'distilled_spirits',
        requires_government_warning: true,
      },
    });

    const headingResult = result.field_results.find(r => r.field_type === 'government_warning_heading');
    expect(headingResult?.status).toBe('needs_review');
    expect(headingResult?.reason_code).toBe('WARNING_BOLD_UNCERTAIN');
  });
});
