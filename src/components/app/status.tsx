import { cn } from '@/lib/utils';
import type { StatusTone } from './types';

export const STATUS_TONE_STYLES: Record<
  StatusTone,
  {
    accentTextClass: string;
    dotClass: string;
  }
> = {
  pass: {
    accentTextClass: 'text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  fail: {
    accentTextClass: 'text-rose-600',
    dotClass: 'bg-rose-500',
  },
  review: {
    accentTextClass: 'text-amber-700',
    dotClass: 'bg-amber-500',
  },
};

export function Dot({
  className,
  pulse = false,
  sizeClass = 'size-2.5',
  tone = 'pass',
}: {
  className?: string;
  pulse?: boolean;
  sizeClass?: string;
  tone?: StatusTone;
}) {
  const styles = STATUS_TONE_STYLES[tone];

  return (
    <div className={cn('relative flex shrink-0 items-center justify-center', className)}>
      <div
        className={cn(
          'rounded-full',
          sizeClass,
          styles.dotClass,
          pulse ? 'animate-pulse' : undefined
        )}
      />
      {pulse ? (
        <div
          className={cn(
            'absolute rounded-full opacity-75 animate-ping',
            sizeClass,
            styles.dotClass
          )}
        />
      ) : null}
    </div>
  );
}

interface StatusBadgeProps {
  tone: StatusTone;
  label: string;
  className?: string;
  emphasize?: boolean;
  labelClassName?: string;
}

export function StatusBadge({
  tone,
  label,
  className,
  emphasize = false,
  labelClassName,
}: StatusBadgeProps) {
  const styles = STATUS_TONE_STYLES[tone];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Dot tone={tone} sizeClass="size-1.5" />
      <span
        className={cn(
          'text-[10px] font-bold uppercase tracking-[0.14em]',
          emphasize ? styles.accentTextClass : 'text-fg',
          labelClassName
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function PulseIndicator({
  tone = 'pass',
  className,
}: {
  tone?: StatusTone;
  className?: string;
}) {
  return <Dot tone={tone} pulse className={className} sizeClass="size-2.5" />;
}
