'use client';

import type { FieldResult, SessionBatchRecord, SessionReviewRecord } from '@/lib/types';

function escapeCsvField(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildFieldResultsCsv(fieldResults: FieldResult[]): string {
  const csvRows: string[] = [
    'field_type,application_value,extracted_value,status,reason_code,confidence',
  ];

  for (const field of fieldResults) {
    csvRows.push(
      [
        escapeCsvField(field.field_type),
        escapeCsvField(field.application_value ?? ''),
        escapeCsvField(field.extracted_value ?? ''),
        escapeCsvField(field.status),
        escapeCsvField(field.reason_code),
        String(field.confidence),
      ].join(','),
    );
  }

  return csvRows.join('\r\n') + '\r\n';
}

export function downloadReviewCsv(review: SessionReviewRecord): void {
  const csvContent = buildFieldResultsCsv(review.field_results);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `review_${review.id}.csv`);
}

export function downloadBatchCsv(
  batch: SessionBatchRecord,
  reviewMap: Map<string, SessionReviewRecord>,
): void {
  const csvRows: string[] = [
    [
      'row_number',
      'external_reference',
      'label_filename',
      'brand_name',
      'beverage_type',
      'item_status',
      'review_status',
      'pass',
      'needs_review',
      'fail',
      'error_message',
    ].join(','),
  ];

  for (const item of batch.items) {
    const review = item.review_id ? reviewMap.get(item.review_id) : null;
    csvRows.push(
      [
        item.row_number,
        escapeCsvField(item.external_reference ?? ''),
        escapeCsvField(item.label_filename),
        escapeCsvField(item.application.brand_name),
        escapeCsvField(item.application.beverage_type),
        escapeCsvField(item.status),
        escapeCsvField(item.review_status ?? ''),
        String(review?.summary.pass ?? item.review_summary?.pass ?? ''),
        String(review?.summary.needs_review ?? item.review_summary?.needs_review ?? ''),
        String(review?.summary.fail ?? item.review_summary?.fail ?? ''),
        escapeCsvField(item.error_message ?? ''),
      ].join(','),
    );
  }

  const blob = new Blob([csvRows.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `batch_${batch.name}_results.csv`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
