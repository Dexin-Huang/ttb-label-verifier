import { GoogleGenAI } from '@google/genai';
import type { GeminiExtractionResult } from '@/lib/types';
import { getMockResponse } from './gemini-mock';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });

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
- For the government warning, pay special attention to whether the heading "GOVERNMENT WARNING:" appears in ALL CAPS and whether it appears BOLD (heavier weight than the body text).
- If a field is not visible on the label, set it to null.
- If you cannot read text clearly, set confidence to "low".
- Return ONLY the JSON object, no other text.`;

/**
 * Validate and coerce the raw Gemini JSON into a safe GeminiExtractionResult.
 * Ensures missing or malformed fields default to null rather than corrupting rules.
 */
function validateExtraction(raw: Record<string, unknown>): GeminiExtractionResult {
  const field = (val: unknown): { raw_text: string; confidence: 'high' | 'medium' | 'low' } | null => {
    if (!val || typeof val !== 'object') return null;
    const obj = val as Record<string, unknown>;
    if (typeof obj.raw_text !== 'string') return null;
    const confidence = ['high', 'medium', 'low'].includes(obj.confidence as string)
      ? (obj.confidence as 'high' | 'medium' | 'low')
      : 'low';
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
      confidence: ['high', 'medium', 'low'].includes(w.confidence as string)
        ? (w.confidence as 'high' | 'medium' | 'low')
        : 'low',
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
  // Mock mode for testing — returns deterministic responses without calling Gemini
  if (process.env.GEMINI_MOCK === 'true') {
    const mockResponse = getMockResponse(imageBuffer);
    if (mockResponse) return mockResponse;
  }

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
