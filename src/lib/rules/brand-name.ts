import type { FieldResult } from '@/lib/types';
import type { RuleInput } from './engine';
import { evaluateFuzzyTextField } from './fuzzy-text-rule';
import { RULE_CONFIG } from './config';

export function evaluateBrandName(input: RuleInput): FieldResult {
  return evaluateFuzzyTextField(
    input,
    'brand_name',
    input.application.brand_name,
    input.extraction.brand_name,
    RULE_CONFIG.BRAND_NAME_FUZZY_THRESHOLD,
  );
}
