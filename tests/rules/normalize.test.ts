import { describe, it, expect } from 'vitest';
import {
  softNormalize,
  parseAlcoholContent,
  parseNetContents,
} from '@/lib/rules/normalize';

describe('softNormalize', () => {
  it('lowercases and trims', () => {
    expect(softNormalize('  OLD TOM  ')).toBe('old tom');
  });

  it('normalizes smart quotes', () => {
    expect(softNormalize('\u2018Stone\u2019s Throw\u2019')).toBe('stones throw');
  });

  it('handles case-only brand name difference', () => {
    expect(softNormalize("STONE'S THROW")).toBe(softNormalize("Stone's Throw"));
  });

  it('collapses whitespace', () => {
    expect(softNormalize('OLD   TOM   DISTILLERY')).toBe('old tom distillery');
  });

  it('strips punctuation', () => {
    expect(softNormalize('Dr. McGillicuddy\'s')).toBe('dr mcgillicuddys');
  });
});

describe('parseAlcoholContent', () => {
  it('parses ABV with proof', () => {
    const result = parseAlcoholContent('45% Alc./Vol. (90 Proof)');
    expect(result.abv).toBe(45);
    expect(result.proof).toBe(90);
  });

  it('parses ABV only', () => {
    const result = parseAlcoholContent('12.5% ABV');
    expect(result.abv).toBe(12.5);
    expect(result.proof).toBeNull();
  });

  it('parses proof only', () => {
    const result = parseAlcoholContent('90 Proof');
    expect(result.abv).toBeNull();
    expect(result.proof).toBe(90);
  });

  it('returns nulls for unparseable', () => {
    const result = parseAlcoholContent('no alcohol here');
    expect(result.abv).toBeNull();
    expect(result.proof).toBeNull();
  });
});

describe('parseNetContents', () => {
  it('parses mL', () => {
    expect(parseNetContents('750 mL').value_ml).toBe(750);
  });

  it('parses liters to mL', () => {
    expect(parseNetContents('1.75 L').value_ml).toBe(1750);
  });

  it('parses fl oz to mL', () => {
    const result = parseNetContents('25.4 fl. oz.');
    expect(result.value_ml).toBeCloseTo(750.97, 0);
  });

  it('parses FL OZ without period', () => {
    const result = parseNetContents('25.4 FL OZ');
    expect(result.value_ml).toBeCloseTo(750.97, 0);
  });

  it('parses centiliters', () => {
    expect(parseNetContents('75 cl').value_ml).toBe(750);
  });

  it('returns null for unparseable', () => {
    expect(parseNetContents('a big bottle').value_ml).toBeNull();
  });
});
