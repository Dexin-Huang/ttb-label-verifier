'use client';

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { Check, ChevronRight, FileSpreadsheet, Images, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BackLink, PageHeading, PageShell, SectionEyebrow } from './chrome';
import { BATCH_RESULTS, type BatchResultItem } from './mock-data';
import { STATUS_TONE_STYLES, StatusBadge } from './status';

type BatchStage = 'upload' | 'processing' | 'result';
const BATCH_LABEL_ACCEPT = 'image/png,image/jpeg,image/jpg,application/pdf';

function StepCard({
  label,
  stepNumber,
  done,
  current,
}: {
  label: string;
  stepNumber: number;
  done?: boolean;
  current?: boolean;
}) {
  return (
    <div className={cn('bg-surface px-5 py-4', done ? 'bg-[#F4FBF6]' : undefined)}>
      <div className="flex items-center gap-3">
        {done ? (
          <div className="flex size-6 items-center justify-center rounded-full border border-pass bg-pass text-surface">
            <Check size={14} />
          </div>
        ) : (
          <span
            className={cn(
              'inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]',
              current
                ? 'border-emerald-500 bg-[#F2FFF6] text-emerald-700'
                : 'border-border text-muted'
            )}
          >
            {`Step ${stepNumber}`}
          </span>
        )}
        <span
          className={cn(
            'text-[10px] font-bold uppercase tracking-[0.18em]',
            done ? 'text-pass' : current ? 'text-fg' : 'text-muted'
          )}
        >
          {done ? `${label} Added` : label}
        </span>
      </div>
    </div>
  );
}

function UploadCard({
  title,
  description,
  actionLabel,
  helperText,
  icon,
  complete,
  active,
  onClick,
  onDropFiles,
}: {
  title: string;
  description: string;
  actionLabel: string;
  helperText: string;
  icon: ReactNode;
  complete: boolean;
  active: boolean;
  onClick: () => void;
  onDropFiles: (files: FileList) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files?.length) {
      onDropFiles(event.dataTransfer.files);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        'group relative flex w-full cursor-pointer flex-col items-start justify-between overflow-hidden border bg-surface p-8 text-left transition-colors hover:bg-hover md:min-h-[18rem] md:p-10',
        complete
          ? 'border-pass bg-[#F4FBF6]'
          : dragOver
            ? 'border-emerald-500 bg-[#F7FFF9] shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_0_28px_rgba(16,185,129,0.16)]'
            : active
              ? 'border-emerald-500 bg-surface shadow-[0_0_0_1px_rgba(16,185,129,0.45),0_0_32px_rgba(16,185,129,0.18)]'
              : 'border-border'
      )}
    >
      <div className="space-y-3">
        <p className="app-data-label">{title}</p>
        <h2
          className={cn(
            'display-serif text-[2rem] leading-[1.12] tracking-[0.01em]',
            complete ? 'text-pass' : undefined
          )}
        >
          {complete ? 'Done' : title}
        </h2>
        <p className="max-w-sm text-sm leading-6 text-subtle">{description}</p>
      </div>

      <div className="flex w-full items-end justify-between gap-6 pt-10">
        <div className="space-y-2">
          <p
            className={cn(
              'text-[10px] font-bold uppercase tracking-[0.18em] transition-opacity',
              complete ? 'text-pass' : 'text-fg opacity-60 group-hover:opacity-100'
            )}
          >
            {complete ? 'Added' : actionLabel}
          </p>
          <p className="text-xs leading-5 text-muted">{helperText}</p>
        </div>
        <div
          className={cn(
            'flex size-12 items-center justify-center border transition-colors',
            complete
              ? 'border-pass bg-pass text-surface'
              : 'border-border text-muted group-hover:bg-fg group-hover:text-surface'
          )}
        >
          {complete ? <Check size={18} /> : icon}
        </div>
      </div>
    </button>
  );
}

function getInstruction(hasManifest: boolean, hasImages: boolean) {
  if (!hasManifest) {
    return {
      detail:
        'Upload the file that lists each application record for the batch.',
      title: 'Please add the CSV manifest.',
    };
  }

  if (!hasImages) {
    return {
      detail:
        'The manifest is ready. Upload the individual label files that match the CSV records.',
      title: 'Please add the label images.',
    };
  }

  return {
    detail:
      'Both files are ready. Review the CSV manifest and label images together.',
    title: 'Everything is ready.',
  };
}

function BatchUploadStage({
  hasManifest,
  hasImages,
  imagesLabel,
  manifestName,
  onManifestUpload,
  onImagesUpload,
  onStart,
}: {
  hasManifest: boolean;
  hasImages: boolean;
  imagesLabel: string | null;
  manifestName: string | null;
  onManifestUpload: (files: FileList) => void;
  onImagesUpload: (files: FileList) => void;
  onStart: () => void;
}) {
  const manifestInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);
  const instruction = getInstruction(hasManifest, hasImages);

  return (
    <PageShell className="app-stage max-w-5xl space-y-10 py-10 md:space-y-12 md:py-12">
      <div className="space-y-4">
        <SectionEyebrow>Batch Review</SectionEyebrow>
        <p className="display-serif text-[1.95rem] leading-[1.22] tracking-[0.01em] md:text-[2.2rem]">
          {instruction.title}
        </p>
        <p className="max-w-2xl text-sm leading-6 text-subtle">{instruction.detail}</p>
      </div>

      <div className="app-grid-frame grid grid-cols-1 gap-px md:grid-cols-2">
        <StepCard
          label="CSV Manifest"
          stepNumber={1}
          done={hasManifest}
          current={!hasManifest}
        />
        <StepCard
          label="Label Images"
          stepNumber={2}
          done={hasImages}
          current={hasManifest && !hasImages}
        />
      </div>

      <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-2">
        <UploadCard
          title="CSV Manifest"
          description="The CSV file with one application record per row. Use the required manifest column format."
          actionLabel="Upload CSV"
          helperText={manifestName ?? 'Drag and drop a .csv file, or browse'}
          complete={hasManifest}
          active={!hasManifest}
          onClick={() => manifestInputRef.current?.click()}
          onDropFiles={onManifestUpload}
          icon={<FileSpreadsheet size={20} />}
        />
        <UploadCard
          title="Label Images"
          description="The individual PNG, JPG, or PDF label files listed in the CSV manifest. Upload the files directly, not as a zip."
          actionLabel="Upload Images"
          helperText={imagesLabel ?? 'Drag and drop .png, .jpg, or .pdf files, or browse'}
          complete={hasImages}
          active={hasManifest && !hasImages}
          onClick={() => imagesInputRef.current?.click()}
          onDropFiles={onImagesUpload}
          icon={<Images size={20} />}
        />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-8">
        <p className="text-sm italic text-subtle">
          {hasManifest && hasImages
            ? 'CSV manifest and label images added.'
            : 'Add both files to continue.'}
        </p>
        <button
          type="button"
          onClick={onStart}
          disabled={!hasManifest || !hasImages}
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

function BatchProcessingStage({ progress }: { progress: number }) {
  return (
    <PageShell className="app-stage max-w-4xl space-y-16 py-16">
      <div className="space-y-8">
        <BackLink href="/">Back</BackLink>
        <PageHeading
          eyebrow="Batch Review"
          title="CSV Manifest and Label Images"
          subtitle="Comparing the manifest to the uploaded image set."
          className="border-b-0 pb-0"
        />
      </div>

      <div className="app-panel p-20 text-center md:p-28">
        <div className="relative z-10 mx-auto max-w-sm space-y-8">
          <div className="relative h-px overflow-hidden bg-[#E3DBCF]">
            <div
              className="absolute inset-y-0 left-0 bg-fg transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-fg">
            Comparing Manifest and Images
          </p>
        </div>
      </div>
    </PageShell>
  );
}

function BatchStat({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: keyof typeof STATUS_TONE_STYLES;
}) {
  return (
    <div className="bg-surface p-8">
      <p className={`font-serif text-4xl ${STATUS_TONE_STYLES[tone].accentTextClass}`}>
        {count}
      </p>
      <p
        className={`mt-2 text-[10px] font-bold uppercase tracking-[0.18em] ${STATUS_TONE_STYLES[tone].accentTextClass}`}
      >
        {label}
      </p>
    </div>
  );
}

function BatchResultRow({ item }: { item: BatchResultItem }) {
  return (
    <Link
      href={item.href}
      className="group grid grid-cols-1 gap-6 bg-surface p-8 transition-colors hover:bg-bg md:grid-cols-[1.7fr_1fr_1fr_auto] md:items-center"
    >
      <div>
        <p className="app-data-label">Brand Name</p>
        <p className="mt-1 font-serif text-2xl text-fg">{item.brand}</p>
      </div>
      <div>
        <p className="app-data-label">Class / Type</p>
        <p className="mt-1 text-sm text-subtle">{item.type}</p>
      </div>
      <div>
        <p className="app-data-label">Status</p>
        <StatusBadge
          tone={item.tone}
          label={item.label}
          emphasize
          className="mt-2"
        />
      </div>
      <div className="flex items-center justify-between gap-6 md:justify-end">
        <div className="text-right">
          <p className="app-data-label">ID</p>
          <p className="mt-1 font-serif text-xs italic text-fg">{item.id}</p>
        </div>
        <ChevronRight
          size={18}
          className="text-border transition-colors group-hover:text-fg"
        />
      </div>
    </Link>
  );
}

function BatchResultStage({
  onReset,
}: {
  onReset: () => void;
}) {
  const passCount = BATCH_RESULTS.filter((item) => item.tone === 'pass').length;
  const reviewCount = BATCH_RESULTS.filter((item) => item.tone === 'review').length;
  const failCount = BATCH_RESULTS.filter((item) => item.tone === 'fail').length;

  return (
    <PageShell className="app-stage max-w-5xl space-y-16">
      <PageHeading
        eyebrow="Batch Review"
        title="Batch Review Results"
        subtitle="Review the batch queue after comparing the CSV manifest to the label images."
        actions={
          <button type="button" onClick={onReset} className="app-outline-button">
            New Batch
          </button>
        }
      />

      <section className="app-grid-frame grid grid-cols-1 gap-px md:grid-cols-3">
        <BatchStat count={passCount} label="Pass" tone="pass" />
        <BatchStat count={reviewCount} label="Needs Review" tone="review" />
        <BatchStat count={failCount} label="Likely Fail" tone="fail" />
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-border pb-6">
          <SectionEyebrow>Dashboard</SectionEyebrow>
          <button type="button" className="app-solid-button">
            Export CSV
          </button>
        </div>

        <div className="app-grid-frame space-y-px">
          {BATCH_RESULTS.map((item) => (
            <BatchResultRow key={item.id} item={item} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}

export function BatchPage() {
  const [stage, setStage] = useState<BatchStage>('upload');
  const [manifestName, setManifestName] = useState<string | null>(null);
  const [imagesLabel, setImagesLabel] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const hasManifest = Boolean(manifestName);
  const hasImages = Boolean(imagesLabel);

  useEffect(() => {
    if (stage !== 'processing') {
      return;
    }

    const intervalId = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 100) {
          window.clearInterval(intervalId);
          return 100;
        }

        return current + 5;
      });
    }, 50);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== 'processing' || progress < 100) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStage('result');
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [progress, stage]);

  const handleManifestUpload = (files: FileList) => {
    const file = files[0];
    if (!file) {
      return;
    }

    setManifestName(file.name);
  };

  const handleImagesUpload = (files: FileList) => {
    if (!files.length) {
      return;
    }

    setImagesLabel(
      files.length === 1 ? files[0].name : `${files.length} image files added`
    );
  };

  if (stage === 'upload') {
    return (
      <BatchUploadStage
        hasManifest={hasManifest}
        hasImages={hasImages}
        imagesLabel={imagesLabel}
        manifestName={manifestName}
        onManifestUpload={handleManifestUpload}
        onImagesUpload={handleImagesUpload}
        onStart={() => {
          setProgress(0);
          setStage('processing');
        }}
      />
    );
  }

  if (stage === 'processing') {
    return <BatchProcessingStage progress={progress} />;
  }

  return (
    <BatchResultStage
      onReset={() => {
        setManifestName(null);
        setImagesLabel(null);
        setProgress(0);
        setStage('upload');
      }}
    />
  );
}
