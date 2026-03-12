import type { CreateApplicationRequest } from '@/lib/types';
import { sanitizeApplicationRecord } from '@/lib/application-record';
import { parseCsv, parseCsvHeaders, validateCsvHeaders } from '@/lib/csv';

const LABEL_ACCEPTED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
]);

export interface BatchManifestItem {
  application: CreateApplicationRequest;
  external_reference: string | null;
  label_filename: string;
  row_number: number;
}

export interface MatchedBatchFiles {
  extraFiles: File[];
  filesByLabelFilename: Map<string, File>;
  missingFilenames: string[];
}

function normalizeFilename(filename: string): string {
  return filename.trim().toLowerCase();
}

function validateBatchLabelFile(file: File): void {
  if (!LABEL_ACCEPTED_TYPES.has(file.type)) {
    throw new Error('Use PNG, JPG, or PDF label files for batch review.');
  }
}

export function validateBatchLabelFiles(files: File[]): void {
  for (const file of files) {
    validateBatchLabelFile(file);
  }
}

function buildManifestItem(
  raw: Record<string, unknown>,
  rowNumber: number,
): BatchManifestItem {
  const labelFilename =
    typeof raw.label_filename === 'string' ? raw.label_filename.trim() : '';

  if (!labelFilename) {
    throw new Error(`Manifest row ${rowNumber} is missing label_filename.`);
  }

  return {
    application: sanitizeApplicationRecord(raw),
    external_reference:
      typeof raw.external_reference === 'string' && raw.external_reference.trim()
        ? raw.external_reference.trim()
        : null,
    label_filename: labelFilename,
    row_number: rowNumber,
  };
}

export async function parseBatchManifest(file: File): Promise<BatchManifestItem[]> {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Use a .csv file for the batch manifest.');
  }

  const text = await file.text();
  const headers = parseCsvHeaders(text);
  const headerError = validateCsvHeaders(headers);
  if (headerError) {
    throw new Error(headerError);
  }

  const rows = parseCsv(text);
  if (rows.length === 0) {
    throw new Error('The CSV manifest does not contain any application rows.');
  }

  return rows.map((row, index) => buildManifestItem(row, index + 1));
}

export function matchBatchFiles(
  manifestItems: BatchManifestItem[],
  files: File[],
): MatchedBatchFiles {
  const filesByNormalizedName = new Map<string, File>();

  for (const file of files) {
    validateBatchLabelFile(file);
    filesByNormalizedName.set(normalizeFilename(file.name), file);
  }

  const filesByLabelFilename = new Map<string, File>();
  const matchedNames = new Set<string>();
  const missingFilenames: string[] = [];

  for (const item of manifestItems) {
    const normalized = normalizeFilename(item.label_filename);
    const file = filesByNormalizedName.get(normalized);

    if (!file) {
      missingFilenames.push(item.label_filename);
      continue;
    }

    matchedNames.add(normalized);
    filesByLabelFilename.set(item.label_filename, file);
  }

  const extraFiles = files.filter(
    (file) => !matchedNames.has(normalizeFilename(file.name))
  );

  return {
    extraFiles,
    filesByLabelFilename,
    missingFilenames,
  };
}
