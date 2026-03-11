/**
 * Minimal CSV parser for batch upload manifests.
 * Handles quoted fields (with escaped quotes) and standard comma-delimited rows.
 */

export interface CsvRow {
  [key: string]: string;
}

/**
 * Parse a CSV string into an array of objects keyed by header names.
 * Trims whitespace from headers and values.
 */
export function parseCsv(text: string): CsvRow[] {
  const lines = splitCsvLines(text);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCsvLine(line);
    const row: CsvRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] ?? '').trim();
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Split CSV text into lines, respecting quoted fields that may contain newlines.
 */
function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++; // skip \r\n
      lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Parse a single CSV line into an array of field values.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Required columns for the batch manifest CSV.
 */
export const REQUIRED_CSV_COLUMNS = [
  'brand_name',
  'beverage_type',
  'class_type',
  'alcohol_content',
  'net_contents',
  'bottler_name_address',
  'country_of_origin',
  'requires_government_warning',
  'label_filename',
] as const;

/**
 * Validate that a parsed CSV has all required columns.
 * Returns an error message if invalid, or null if valid.
 */
export function validateCsvHeaders(headers: string[]): string | null {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_CSV_COLUMNS.filter((col) => !normalized.includes(col));
  if (missing.length > 0) {
    return `Missing required columns: ${missing.join(', ')}`;
  }
  return null;
}
