/**
 * Soft text normalization for brand names and identity fields.
 * - Trim whitespace
 * - Lowercase
 * - Collapse internal whitespace
 * - Normalize apostrophes/quotes to standard ASCII
 * - Remove punctuation for comparison
 */
export function softNormalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'") // smart quotes
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '') // remove punctuation
    .trim();
}

/**
 * Parse alcohol content string into structured numeric values.
 * Examples:
 *   "45% Alc./Vol. (90 Proof)" → { abv: 45.0, proof: 90 }
 *   "12.5% ABV"                → { abv: 12.5, proof: null }
 */
export function parseAlcoholContent(
  text: string,
): { abv: number | null; proof: number | null } {
  const abvMatch = text.match(/(\d+\.?\d*)\s*%/);
  const proofAfterMatch = text.match(/(\d+)\s*proof/i);
  const proofBeforeMatch = text.match(/proof\s*(\d+)/i);
  const proofValue = proofAfterMatch?.[1] ?? proofBeforeMatch?.[1] ?? null;
  return {
    abv: abvMatch ? parseFloat(abvMatch[1]) : null,
    proof: proofValue ? parseInt(proofValue) : null,
  };
}

/**
 * Parse net contents string into canonical millilitres.
 * Examples:
 *   "750 mL"  → { value_ml: 750 }
 *   "1.75 L"  → { value_ml: 1750 }
 *   "25.4 oz" → { value_ml: 750.77 }
 */
export function parseNetContents(text: string): { value_ml: number | null } {
  const match = text.match(/(\d+\.?\d*)\s*(ml|cl|l|oz|fl\.?\s*oz)/i);
  if (!match) return { value_ml: null };

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase().replace(/[\.\s]/g, '');

  switch (unit) {
    case 'ml':
      return { value_ml: value };
    case 'cl':
      return { value_ml: value * 10 };
    case 'l':
      return { value_ml: value * 1000 };
    case 'oz':
    case 'floz':
      return { value_ml: value * 29.5735 };
    default:
      return { value_ml: null };
  }
}
