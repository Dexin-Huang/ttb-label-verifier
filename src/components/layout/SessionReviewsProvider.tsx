'use client';

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import type { SessionBatchRecord, SessionReviewRecord } from '@/lib/types';

interface StartBatchInput {
  files: File[];
  manifestText: string;
  name: string;
}

interface SessionReviewsContextValue {
  batches: SessionBatchRecord[];
  getBatch: (id: string) => SessionBatchRecord | undefined;
  isHydrated: boolean;
  reviews: SessionReviewRecord[];
  startBatch: (input: StartBatchInput) => Promise<SessionBatchRecord>;
}

const SessionReviewsContext = createContext<SessionReviewsContextValue>({
  batches: [],
  getBatch: () => undefined,
  isHydrated: true,
  reviews: [],
  startBatch: async () => {
    throw new Error('Batch session storage is not wired yet.');
  },
});

export function SessionReviewsProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useSessionReviews(): SessionReviewsContextValue {
  return useContext(SessionReviewsContext);
}
