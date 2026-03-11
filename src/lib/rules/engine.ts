import type {
  FieldResult,
  ReviewStatus,
  ReviewSummary,
  Application,
  GeminiExtractionResult,
  BeverageType,
} from '@/lib/types';
import { evaluateBrandName } from './brand-name';
import { evaluateClassType } from './class-type';
import { evaluateAlcoholContent } from './alcohol-content';
import { evaluateNetContents } from './net-contents';
import { evaluateBottlerAddress } from './bottler-address';
import { evaluateCountryOfOrigin } from './country-of-origin';
import {
  evaluateWarningPresence,
  evaluateWarningText,
  evaluateWarningHeading,
} from './government-warning';

export interface RuleContext {
  beverage_type: BeverageType;
  requires_government_warning: boolean;
}

export interface RuleInput {
  application: Application;
  extraction: GeminiExtractionResult;
  context: RuleContext;
}

export function runRuleEngine(input: RuleInput): {
  field_results: FieldResult[];
  overall_status: ReviewStatus;
  summary: ReviewSummary;
} {
  const field_results: FieldResult[] = [
    evaluateBrandName(input),
    evaluateClassType(input),
    evaluateAlcoholContent(input),
    evaluateNetContents(input),
    evaluateBottlerAddress(input),
    evaluateCountryOfOrigin(input),
    evaluateWarningPresence(input),
    evaluateWarningText(input),
    evaluateWarningHeading(input),
  ];

  const summary: ReviewSummary = { pass: 0, needs_review: 0, fail: 0, skipped: 0 };
  for (const r of field_results) {
    summary[r.status]++;
  }

  let overall_status: ReviewStatus;
  if (summary.fail > 0) {
    overall_status = 'likely_fail';
  } else if (summary.needs_review > 0) {
    overall_status = 'needs_review';
  } else {
    overall_status = 'pass_candidate';
  }

  return { field_results, overall_status, summary };
}
