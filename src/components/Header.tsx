'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Dashboard',
    matches: (pathname: string) => pathname === '/',
  },
  {
    href: '/reviews/new',
    label: 'Single Review',
    matches: (pathname: string) => pathname.startsWith('/reviews'),
  },
  {
    href: '/batches/new',
    label: 'Batch Review',
    matches: (pathname: string) => pathname.startsWith('/batches'),
  },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/30 bg-[rgba(253,251,247,0.97)] shadow-[0_10px_20px_-24px_rgba(48,38,24,0.38)] backdrop-blur-lg">
      <div className="flex w-full items-center justify-between px-4 py-3 md:px-6 md:py-4">
        <Link
          href="/"
          className="flex flex-col transition-opacity hover:opacity-80"
        >
          <span className="display-serif text-[1.06rem] leading-[1.08] tracking-[0.03em] md:text-[1.16rem]">
            TTB Label Verifier
          </span>
        </Link>

        <nav className="flex items-center gap-4 md:gap-7">
          {NAV_ITEMS.map((item) => {
            const active = item.matches(pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'app-nav-label relative py-1 transition-colors',
                  active ? 'text-fg' : 'text-muted hover:text-fg'
                )}
              >
                {item.label}
                {active ? (
                  <span className="absolute bottom-0 left-0 h-[1.5px] w-full bg-fg" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
