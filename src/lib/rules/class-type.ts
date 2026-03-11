import type { FieldResult } from '@/lib/types';
import type { RuleInput } from './engine';
import { evaluateFuzzyTextField } from './fuzzy-text-rule';
import { RULE_CONFIG } from './config';

export function evaluateClassType(input: RuleInput): FieldResult {
  return evaluateFuzzyTextField(
    input,
    'class_type',
    input.application.class_type,
    input.extraction.class_type,
    RULE_CONFIG.CLASS_TYPE_FUZZY_THRESHOLD,
  );
}
