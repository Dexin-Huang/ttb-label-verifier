import type { SessionBatchRecord } from '@/lib/types';

const SESSION_BATCHES_KEY = 'label-verifier-session-batches';

function hasSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function loadSessionBatches(): SessionBatchRecord[] {
  if (!hasSessionStorage()) {
    return [];
  }

  const raw = window.sessionStorage.getItem(SESSION_BATCHES_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SessionBatchRecord[]) : [];
  } catch {
    return [];
  }
}

function writeSessionBatches(batches: SessionBatchRecord[]): void {
  if (!hasSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(SESSION_BATCHES_KEY, JSON.stringify(batches));
}

export function getSessionBatch(batchId: string): SessionBatchRecord | null {
  return loadSessionBatches().find((batch) => batch.id === batchId) ?? null;
}

export function saveSessionBatch(batch: SessionBatchRecord): void {
  const existing = loadSessionBatches().filter((item) => item.id !== batch.id);
  writeSessionBatches([batch, ...existing].slice(0, 20));
}

export function clearSessionBatches(): void {
  if (!hasSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(SESSION_BATCHES_KEY);
}
