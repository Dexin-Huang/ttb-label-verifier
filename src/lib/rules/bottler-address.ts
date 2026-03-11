import type { FieldResult } from '@/lib/types';
import type { RuleInput } from './engine';
import { evaluateFuzzyTextField } from './fuzzy-text-rule';
import { RULE_CONFIG } from './config';

export function evaluateBottlerAddress(input: RuleInput): FieldResult {
  return evaluateFuzzyTextField(
    input,
    'bottler_name_address',
    input.application.bottler_name_address,
    input.extraction.bottler_name_address,
    RULE_CONFIG.BOTTLER_FUZZY_THRESHOLD,
  );
}
