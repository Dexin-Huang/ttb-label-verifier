import { NextResponse } from 'next/server';

type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'DB_ERROR'
  | 'STORAGE_ERROR'
  | 'INTERNAL_ERROR';

/**
 * Return a consistently shaped JSON error response.
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  details?: unknown,
): NextResponse {
  const body: Record<string, unknown> = { error: { code, message } };
  if (details !== undefined) {
    (body.error as Record<string, unknown>).details = details;
  }
  return NextResponse.json(body, { status });
}

/**
 * Extract the error message from an unknown caught value.
 */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error';
}

/**
 * Parse pagination query params with sensible defaults and bounds.
 */
export function parsePagination(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  from: number;
  to: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)),
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, from, to };
}
