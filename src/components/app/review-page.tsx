'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { FileText, ImagePlus, Upload } from 'lucide-react';
import type { CreateApplicationRequest, SessionReviewRecord } from '@/lib/types';
import { parseApplicationUpload } from '@/lib/application-upload';
import { submitReviewRequest } from '@/lib/review-request';
import { persistSessionReview } from '@/lib/review-session';
import { PageShell, SectionEyebrow } from './chrome';
import { InlineError, IntakeStepCard, IntakeUploadCard } from './intake';
import { ReviewResultView } from './review-result';

type ReviewStage = 'upload' | 'processing' | 'result';

const FORM_HELP_ITEMS = [
  {
    label: 'Prototype Input',
    value:
      'Use the structured application record exported from the form system for this label.',
  },
  {
    label: 'Example',
    value:
      'GOOD TIMES | STRAIGHT RYE WHISKEY | 57.5% ALC./VOL. 115 PROOF | 750ML',
  },
  {
    label: 'Required Fields',
    value:
      'Brand name, class / type, alcohol content, net contents, and bottler / producer details.',
  },
  {
    label: 'Accepted',
    value: '.json or single-row .csv',
  },
];

const IMAGE_HELP_ITEMS = [
  {
    label: 'Use This File',
    value:
      'Upload the label artwork image or PDF that should match the application form.',
  },
  {
    label: 'Example',
    value:
      'A label image where the brand name, class / type, alcohol content, net contents, and warning statement are readable.',
  },
  {
    label: 'What To Show',
    value:
      'The file should make the brand name, class / type, alcohol content, net contents, and warning statement readable.',
  },
  {
    label: 'Accepted',
    value: '.png, .jpg, .jpeg, or .pdf',
  },
];

const LABEL_ACCEPT = 'image/png,image/jpeg,image/jpg,application/pdf';
const LABEL_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];

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

function FormExamplePreview() {
  return (
    <div className="rounded-[1rem] border border-border bg-surface px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
        Example record
      </p>
      <div className="mt-3 grid gap-2">
        {[
          ['brand_name', 'GOOD TIMES'],
          ['class_type', 'STRAIGHT RYE WHISKEY'],
          ['alcohol_content', '57.5% ALC./VOL. 115 PROOF'],
          ['net_contents', '750ML'],
        ].map(([label, value]) => (
          <div
            key={label}
            className="grid gap-1 rounded-[0.8rem] bg-surface-muted px-3 py-2 md:grid-cols-[7.5rem_minmax(0,1fr)]"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              {label}
            </p>
            <p className="text-sm leading-6 text-fg">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LabelExamplePreview() {
  return (
    <div className="rounded-[1rem] border border-border bg-surface px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
        Example label
      </p>
      <div className="mt-3 flex items-start gap-4">
        <div className="flex h-24 w-[4.5rem] shrink-0 items-center justify-center rounded-[0.9rem] border border-border bg-surface-muted px-3 text-center">
          <div className="space-y-1">
            <p className="display-serif text-base leading-none text-fg">GOOD TIMES</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">
              57.5%
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm leading-6 text-fg">
            The label should clearly show the brand name, class / type, alcohol content,
            net contents, and warning statement.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Brand', 'Alcohol', 'Net Contents', 'Warning'].map((item) => (
              <span
                key={item}
                className="rounded-full border border-border bg-surface-muted px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ApplicationReceipt({
  application,
  filename,
}: {
  application: CreateApplicationRequest | null;
  filename: string | null;
}) {
  if (!application) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-pass">
          Parsed successfully
        </p>
        {filename ? (
          <p className="text-xs leading-5 text-muted">{filename}</p>
        ) : null}
      </div>
      <ReceiptGrid
        items={[
          { label: 'Brand', value: application.brand_name },
          { label: 'Class / Type', value: application.class_type },
          { label: 'Alcohol', value: application.alcohol_content },
          { label: 'Net Contents', value: application.net_contents },
        ]}
      />
    </div>
  );
}

function LabelReceipt({
  imageName,
  previewUrl,
}: {
  imageName: string | null;
  previewUrl: string | null;
}) {
  if (!imageName) {
    return null;
  }

  const isPdf = previewUrl === null;

  return (
    <div className="flex items-start gap-4">
      {isPdf ? (
        <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-[0.8rem] border border-border bg-surface-muted text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
          PDF
        </div>
      ) : (
        <Image
          src={previewUrl ?? ''}
          alt="Uploaded label preview"
          width={48}
          height={64}
          unoptimized
          className="h-16 w-12 shrink-0 rounded-[0.8rem] border border-border object-cover"
        />
      )}

      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-pass">
          Ready to review
        </p>
        <p className="text-sm leading-6 text-fg">{imageName}</p>
      </div>
    </div>
  );
}

function getInstruction(hasForm: boolean, hasImage: boolean) {
  if (!hasForm) {
    return {
      detail: 'Upload the structured application data for this label.',
      title: 'Add the application form.',
    };
  }

  if (!hasImage) {
    return {
      detail: 'Upload the label image or PDF that should match the application form.',
      title: 'Add the label image.',
    };
  }

  return {
    detail: 'Both files are ready. Review the application form and label image together.',
    title: 'Ready to review.',
  };
}

function ReviewUploadStage({
  application,
  applicationError,
  errorMessage,
  formName,
  hasForm,
  hasImage,
  imageError,
  imageName,
  labelPreviewUrl,
  onFormUpload,
  onImageUpload,
  onStart,
}: {
  application: CreateApplicationRequest | null;
  applicationError: string | null;
  errorMessage: string | null;
  formName: string | null;
  hasForm: boolean;
  hasImage: boolean;
  imageError: string | null;
  imageName: string | null;
  labelPreviewUrl: string | null;
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
        <IntakeStepCard
          label="Application Form"
          stepNumber={1}
          done={hasForm}
          current={!hasForm}
        />
        <IntakeStepCard
          label="Label Image"
          stepNumber={2}
          done={hasImage}
          current={hasForm && !hasImage}
        />
      </div>

      <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-2">
        <IntakeUploadCard
          title="Application Form"
          description="Upload the structured application data for this label."
          actionLabel="Upload Form"
          helperText={formName ?? 'Drag and drop a .json or .csv file, or browse'}
          acceptedFormats={['.json', '.csv']}
          completeDetails={
            hasForm ? <ApplicationReceipt application={application} filename={formName} /> : null
          }
          examplePreview={<FormExamplePreview />}
          helpItems={FORM_HELP_ITEMS}
          helpTitle="What should this file look like?"
          complete={hasForm}
          active={!hasForm}
          errorMessage={applicationError}
          onClick={() => formInputRef.current?.click()}
          onDropFiles={onFormUpload}
          onReplace={() => formInputRef.current?.click()}
          icon={<FileText size={20} />}
        />
        <IntakeUploadCard
          title="Label Image"
          description="Upload the label artwork that should match the application form."
          actionLabel="Upload Image"
          helperText={imageName ?? 'Drag and drop a .png, .jpg, or .pdf file, or browse'}
          acceptedFormats={['.png', '.jpg', '.pdf']}
          completeDetails={
            hasImage ? <LabelReceipt imageName={imageName} previewUrl={labelPreviewUrl} /> : null
          }
          examplePreview={<LabelExamplePreview />}
          helpItems={IMAGE_HELP_ITEMS}
          helpTitle="What should this file show?"
          complete={hasImage}
          active={hasForm && !hasImage}
          errorMessage={imageError}
          onClick={() => imageInputRef.current?.click()}
          onDropFiles={onImageUpload}
          onReplace={() => imageInputRef.current?.click()}
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
        application={application}
        applicationError={applicationError}
        errorMessage={submitError}
        formName={formName}
        hasForm={hasForm}
        hasImage={hasImage}
        imageError={imageError}
        imageName={imageName}
        labelPreviewUrl={labelPreviewUrl}
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
