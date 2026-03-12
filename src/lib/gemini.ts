import { GoogleGenAI } from '@google/genai';
import type {
  FieldResult,
  FieldType,
  GeminiExtractionResult,
  GovernmentWarningExtraction,
  ReasonCode,
} from '@/lib/types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });

type ExtractionConfidence = 'high' | 'medium' | 'low';

interface AdjudicationFieldInput {
  application_value: string | null;
  extracted_value: string | null;
  field_type: FieldType;
  reason_code: ReasonCode;
  deterministic_status: 'needs_review' | 'fail';
}

const SIMPLE_ADJUDICATION_FIELD_TYPES = [
  'brand_name',
  'class_type',
  'alcohol_content',
  'net_contents',
  'bottler_name_address',
  'country_of_origin',
] as const;

const WARNING_FIELD_TYPES = new Set<FieldType>([
  'government_warning_presence',
  'government_warning_text',
  'government_warning_heading',
]);
const FUZZY_TEXT_FIELD_TYPES = new Set<FieldType>([
  'brand_name',
  'class_type',
  'bottler_name_address',
  'country_of_origin',
]);

const FIELD_REVIEW_NOTES: Partial<Record<FieldType, string>> = {
  alcohol_content:
    'Verify the alcohol statement only. Include both ABV and proof when visible, even if the order is reversed.',
  bottler_name_address:
    'Verify the bottler, producer, or importer line only. Do not include unrelated slogan or brand text.',
  brand_name:
    'Verify the core brand wording only. Do not include adjacent descriptors like finish names, flavor notes, or release labels unless they are clearly part of the brand itself.',
  class_type:
    'Verify the statutory or classification wording only. Do not merge nearby marketing descriptors unless they are visibly part of the same class/type statement.',
  country_of_origin:
    'Verify the country or origin/import statement only when it is visibly present on the label.',
  government_warning_heading:
    'Verify that the heading reads "GOVERNMENT WARNING:", appears in all caps, and appears bold.',
  government_warning_presence:
    'Verify whether the standard government warning is visibly present on the label.',
  government_warning_text:
    'Verify the exact standard government warning text, not an approximation.',
  net_contents:
    'Verify the net contents statement only, including the unit exactly as shown.',
};

export const EXTRACTION_PROMPT = `You are analyzing an alcohol beverage label image. Extract the following information exactly as it appears on the label.

For each field, provide the exact text as printed on the label and your confidence level (high, medium, or low).

Return a JSON object with this exact structure:
{
  "brand_name": {
    "raw_text": "exact text from label",
    "confidence": "high" | "medium" | "low"
  },
  "class_type": {
    "raw_text": "exact text from label",
    "confidence": "high" | "medium" | "low"
  },
  "alcohol_content": {
    "raw_text": "exact text from label including % and any proof statement",
    "confidence": "high" | "medium" | "low"
  },
  "net_contents": {
    "raw_text": "exact text from label including unit",
    "confidence": "high" | "medium" | "low"
  },
  "bottler_name_address": {
    "raw_text": "exact producer/bottler/importer name and address text",
    "confidence": "high" | "medium" | "low"
  },
  "country_of_origin": {
    "raw_text": "country of origin if present, or null",
    "confidence": "high" | "medium" | "low"
  },
  "government_warning": {
    "present": true | false,
    "full_text": "the complete government warning text exactly as printed",
    "heading_text": "just the heading portion, e.g. 'GOVERNMENT WARNING:'",
    "heading_appears_bold": true | false | null,
    "heading_appears_all_caps": true | false,
    "body_text": "the warning body text after the heading",
    "confidence": "high" | "medium" | "low"
  }
}

Important instructions:
- Extract text EXACTLY as it appears on the label, preserving capitalization, punctuation, and spacing.
- This is a blind extraction pass. Do not infer from outside context or guess from typical label structure.
- For each requested field, return the best single candidate for that field only. Do not merge nearby marketing copy, award text, flavor notes, or decorative descriptors into the target field.
- For brand_name, return the core brand wording only.
- For class_type, return the class or type designation only.
- For alcohol_content, return the alcohol statement only, including both ABV and proof if visible.
- For net_contents, return the size statement only.
- For bottler_name_address, return the single bottler, producer, or importer line only.
- For the government warning, pay special attention to whether the heading "GOVERNMENT WARNING:" appears in ALL CAPS and whether it appears BOLD (heavier weight than the body text).
- If a field is partially visible or you cannot read it cleanly, return the visible text and set confidence to "low".
- If a field is not visible on the label, set it to null.
- Return ONLY the JSON object, no other text.`;

function validateConfidence(value: unknown): ExtractionConfidence {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'low';
}

function conservativeConfidence(value: ExtractionConfidence): ExtractionConfidence {
  return value === 'high' ? 'high' : 'low';
}

function buildAdjudicationPrompt(flaggedFields: AdjudicationFieldInput[]): string {
  const groupedFields = flaggedFields.map((field) => ({
    field_type: field.field_type,
    application_value: field.application_value,
    first_extracted_value: field.extracted_value,
    deterministic_status: field.deterministic_status,
    rule_reason: field.reason_code,
    review_instruction: FIELD_REVIEW_NOTES[field.field_type] ?? 'Verify this field conservatively.',
  }));

  return `You are performing a second-pass verification on an alcohol beverage label image.

The first extraction pass may have missed text, captured surrounding descriptors, or chosen the wrong nearby text block.
Re-check ONLY the flagged fields listed below.

Conservative review rules:
- Only override the first extraction when the requested field is clearly visible on the label.
- Do not guess from the application value if the text is not actually visible.
- If you are uncertain, set override_extraction to false.
- Brand names may still match when capitalization differs, but do not include nearby descriptors unless they are clearly part of the brand.
- The government warning must use the standard text, and the heading must read "GOVERNMENT WARNING:" in all caps and appear bold.

Return JSON only with this structure:
{
  "brand_name": {
    "override_extraction": true | false,
    "raw_text": "corrected exact text from the image or null",
    "confidence": "high" | "medium" | "low",
    "notes": "short explanation"
  } | null,
  "class_type": {
    "override_extraction": true | false,
    "raw_text": "corrected exact text from the image or null",
    "confidence": "high" | "medium" | "low",
    "notes": "short explanation"
  } | null,
  "alcohol_content": {
    "override_extraction": true | false,
    "raw_text": "corrected exact text from the image or null",
    "confidence": "high" | "medium" | "low",
    "notes": "short explanation"
  } | null,
  "net_contents": {
    "override_extraction": true | false,
    "raw_text": "corrected exact text from the image or null",
    "confidence": "high" | "medium" | "low",
    "notes": "short explanation"
  } | null,
  "bottler_name_address": {
    "override_extraction": true | false,
    "raw_text": "corrected exact text from the image or null",
    "confidence": "high" | "medium" | "low",
    "notes": "short explanation"
  } | null,
  "country_of_origin": {
    "override_extraction": true | false,
    "raw_text": "corrected exact text from the image or null",
    "confidence": "high" | "medium" | "low",
    "notes": "short explanation"
  } | null,
  "government_warning": {
    "override_extraction": true | false,
    "present": true | false,
    "full_text": "the complete warning text exactly as printed or null",
    "heading_text": "the heading exactly as printed or null",
    "heading_appears_bold": true | false | null,
    "heading_appears_all_caps": true | false | null,
    "body_text": "the warning body text after the heading or null",
    "confidence": "high" | "medium" | "low",
    "notes": "short explanation"
  } | null
}

Flagged fields to review:
${JSON.stringify(groupedFields, null, 2)}`;
}

function validateAdjudication(
  raw: Record<string, unknown>,
  flaggedFields: AdjudicationFieldInput[],
): Partial<GeminiExtractionResult> {
  const patch: Partial<GeminiExtractionResult> = {};
  const flaggedTypes = new Set(flaggedFields.map((field) => field.field_type));

  for (const fieldType of SIMPLE_ADJUDICATION_FIELD_TYPES) {
    if (!flaggedTypes.has(fieldType)) {
      continue;
    }

    const candidate = raw[fieldType];
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    const candidateObject = candidate as Record<string, unknown>;
    if (candidateObject.override_extraction !== true || typeof candidateObject.raw_text !== 'string') {
      continue;
    }

    const rawText = candidateObject.raw_text.trim();
    if (!rawText) {
      continue;
    }

    patch[fieldType] = {
      raw_text: rawText,
      confidence: conservativeConfidence(validateConfidence(candidateObject.confidence)),
    };
  }

  if ([...flaggedTypes].some((fieldType) => WARNING_FIELD_TYPES.has(fieldType))) {
    const warningCandidate = raw.government_warning;
    if (warningCandidate && typeof warningCandidate === 'object') {
      const warningObject = warningCandidate as Record<string, unknown>;
      const present = warningObject.present === true;

      if (warningObject.override_extraction === true && present) {
        const warningPatch: GovernmentWarningExtraction = {
          present: true,
          full_text: typeof warningObject.full_text === 'string' ? warningObject.full_text : null,
          heading_text:
            typeof warningObject.heading_text === 'string' ? warningObject.heading_text : null,
          heading_appears_bold:
            typeof warningObject.heading_appears_bold === 'boolean'
              ? warningObject.heading_appears_bold
              : null,
          heading_appears_all_caps:
            typeof warningObject.heading_appears_all_caps === 'boolean'
              ? warningObject.heading_appears_all_caps
              : false,
          body_text: typeof warningObject.body_text === 'string' ? warningObject.body_text : null,
          confidence: conservativeConfidence(validateConfidence(warningObject.confidence)),
        };

        patch.government_warning = warningPatch;
      }
    }
  }

  return patch;
}

function shouldAdjudicateField(field: FieldResult): field is FieldResult & { status: 'fail' | 'needs_review' } {
  if (field.status !== 'fail' && field.status !== 'needs_review') {
    return false;
  }

  switch (field.reason_code) {
    case 'EXTRACTION_LOW_CONFIDENCE':
    case 'NO_EXTRACTED_CANDIDATE':
    case 'PARSE_FAILED':
    case 'PARTIAL_MATCH_REVIEW':
    case 'WARNING_BOLD_UNCERTAIN':
    case 'WARNING_HEADING_NOT_ALL_CAPS':
    case 'WARNING_HEADING_NOT_BOLD':
    case 'WARNING_MISSING':
    case 'WARNING_TEXT_MISMATCH':
      return true;
    case 'VALUE_MISMATCH':
      return FUZZY_TEXT_FIELD_TYPES.has(field.field_type);
    default:
      return false;
  }
}

/**
 * Validate and coerce the raw Gemini JSON into a safe GeminiExtractionResult.
 * Ensures missing or malformed fields default to null rather than corrupting rules.
 */
function validateExtraction(raw: Record<string, unknown>): GeminiExtractionResult {
  const field = (val: unknown): { raw_text: string; confidence: 'high' | 'medium' | 'low' } | null => {
    if (!val || typeof val !== 'object') return null;
    const obj = val as Record<string, unknown>;
    if (typeof obj.raw_text !== 'string') return null;
    const confidence = validateConfidence(obj.confidence);
    return { raw_text: obj.raw_text, confidence };
  };

  const warning = raw.government_warning;
  let govWarning: GeminiExtractionResult['government_warning'] = null;
  if (warning && typeof warning === 'object') {
    const w = warning as Record<string, unknown>;
    govWarning = {
      present: !!w.present,
      full_text: typeof w.full_text === 'string' ? w.full_text : null,
      heading_text: typeof w.heading_text === 'string' ? w.heading_text : null,
      heading_appears_bold: typeof w.heading_appears_bold === 'boolean' ? w.heading_appears_bold : null,
      heading_appears_all_caps: typeof w.heading_appears_all_caps === 'boolean' ? w.heading_appears_all_caps : false,
      body_text: typeof w.body_text === 'string' ? w.body_text : null,
      confidence: validateConfidence(w.confidence),
    };
  }

  return {
    brand_name: field(raw.brand_name),
    class_type: field(raw.class_type),
    alcohol_content: field(raw.alcohol_content),
    net_contents: field(raw.net_contents),
    bottler_name_address: field(raw.bottler_name_address),
    country_of_origin: field(raw.country_of_origin),
    government_warning: govWarning,
  };
}

export async function extractLabelFields(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<GeminiExtractionResult> {

  const base64Image = imageBuffer.toString('base64');

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite-preview',
    contents: [
      {
        role: 'user',
        parts: [
          { text: EXTRACTION_PROMPT },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      temperature: 0,
    },
  });

  const text = response.text ?? '';
  const parsed = JSON.parse(text);
  return validateExtraction(parsed);
}

export async function adjudicateFlaggedFields(
  imageBuffer: Buffer,
  mimeType: string,
  flaggedFields: FieldResult[],
): Promise<Partial<GeminiExtractionResult>> {
  const adjudicationInputs = flaggedFields
    .filter(shouldAdjudicateField)
    .map((field) => ({
      application_value: field.application_value,
      extracted_value: field.extracted_value,
      field_type: field.field_type,
      reason_code: field.reason_code,
      deterministic_status: field.status,
    }));

  if (adjudicationInputs.length === 0) {
    return {};
  }


  const base64Image = imageBuffer.toString('base64');

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite-preview',
    contents: [
      {
        role: 'user',
        parts: [
          { text: buildAdjudicationPrompt(adjudicationInputs) },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      temperature: 0,
    },
  });

  const text = response.text ?? '{}';
  const parsed = JSON.parse(text);

  if (!parsed || typeof parsed !== 'object') {
    return {};
  }

  return validateAdjudication(parsed as Record<string, unknown>, adjudicationInputs);
}
