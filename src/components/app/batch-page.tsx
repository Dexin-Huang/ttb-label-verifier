'use client';

import { useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, Images, Upload } from 'lucide-react';
import {
  matchBatchFiles,
  parseBatchManifest,
  validateBatchLabelFiles,
  type BatchManifestItem,
} from '@/lib/batch-upload';
import { saveSessionBatch } from '@/lib/review-batches';
import { submitReviewRequest } from '@/lib/review-request';
import { persistSessionReview } from '@/lib/review-session';
import type {
  SessionBatchItem,
  SessionBatchRecord,
  SessionReviewRecord,
  StatelessReviewResult,
} from '@/lib/types';
import { BatchResultView } from './batch-result-view';
import { BackLink, PageHeading, PageShell, SectionEyebrow } from './chrome';
import { InlineError, IntakeStepCard, IntakeUploadCard } from './intake';

type BatchStage = 'upload' | 'processing' | 'result';

const DEFAULT_BATCH_CONCURRENCY = Number.parseInt(
  process.env.NEXT_PUBLIC_BATCH_CONCURRENCY ?? '6',
  10,
);
const BATCH_CONCURRENCY =
  Number.isFinite(DEFAULT_BATCH_CONCURRENCY) && DEFAULT_BATCH_CONCURRENCY > 0
    ? DEFAULT_BATCH_CONCURRENCY
    : 6;
const BATCH_LABEL_ACCEPT = 'image/png,image/jpeg,image/jpg,application/pdf';

const MANIFEST_HELP_ITEMS = [
  {
    label: 'One Row',
    value: 'Each row should describe one application record that needs review.',
  },
  {
    label: 'Example',
    value:
      'One row for GOOD TIMES with label_filename set to the exact uploaded file name.',
  },
  {
    label: 'Required Match',
    value:
      'Include a label_filename column so each row can match one uploaded label file.',
  },
  {
    label: 'Accepted',
    value: '.csv',
  },
];

const IMAGE_SET_HELP_ITEMS = [
  {
    label: 'Upload These',
    value: 'Upload the actual label image or PDF files that belong to the manifest rows.',
  },
  {
    label: 'Example',
    value:
      'If the manifest says demo20_001_clean_good_times_rye.png, upload that exact file name.',
  },
  {
    label: 'Filename Rule',
    value:
      'Each uploaded filename should match the label_filename value in the CSV manifest.',
  },
  {
    label: 'Accepted',
    value: '.png, .jpg, .jpeg, or .pdf',
  },
];

interface BatchProgressState {
  currentLabel: string | null;
  processedCount: number;
  totalCount: number;
}

interface BatchPreflightSummary {
  extraCount: number;
  extraFilenames: string[];
  fileCount: number;
  manifestCount: number;
  matchedCount: number;
  missingCount: number;
  missingFilenames: string[];
  ready: boolean;
}

interface BatchRunItem {
  file: File;
  manifestItem: BatchManifestItem;
}

interface BatchRunResult {
  item: SessionBatchItem;
  review: SessionReviewRecord;
}

function ReceiptGrid({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {item.label}
          </p>
          <p className="text-sm leading-6 text-fg">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function ManifestExamplePreview() {
  return (
    <div className="rounded-[1rem] border border-border bg-surface px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
        Example manifest row
      </p>
      <div className="mt-3 overflow-hidden rounded-[0.9rem] border border-border">
        <div className="grid grid-cols-[6rem_1fr_1fr] gap-px bg-border text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
          <div className="bg-surface-muted px-3 py-2">Reference</div>
          <div className="bg-surface-muted px-3 py-2">Label File</div>
          <div className="bg-surface-muted px-3 py-2">Brand</div>
        </div>
        <div className="grid grid-cols-[6rem_1fr_1fr] gap-px bg-border text-sm text-fg">
          <div className="bg-surface px-3 py-2">DEMO20-001</div>
          <div className="bg-surface px-3 py-2">good_times_rye.png</div>
          <div className="bg-surface px-3 py-2">GOOD TIMES</div>
        </div>
      </div>
    </div>
  );
}

function ImageSetExamplePreview() {
  return (
    <div className="rounded-[1rem] border border-border bg-surface px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
        Example file set
      </p>
      <div className="mt-3 space-y-2">
        {[
          'good_times_rye.png',
          'good_old_times_light_whiskey.png',
          'saperavi_qvevri_wine.pdf',
        ].map((filename) => (
          <div
            key={filename}
            className="flex items-center justify-between rounded-[0.8rem] bg-surface-muted px-3 py-2"
          >
            <p className="text-sm leading-6 text-fg">{filename}</p>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              Match
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManifestReceipt({
  itemCount,
  manifestName,
}: {
  itemCount: number;
  manifestName: string | null;
}) {
  if (!manifestName || itemCount === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-pass">
          Parsed successfully
        </p>
        <p className="text-xs leading-5 text-muted">{manifestName}</p>
      </div>
      <ReceiptGrid
        items={[
          { label: 'Rows', value: String(itemCount) },
          { label: 'Ready For Match', value: itemCount === 1 ? '1 label file' : `${itemCount} label files` },
        ]}
      />
    </div>
  );
}

function ImageSetReceipt({
  imageFiles,
}: {
  imageFiles: File[];
}) {
  if (imageFiles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-pass">
        Files added
      </p>
      <ReceiptGrid
        items={[
          { label: 'Files', value: String(imageFiles.length) },
          { label: 'First File', value: imageFiles[0].name },
        ]}
      />
    </div>
  );
}

function getInstruction(hasManifest: boolean, hasImages: boolean) {
  if (!hasManifest) {
    return {
      detail: 'Upload the manifest that lists the batch application records.',
      title: 'Add the CSV manifest.',
    };
  }

  if (!hasImages) {
    return {
      detail:
        'Upload the label files that should match the manifest rows.',
      title: 'Add the label images.',
    };
  }

  return {
    detail:
      'Check the preflight summary, then review the batch when everything is matched.',
    title: 'Ready to review.',
  };
}

function PreflightStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1 bg-surface px-5 py-4">
      <p className="app-data-label">{label}</p>
      <p className="display-serif text-[1.55rem] leading-none tracking-[0.01em] text-fg">
        {value}
      </p>
    </div>
  );
}

function BatchPreflightPanel({
  summary,
}: {
  summary: BatchPreflightSummary;
}) {
  const message = summary.ready
    ? 'Every manifest row has a matching label file. The batch is ready to review.'
    : summary.manifestCount === 0
      ? 'Add the CSV manifest to see the batch summary.'
      : summary.fileCount === 0
        ? 'Add the label files to complete the batch.'
        : summary.missingCount > 0 || summary.extraCount > 0
          ? 'The batch is not ready yet. Fix the missing or extra files before reviewing.'
          : 'Review the counts before starting the batch.';

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <SectionEyebrow>Preflight Summary</SectionEyebrow>
        <p className="text-sm leading-6 text-subtle">{message}</p>
      </div>

      <div className="app-grid-frame grid grid-cols-2 gap-px md:grid-cols-5">
        <PreflightStat label="Rows" value={String(summary.manifestCount)} />
        <PreflightStat label="Files" value={String(summary.fileCount)} />
        <PreflightStat label="Matched" value={String(summary.matchedCount)} />
        <PreflightStat label="Missing" value={String(summary.missingCount)} />
        <PreflightStat label="Extra" value={String(summary.extraCount)} />
      </div>

      {summary.missingFilenames.length > 0 ? (
        <details className="rounded-[1rem] border border-border bg-surface px-4 py-4">
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.16em] text-fail">
            Missing files
          </summary>
          <div className="mt-3 space-y-2">
            {summary.missingFilenames.map((filename) => (
              <p key={filename} className="text-sm leading-6 text-fg">
                {filename}
              </p>
            ))}
          </div>
        </details>
      ) : null}

      {summary.extraFilenames.length > 0 ? (
        <details className="rounded-[1rem] border border-border bg-surface px-4 py-4">
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.16em] text-review">
            Extra files
          </summary>
          <div className="mt-3 space-y-2">
            {summary.extraFilenames.map((filename) => (
              <p key={filename} className="text-sm leading-6 text-fg">
                {filename}
              </p>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function BatchUploadStage({
  canStart,
  hasManifest,
  hasImages,
  imageFiles,
  imagesError,
  imagesLabel,
  manifestError,
  manifestName,
  onImagesUpload,
  onManifestUpload,
  onStart,
  preflightSummary,
  submitError,
}: {
  canStart: boolean;
  hasManifest: boolean;
  hasImages: boolean;
  imageFiles: File[];
  imagesError: string | null;
  imagesLabel: string | null;
  manifestError: string | null;
  manifestName: string | null;
  onImagesUpload: (files: FileList) => void;
  onManifestUpload: (files: FileList) => void;
  onStart: () => void;
  preflightSummary: BatchPreflightSummary;
  submitError: string | null;
}) {
  const instruction = getInstruction(hasManifest, hasImages);
  const imagesInputRef = useRef<HTMLInputElement>(null);
  const manifestInputRef = useRef<HTMLInputElement>(null);

  return (
    <PageShell className="app-stage max-w-5xl space-y-10 py-10 md:space-y-12 md:py-12">
      <div className="space-y-4">
        <SectionEyebrow>Batch Review</SectionEyebrow>
        <p className="display-serif text-[1.95rem] leading-[1.22] tracking-[0.01em] md:text-[2.2rem]">
          {instruction.title}
        </p>
        <p className="max-w-2xl text-sm leading-6 text-subtle">{instruction.detail}</p>
      </div>

      {submitError ? <InlineError message={submitError} /> : null}

      <div className="app-grid-frame grid grid-cols-1 gap-px md:grid-cols-2">
        <IntakeStepCard
          label="CSV Manifest"
          stepNumber={1}
          done={hasManifest}
          current={!hasManifest}
        />
        <IntakeStepCard
          label="Label Images"
          stepNumber={2}
          done={hasImages}
          current={hasManifest && !hasImages}
        />
      </div>

      <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-2">
        <IntakeUploadCard
          title="CSV Manifest"
          description="Upload the batch manifest with one application record per row."
          actionLabel="Upload CSV"
          helperText={manifestName ?? 'Drag and drop a .csv file, or browse'}
          acceptedFormats={['.csv']}
          completeDetails={
            hasManifest ? (
              <ManifestReceipt itemCount={preflightSummary.manifestCount} manifestName={manifestName} />
            ) : null
          }
          examplePreview={<ManifestExamplePreview />}
          helpItems={MANIFEST_HELP_ITEMS}
          helpTitle="What should this file look like?"
          complete={hasManifest}
          active={!hasManifest}
          errorMessage={manifestError}
          onClick={() => manifestInputRef.current?.click()}
          onDropFiles={onManifestUpload}
          onReplace={() => manifestInputRef.current?.click()}
          icon={<FileSpreadsheet size={20} />}
        />
        <IntakeUploadCard
          title="Label Images"
          description="Upload the label files that belong to the manifest rows."
          actionLabel="Upload Images"
          helperText={imagesLabel ?? 'Drag and drop .png, .jpg, or .pdf files, or browse'}
          acceptedFormats={['.png', '.jpg', '.pdf']}
          completeDetails={hasImages ? <ImageSetReceipt imageFiles={imageFiles} /> : null}
          examplePreview={<ImageSetExamplePreview />}
          helpItems={IMAGE_SET_HELP_ITEMS}
          helpTitle="What should these files look like?"
          complete={hasImages}
          active={hasManifest && !hasImages}
          errorMessage={imagesError}
          onClick={() => imagesInputRef.current?.click()}
          onDropFiles={onImagesUpload}
          onReplace={() => imagesInputRef.current?.click()}
          icon={<Images size={20} />}
        />
      </div>

      <BatchPreflightPanel summary={preflightSummary} />

      <div className="flex items-center justify-between border-t border-border pt-8">
        <p className="text-sm italic text-subtle">
          {canStart
            ? 'Everything is matched. Review the batch when you are ready.'
            : 'Add both inputs and resolve any missing or extra files to continue.'}
        </p>
        <button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          className="app-solid-button min-w-44 items-center gap-2 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Upload size={14} />
          Review
        </button>
      </div>

      <input
        ref={manifestInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(event) => event.target.files && onManifestUpload(event.target.files)}
      />
      <input
        ref={imagesInputRef}
        type="file"
        accept={BATCH_LABEL_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => event.target.files && onImagesUpload(event.target.files)}
      />
    </PageShell>
  );
}

function BatchProcessingStage({ progress }: { progress: BatchProgressState }) {
  const progressPercent =
    progress.totalCount === 0
      ? 0
      : Math.round((progress.processedCount / progress.totalCount) * 100);

  return (
    <PageShell className="app-stage max-w-4xl space-y-16 py-16">
      <div className="space-y-8">
        <BackLink href="/">Back</BackLink>
        <PageHeading
          eyebrow="Batch Review"
          title="Reviewing Batch"
          subtitle="Running the same label comparison flow for each manifest row and matching label file."
          className="border-b-0 pb-0"
        />
      </div>

      <div className="app-panel p-[var(--batch-processing-padding)] text-center">
        <div className="relative z-10 mx-auto max-w-sm space-y-8">
          <div className="relative h-px overflow-hidden bg-[#E3DBCF]">
            <div
              className="absolute inset-y-0 left-0 bg-fg transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-fg">
              {progress.processedCount} of {progress.totalCount} reviews completed
            </p>
            <p className="text-sm leading-6 text-subtle">
              {progress.currentLabel
                ? `Most recent file: ${progress.currentLabel}`
                : 'Preparing batch review jobs.'}
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function createFailedBatchReview({
  application,
  batchId,
  errorMessage,
  file,
}: {
  application: BatchManifestItem['application'];
  batchId: string;
  errorMessage: string;
  file: File;
}): StatelessReviewResult {
  return {
    application,
    batch_id: batchId,
    created_at: new Date().toISOString(),
    error_message: errorMessage,
    extraction_raw: null,
    field_results: [],
    id: `review_${crypto.randomUUID()}`,
    label: {
      file_size_bytes: file.size,
      file_store_id: null,
      filename: file.name,
      mime_type: file.type,
    },
    latency_ms: 0,
    source: 'batch',
    status: 'failed_system',
    summary: { fail: 0, needs_review: 0, pass: 0, skipped: 0 },
  };
}

function toSessionBatchItem({
  batchId,
  manifestItem,
  review,
}: {
  batchId: string;
  manifestItem: BatchManifestItem;
  review: SessionReviewRecord;
}): SessionBatchItem {
  return {
    application: manifestItem.application,
    batch_id: batchId,
    created_at: review.created_at,
    error_message: review.error_message,
    external_reference: manifestItem.external_reference,
    id: `${batchId}:${manifestItem.row_number}`,
    label_filename: manifestItem.label_filename,
    review_id: review.id,
    review_status: review.status,
    review_summary: review.summary,
    row_number: manifestItem.row_number,
    status: review.status === 'failed_system' ? 'failed' : 'completed',
  };
}

function buildBatchFileErrorMessage(missingFilenames: string[], extraFiles: File[]): string {
  const problems: string[] = [];

  if (missingFilenames.length > 0) {
    const preview = missingFilenames.slice(0, 3).join(', ');
    const suffix = missingFilenames.length > 3 ? `, and ${missingFilenames.length - 3} more` : '';
    problems.push(`Missing label files for: ${preview}${suffix}.`);
  }

  if (extraFiles.length > 0) {
    const preview = extraFiles
      .slice(0, 3)
      .map((file) => file.name)
      .join(', ');
    const suffix = extraFiles.length > 3 ? `, and ${extraFiles.length - 3} more` : '';
    problems.push(`These uploaded files are not listed in the manifest: ${preview}${suffix}.`);
  }

  return problems.join(' ');
}

async function runBatchReviews({
  batchId,
  onProgress,
  runItems,
}: {
  batchId: string;
  onProgress: (progress: BatchProgressState) => void;
  runItems: BatchRunItem[];
}): Promise<BatchRunResult[]> {
  const results: BatchRunResult[] = new Array(runItems.length);
  let completedCount = 0;
  let nextIndex = 0;

  const workerCount = Math.min(BATCH_CONCURRENCY, runItems.length);

  async function processItem(runItem: BatchRunItem): Promise<BatchRunResult> {
    const { file, manifestItem } = runItem;

    try {
      const reviewResponse = await submitReviewRequest(manifestItem.application, file, {
        batchId,
        source: 'batch',
      });
      const storedReview = await persistSessionReview(reviewResponse, file);

      return {
        item: toSessionBatchItem({
          batchId,
          manifestItem,
          review: storedReview,
        }),
        review: storedReview,
      };
    } catch (error) {
      const reviewResponse = createFailedBatchReview({
        application: manifestItem.application,
        batchId,
        errorMessage:
          error instanceof Error ? error.message : 'The review could not be completed.',
        file,
      });
      const storedReview = await persistSessionReview(reviewResponse, file);

      return {
        item: toSessionBatchItem({
          batchId,
          manifestItem,
          review: storedReview,
        }),
        review: storedReview,
      };
    }
  }

  async function worker(): Promise<void> {
    while (nextIndex < runItems.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      const runItem = runItems[currentIndex];
      const result = await processItem(runItem);
      results[currentIndex] = result;

      completedCount += 1;
      onProgress({
        currentLabel: runItem.manifestItem.label_filename,
        processedCount: completedCount,
        totalCount: runItems.length,
      });
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export function BatchPage() {
  const [batch, setBatch] = useState<SessionBatchRecord | null>(null);
  const [batchReviews, setBatchReviews] = useState<SessionReviewRecord[]>([]);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [imagesLabel, setImagesLabel] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [manifestItems, setManifestItems] = useState<BatchManifestItem[]>([]);
  const [manifestName, setManifestName] = useState<string | null>(null);
  const [progress, setProgress] = useState<BatchProgressState>({
    currentLabel: null,
    processedCount: 0,
    totalCount: 0,
  });
  const [stage, setStage] = useState<BatchStage>('upload');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hasImages = imageFiles.length > 0;
  const hasManifest = manifestItems.length > 0;
  const preflightSummary = useMemo<BatchPreflightSummary>(() => {
    if (!hasManifest && !hasImages) {
      return {
        extraCount: 0,
        extraFilenames: [],
        fileCount: 0,
        manifestCount: 0,
        matchedCount: 0,
        missingCount: 0,
        missingFilenames: [],
        ready: false,
      };
    }

    if (!hasManifest) {
      return {
        extraCount: imageFiles.length,
        extraFilenames: imageFiles.map((file) => file.name),
        fileCount: imageFiles.length,
        manifestCount: 0,
        matchedCount: 0,
        missingCount: 0,
        missingFilenames: [],
        ready: false,
      };
    }

    if (!hasImages) {
      return {
        extraCount: 0,
        extraFilenames: [],
        fileCount: 0,
        manifestCount: manifestItems.length,
        matchedCount: 0,
        missingCount: manifestItems.length,
        missingFilenames: manifestItems.map((item) => item.label_filename),
        ready: false,
      };
    }

    const matchedFiles = matchBatchFiles(manifestItems, imageFiles);
    return {
      extraCount: matchedFiles.extraFiles.length,
      extraFilenames: matchedFiles.extraFiles.map((file) => file.name),
      fileCount: imageFiles.length,
      manifestCount: manifestItems.length,
      matchedCount: matchedFiles.filesByLabelFilename.size,
      missingCount: matchedFiles.missingFilenames.length,
      missingFilenames: matchedFiles.missingFilenames,
      ready:
        matchedFiles.extraFiles.length === 0 &&
        matchedFiles.missingFilenames.length === 0,
    };
  }, [hasImages, hasManifest, imageFiles, manifestItems]);
  const canStart = hasManifest && hasImages && preflightSummary.ready;

  const resetBatch = () => {
    setBatch(null);
    setBatchReviews([]);
    setImagesError(null);
    setImagesLabel(null);
    setImageFiles([]);
    setManifestError(null);
    setManifestItems([]);
    setManifestName(null);
    setProgress({
      currentLabel: null,
      processedCount: 0,
      totalCount: 0,
    });
    setStage('upload');
    setSubmitError(null);
  };

  const handleManifestUpload = (files: FileList) => {
    const file = files[0];
    if (!file) {
      return;
    }

    setManifestError(null);
    setSubmitError(null);

    void (async () => {
      try {
        const parsedManifest = await parseBatchManifest(file);
        setManifestItems(parsedManifest);
        setManifestName(file.name);
      } catch (error) {
        setManifestItems([]);
        setManifestName(null);
        setManifestError(
          error instanceof Error ? error.message : 'The CSV manifest could not be read.'
        );
      }
    })();
  };

  const handleImagesUpload = (files: FileList) => {
    if (!files.length) {
      return;
    }

    setImagesError(null);
    setSubmitError(null);

    try {
      const fileList = Array.from(files);
      validateBatchLabelFiles(fileList);
      setImageFiles(fileList);
      setImagesLabel(
        fileList.length === 1 ? fileList[0].name : `${fileList.length} label files added`
      );
    } catch (error) {
      setImageFiles([]);
      setImagesLabel(null);
      setImagesError(
        error instanceof Error ? error.message : 'The label files could not be used.'
      );
    }
  };

  const startBatch = async () => {
    if (!hasManifest || !hasImages) {
      return;
    }

    const matchedFiles = matchBatchFiles(manifestItems, imageFiles);
    if (matchedFiles.missingFilenames.length > 0 || matchedFiles.extraFiles.length > 0) {
      setSubmitError(
        buildBatchFileErrorMessage(
          matchedFiles.missingFilenames,
          matchedFiles.extraFiles
        )
      );
      return;
    }

    const batchId = `batch_${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const runItems = manifestItems.map((manifestItem) => ({
      file: matchedFiles.filesByLabelFilename.get(manifestItem.label_filename)!,
      manifestItem,
    }));

    setStage('processing');
    setProgress({
      currentLabel: null,
      processedCount: 0,
      totalCount: runItems.length,
    });
    setSubmitError(null);

    try {
      const results = await runBatchReviews({
        batchId,
        onProgress: setProgress,
        runItems,
      });

      const reviews = results.map((result) => result.review);
      const batchRecord: SessionBatchRecord = {
        completed_at: new Date().toISOString(),
        concurrency: BATCH_CONCURRENCY,
        created_at: createdAt,
        failed_items: results.filter((result) => result.item.status === 'failed').length,
        id: batchId,
        items: results.map((result) => result.item),
        name: manifestName?.replace(/\.csv$/i, '') || 'Batch Review',
        processed_items: results.length,
        status: 'completed',
        total_items: results.length,
      };

      saveSessionBatch(batchRecord);
      setBatch(batchRecord);
      setBatchReviews(reviews);
      setStage('result');
    } catch (error) {
      setStage('upload');
      setSubmitError(
        error instanceof Error ? error.message : 'The batch review could not be completed.'
      );
    }
  };

  if (stage === 'upload') {
    return (
      <BatchUploadStage
        canStart={canStart}
        hasManifest={hasManifest}
        hasImages={hasImages}
        imageFiles={imageFiles}
        imagesError={imagesError}
        imagesLabel={imagesLabel}
        manifestError={manifestError}
        manifestName={manifestName}
        onImagesUpload={handleImagesUpload}
        onManifestUpload={handleManifestUpload}
        onStart={() => void startBatch()}
        preflightSummary={preflightSummary}
        submitError={submitError}
      />
    );
  }

  if (stage === 'processing') {
    return <BatchProcessingStage progress={progress} />;
  }

  if (!batch) {
    return null;
  }

  return (
    <BatchResultView
      batch={batch}
      onStartNew={resetBatch}
      reviews={batchReviews}
    />
  );
}
