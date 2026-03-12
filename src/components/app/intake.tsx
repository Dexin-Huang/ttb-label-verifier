'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { AlertCircle, Check, CircleHelp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface IntakeHelpItem {
  label: string;
  value: string;
}

export function IntakeStepCard({
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

export function IntakeUploadCard({
  title,
  description,
  actionLabel,
  helperText,
  acceptedFormats,
  completeDetails,
  examplePreview,
  helpItems,
  helpTitle,
  icon,
  complete,
  active,
  errorMessage,
  onClick,
  onDropFiles,
  onReplace,
}: {
  title: string;
  description: string;
  actionLabel: string;
  helperText: string;
  acceptedFormats: string[];
  completeDetails?: ReactNode;
  examplePreview?: ReactNode;
  helpItems: IntakeHelpItem[];
  helpTitle: string;
  icon: ReactNode;
  complete: boolean;
  active: boolean;
  errorMessage?: string | null;
  onClick: () => void;
  onDropFiles: (files: FileList) => void;
  onReplace?: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const helpRegionRef = useRef<HTMLDivElement>(null);
  const helpPanelId = useId();

  useEffect(() => {
    if (!showHelp) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!helpRegionRef.current?.contains(target)) {
        setShowHelp(false);
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowHelp(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showHelp]);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files?.length) {
      onDropFiles(event.dataTransfer.files);
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setShowHelp(false);
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        setShowHelp(false);
        onClick();
      }}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        'group relative flex w-full cursor-pointer flex-col overflow-visible border bg-surface p-7 text-left transition-colors hover:bg-hover md:min-h-[18rem] md:p-8',
        complete
          ? 'border-pass bg-[#EEF8F1]'
          : errorMessage
            ? 'border-fail bg-[#FFF8F8]'
            : dragOver
              ? 'border-emerald-500 bg-[#F7FFF9] shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_0_28px_rgba(16,185,129,0.16)]'
              : active
                ? 'border-emerald-500 bg-surface shadow-[0_0_0_1px_rgba(16,185,129,0.45),0_0_32px_rgba(16,185,129,0.18)]'
                : 'border-border'
      )}
    >
      <div className="flex items-start justify-between gap-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="app-data-label">{title}</p>
            {complete ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-pass px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-surface">
                <Check size={12} />
                Added
              </span>
            ) : null}
          </div>
          <h2
            className={cn(
              'display-serif text-[1.8rem] leading-[1.12] tracking-[0.01em]',
              complete ? 'text-pass' : errorMessage ? 'text-fail' : undefined
            )}
          >
            {title}
          </h2>
          <p className="max-w-sm text-sm leading-6 text-subtle">{description}</p>
        </div>

        <div ref={helpRegionRef} className="relative shrink-0">
          <div className="flex items-center gap-2">
            {complete ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowHelp(false);
                  (onReplace ?? onClick)();
                }}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted transition-colors hover:border-fg hover:text-fg"
              >
                Replace
              </button>
            ) : null}

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowHelp((current) => !current);
              }}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted transition-colors hover:border-fg hover:text-fg"
              aria-controls={helpPanelId}
              aria-expanded={showHelp}
            >
              <CircleHelp size={14} />
              Help
            </button>
          </div>

          {showHelp ? (
            <div
              id={helpPanelId}
              role="dialog"
              aria-label={helpTitle}
              onClick={(event) => event.stopPropagation()}
              className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[min(24rem,calc(100vw-3rem))] space-y-3 rounded-[1.1rem] border border-border bg-[rgba(255,252,248,0.98)] px-4 py-4 shadow-[0_20px_40px_-28px_rgba(32,24,12,0.45)] backdrop-blur-md"
            >
              <div className="absolute right-5 top-0 size-3 -translate-y-1/2 rotate-45 border-l border-t border-border bg-[rgba(255,252,248,0.98)]" />
              <p className="relative text-[10px] font-bold uppercase tracking-[0.16em] text-fg">
                {helpTitle}
              </p>
              {examplePreview ? <div className="relative">{examplePreview}</div> : null}
              <div className="relative space-y-2">
                {helpItems.map((item) => (
                  <div
                    key={item.label}
                    className="grid gap-1 md:grid-cols-[8.5rem_minmax(0,1fr)] md:gap-3"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                      {item.label}
                    </p>
                    <p className="text-sm leading-6 text-subtle">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {acceptedFormats.map((format) => (
          <span
            key={format}
            className="rounded-full border border-border bg-surface-muted px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted"
          >
            {format}
          </span>
        ))}
      </div>

      {completeDetails ? (
        <div className="mt-5 rounded-[1rem] border border-border bg-[rgba(255,255,255,0.78)] px-4 py-4">
          {completeDetails}
        </div>
      ) : null}

      <div className="mt-auto flex w-full items-end justify-between gap-6 pt-8">
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
            {complete ? 'Ready' : actionLabel}
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
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 border border-fail/25 bg-[#FFF8F8] px-4 py-4 text-sm text-fail">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
