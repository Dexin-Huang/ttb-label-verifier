import type { GeminiExtractionResult } from '@/lib/types';
import crypto from 'crypto';

/**
 * Mock Gemini responses keyed by SHA-256 hash of the image buffer.
 * Tests register their expected responses here before uploading labels.
 *
 * In mock mode, extractLabelFields() looks up the image hash and returns
 * the registered response instead of calling the real Gemini API.
 */

const mockRegistry = new Map<string, GeminiExtractionResult>();

// Also support a default/fallback response for unknown images
let defaultMockResponse: GeminiExtractionResult | null = null;

export function registerMockResponse(imageHash: string, response: GeminiExtractionResult): void {
  mockRegistry.set(imageHash, response);
}

export function setDefaultMockResponse(response: GeminiExtractionResult): void {
  defaultMockResponse = response;
}

export function clearMockResponses(): void {
  mockRegistry.clear();
  defaultMockResponse = null;
}

export function hashImageBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function getMockResponse(imageBuffer: Buffer): GeminiExtractionResult | null {
  const hash = hashImageBuffer(imageBuffer);
  const registered = mockRegistry.get(hash);
  if (registered) return registered;
  if (defaultMockResponse) return defaultMockResponse;

  // If no mock is registered, return a generic "perfect match" response
  // so tests don't fail silently when mock mode is on
  return {
    brand_name: { raw_text: 'MOCK BRAND', confidence: 'high' },
    class_type: { raw_text: 'Mock Class Type', confidence: 'high' },
    alcohol_content: { raw_text: '40% Alc./Vol.', confidence: 'high' },
    net_contents: { raw_text: '750 mL', confidence: 'high' },
    bottler_name_address: { raw_text: 'Mock Distillery, Mock City, ST', confidence: 'high' },
    country_of_origin: null,
    government_warning: {
      present: true,
      full_text: 'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.',
      heading_text: 'GOVERNMENT WARNING:',
      heading_appears_bold: true,
      heading_appears_all_caps: true,
      body_text: '(1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.',
      confidence: 'high',
    },
  };
}
