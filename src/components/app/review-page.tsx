'use client';

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react';
import { AlertCircle, Check, FileText, ImagePlus, Upload } from 'lucide-react';
import type { CreateApplicationRequest, SessionReviewRecord } from '@/lib/types';
import { parseApplicationUpload } from '@/lib/application-upload';
import { submitReviewRequest } from '@/lib/review-request';
import { persistSessionReview } from '@/lib/review-session';
import { cn } from '@/lib/utils';
import { PageShell, SectionEyebrow } from './chrome';
import { ReviewResultView } from './review-result';

type ReviewStage = 'upload' | 'processing' | 'result';

const LABEL_ACCEPT = 'image/png,image/jpeg,image/jpg,application/pdf';
const LABEL_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];

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
  errorMessage,
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
  errorMessage?: string | null;
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
        'group relative flex w-full cursor-pointer flex-col items-start justify-between overflow-hidden border bg-surface p-7 text-left transition-colors hover:bg-hover md:min-h-[15rem] md:p-8',
        complete
          ? 'border-pass bg-[#F4FBF6]'
          : errorMessage
            ? 'border-fail bg-[#FFF8F8]'
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
            'display-serif text-[1.8rem] leading-[1.12] tracking-[0.01em]',
            complete ? 'text-pass' : errorMessage ? 'text-fail' : undefined
          )}
        >
          {complete ? 'Done' : title}
        </h2>
        <p className="max-w-sm text-sm leading-6 text-subtle">{description}</p>
      </div>

      <div className="w-full space-y-3 pt-8">
        <div className="flex w-full items-end justify-between gap-6">
          <div className="space-y-2">
            <p
              className={cn(
                'text-[10px] font-bold uppercase tracking-[0.18em] transition-opacity',
                complete
                  ? 'text-pass'
                  : errorMessage
                    ? 'text-fail'
                    : 'text-fg opacity-60 group-hover:opacity-100'
              )}
            >
              {complete ? 'Added' : actionLabel}
            </p>
            <p className={cn('text-xs leading-5', errorMessage ? 'text-fail' : 'text-muted')}>
              {errorMessage ?? helperText}
            </p>
          </div>
          <div
            className={cn(
              'flex size-12 items-center justify-center border transition-colors',
              complete
                ? 'border-pass bg-pass text-surface'
                : errorMessage
                  ? 'border-fail text-fail'
                  : 'border-border text-muted group-hover:bg-fg group-hover:text-surface'
            )}
          >
            {complete ? <Check size={18} /> : icon}
          </div>
        </div>
      </div>
    </button>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 border border-fail/25 bg-[#FFF8F8] px-4 py-4 text-sm text-fail">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function getInstruction(hasForm: boolean, hasImage: boolean) {
  if (!hasForm) {
    return {
      detail: 'Upload the application record file with the submitted label details.',
      title: 'Please add the application form.',
    };
  }

  if (!hasImage) {
    return {
      detail: 'The application form is ready. Upload the label image for comparison.',
      title: 'Please add the label image.',
    };
  }

  return {
    detail: 'Both files are ready. Review the application form and label image together.',
    title: 'Everything is ready.',
  };
}

function ReviewUploadStage({
  applicationError,
  errorMessage,
  formName,
  hasForm,
  hasImage,
  imageError,
  imageName,
  onFormUpload,
  onImageUpload,
  onStart,
}: {
  applicationError: string | null;
  errorMessage: string | null;
  formName: string | null;
  hasForm: boolean;
  hasImage: boolean;
  imageError: string | null;
  imageName: string | null;
  onFormUpload: (files: FileList) => void;
  onImageUpload: (files: FileList) => void;
  onStart: () => void;
}) {
  const formInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const instruction = getInstruction(hasForm, hasImage);

  return (
    <PageShell className="app-stage max-w-5xl space-y-10 py-10 md:space-y-12 md:py-12">
      <div className="space-y-4">
        <SectionEyebrow>Single Review</SectionEyebrow>
        <p className="display-serif text-[1.95rem] leading-[1.22] tracking-[0.01em] md:text-[2.2rem]">
          {instruction.title}
        </p>
        <p className="max-w-2xl text-sm leading-6 text-subtle">{instruction.detail}</p>
      </div>

      {errorMessage ? <InlineError message={errorMessage} /> : null}

      <div className="app-grid-frame grid grid-cols-1 gap-px md:grid-cols-2">
        <StepCard
          label="Application Form"
          stepNumber={1}
          done={hasForm}
          current={!hasForm}
        />
        <StepCard
          label="Label Image"
          stepNumber={2}
          done={hasImage}
          current={hasForm && !hasImage}
        />
      </div>

      <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-2">
        <UploadCard
          title="Application Form"
          description="Upload a JSON or CSV application record with the submitted brand name, class/type, alcohol content, net contents, and bottler details."
          actionLabel="Upload Form"
          helperText={formName ?? 'Drag and drop a .json or .csv file, or browse'}
          complete={hasForm}
          active={!hasForm}
          errorMessage={applicationError}
          onClick={() => formInputRef.current?.click()}
          onDropFiles={onFormUpload}
          icon={<FileText size={20} />}
        />
        <UploadCard
          title="Label Image"
          description="Upload the label image or PDF to compare against the application form."
          actionLabel="Upload Image"
          helperText={imageName ?? 'Drag and drop a .png, .jpg, or .pdf file, or browse'}
          complete={hasImage}
          active={hasForm && !hasImage}
          errorMessage={imageError}
          onClick={() => imageInputRef.current?.click()}
          onDropFiles={onImageUpload}
          icon={<ImagePlus size={20} />}
        />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-8">
        <p className="text-sm italic text-subtle">
          {hasForm && hasImage
            ? 'Application form and label image added.'
            : 'Add both files to continue.'}
        </p>
        <button
          type="button"
          onClick={onStart}
          disabled={!hasForm || !hasImage}
          className="app-solid-button min-w-40 items-center gap-2 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Upload size={14} />
          Review
        </button>
      </div>

      <input
        ref={formInputRef}
        type="file"
        accept=".json,.csv"
        className="hidden"
        onChange={(event) => event.target.files && onFormUpload(event.target.files)}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept={LABEL_ACCEPT}
        className="hidden"
        onChange={(event) => event.target.files && onImageUpload(event.target.files)}
      />
    </PageShell>
  );
}

function ReviewProcessingStage() {
  return (
    <PageShell className="app-stage flex flex-col items-center py-48">
      <div className="relative h-px w-40 overflow-hidden bg-border">
        <div className="absolute inset-y-0 left-0 w-full animate-[shimmer_2s_infinite] bg-fg" />
      </div>
      <h2 className="mt-10 text-[10px] font-bold uppercase tracking-[0.24em] text-muted">
        Comparing Application Form and Label Image
      </h2>
    </PageShell>
  );
}

export function ReviewPage() {
  const [application, setApplication] = useState<CreateApplicationRequest | null>(null);
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [formName, setFormName] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [labelFile, setLabelFile] = useState<File | null>(null);
  const [labelPreviewUrl, setLabelPreviewUrl] = useState<string | null>(null);
  const [review, setReview] = useState<SessionReviewRecord | null>(null);
  const [stage, setStage] = useState<ReviewStage>('upload');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hasForm = Boolean(application);
  const hasImage = Boolean(labelFile);

  useEffect(() => {
    return () => {
      if (labelPreviewUrl) {
        URL.revokeObjectURL(labelPreviewUrl);
      }
    };
  }, [labelPreviewUrl]);

  const handleFormUpload = (files: FileList) => {
    const file = files[0];
    if (!file) {
      return;
    }

    setApplicationError(null);
    setSubmitError(null);

    void (async () => {
      try {
        const parsedApplication = await parseApplicationUpload(file);
        setApplication(parsedApplication);
        setFormName(file.name);
      } catch (error) {
        setApplication(null);
        setFormName(null);
        setApplicationError(
          error instanceof Error ? error.message : 'The application file could not be read.'
        );
      }
    })();
  };

  const handleImageUpload = (files: FileList) => {
    const file = files[0];
    if (!file) {
      return;
    }

    setImageError(null);
    setSubmitError(null);

    if (!LABEL_ACCEPTED_TYPES.includes(file.type)) {
      if (labelPreviewUrl) {
        URL.revokeObjectURL(labelPreviewUrl);
      }
      setLabelFile(null);
      setLabelPreviewUrl(null);
      setImageName(null);
      setImageError('Use a PNG, JPG, or PDF label file.');
      return;
    }

    if (labelPreviewUrl) {
      URL.revokeObjectURL(labelPreviewUrl);
    }

    setLabelFile(file);
    setImageName(file.name);
    setLabelPreviewUrl(file.type === 'application/pdf' ? null : URL.createObjectURL(file));
  };

  const resetReview = () => {
    if (labelPreviewUrl) {
      URL.revokeObjectURL(labelPreviewUrl);
    }

    setApplication(null);
    setApplicationError(null);
    setFormName(null);
    setImageError(null);
    setImageName(null);
    setLabelFile(null);
    setLabelPreviewUrl(null);
    setReview(null);
    setStage('upload');
    setSubmitError(null);
  };

  const startReview = async () => {
    if (!application || !labelFile) {
      return;
    }

    setStage('processing');
    setSubmitError(null);

    try {
      const reviewResponse = await submitReviewRequest(application, labelFile);
      const storedReview = await persistSessionReview(reviewResponse, labelFile);
      setReview(storedReview);
      setStage('result');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'The review could not be completed.');
      setStage('upload');
    }
  };

  if (stage === 'upload') {
    return (
      <ReviewUploadStage
        applicationError={applicationError}
        errorMessage={submitError}
        formName={formName}
        hasForm={hasForm}
        hasImage={hasImage}
        imageError={imageError}
        imageName={imageName}
        onFormUpload={handleFormUpload}
        onImageUpload={handleImageUpload}
        onStart={() => void startReview()}
      />
    );
  }

  if (stage === 'processing') {
    return <ReviewProcessingStage />;
  }

  if (!review) {
    return null;
  }

  return (
    <ReviewResultView
      review={review}
      imageSrc={labelPreviewUrl}
      onStartNew={resetReview}
    />
  );
}
