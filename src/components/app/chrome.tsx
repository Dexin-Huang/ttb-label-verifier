import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageShell({
  className,
  ...props
}: ComponentPropsWithoutRef<'main'>) {
  return (
    <main
      className={cn('page-shell pb-20 pt-[var(--page-top)]', className)}
      {...props}
    />
  );
}

export function SectionEyebrow({
  className,
  ...props
}: ComponentPropsWithoutRef<'p'>) {
  return <p className={cn('app-eyebrow', className)} {...props} />;
}

interface PageHeadingProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
}

export function PageHeading({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
  titleClassName,
}: PageHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-8 border-b border-border pb-8 md:flex-row md:items-end md:justify-between md:pb-10',
        className
      )}
    >
      <div className="space-y-2">
        {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
        <h1
          className={cn(
            'display-serif text-4xl leading-[1.08] tracking-[0.01em] md:text-[2.7rem]',
            titleClassName
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="max-w-md text-sm leading-relaxed text-subtle">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-4">{actions}</div> : null}
    </div>
  );
}

export function BackLink({
  href = '/',
  children = 'Back',
  className,
}: {
  href?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn('app-back-link', className)}>
      <ArrowLeft size={14} />
      {children}
    </Link>
  );
}

export function PlaceholderCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="app-panel px-8 py-14 text-center md:px-12 md:py-16">
      <h1 className="font-serif text-3xl text-fg md:text-4xl">{title}</h1>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-subtle">
        {description}
      </p>
      <Link href="/" className="app-solid-button mt-8">
        Return to Archive
      </Link>
    </div>
  );
}
