'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Next 16: `ssr: false` only allowed inside a Client Component.
// page.tsx stays a Server Component (for the metadata export) and
// renders this loader, which keeps the lazy-load + skip-SSR
// behavior the 8,300-line content bundle needs.
const ContactsContent = dynamic(() => import('./content'), {
  ssr: false,
  // Render a skeleton WHILE the dynamic chunk downloads so the
  // user sees the page's shape immediately on first navigate —
  // not a blank screen until the 600KB content bundle lands.
  loading: () => <ContactsPageSkeleton />,
});

export default function ContactsLoader() {
  return (
    <Suspense fallback={<ContactsPageSkeleton />}>
      <ContactsContent />
    </Suspense>
  );
}

// Static skeleton that mirrors the real page layout (header, pill
// tray, search bar, table rows). Zero JS — no hooks, no fetches —
// so it paints in the same tick as the HTML hydrates, before the
// content bundle has even finished downloading.
function ContactsPageSkeleton() {
  return (
    <div
      className="p-4 sm:p-6 lg:p-8 w-full"
      style={{ fontFamily: 'var(--font-body)' }}
      aria-hidden="true"
    >
      {/* Header strip — title + tagline placeholder */}
      <div className="mb-6">
        <div className="h-5 w-24 rounded bg-foreground/8 animate-pulse mb-2" />
        <div className="h-3 w-72 rounded bg-foreground/8 animate-pulse" />
      </div>
      {/* Pill tray placeholder */}
      <div className="mb-4 flex justify-end">
        <div className="inline-flex items-center gap-1.5 p-1.5 rounded-full bg-white/65 border border-white/70 shadow-[0_8px_24px_-12px_rgba(40,30,25,0.22)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2 pl-1.5 pr-3.5 py-1 rounded-full bg-white/85 ring-1 ring-black/5"
            >
              <span className="inline-block w-8 h-8 rounded-full bg-foreground/8 animate-pulse" />
              <span className="block">
                <span className="block h-2 w-12 rounded bg-foreground/8 animate-pulse mb-1" />
                <span className="block h-3 w-16 rounded bg-foreground/8 animate-pulse" />
              </span>
            </span>
          ))}
        </div>
      </div>
      {/* Search bar placeholder */}
      <div className="mb-4">
        <div className="h-10 rounded-lg bg-white border border-black/10 animate-pulse" />
      </div>
      {/* Table card placeholder — first ten ghost rows */}
      <div className="rounded-xl border border-black/10 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-black/5 bg-warm-bg/40 h-9" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 border-b border-black/5 last:border-b-0"
          >
            <span className="w-[18px] h-[18px] rounded-full bg-foreground/8 animate-pulse shrink-0" />
            <span className="h-3 rounded bg-foreground/8 animate-pulse" style={{ width: `${30 + (i % 5) * 10}%` }} />
            <span className="h-3 rounded bg-foreground/6 animate-pulse" style={{ width: `${15 + (i % 4) * 8}%` }} />
            <span className="h-3 rounded bg-foreground/6 animate-pulse hidden sm:block" style={{ width: '12%' }} />
            <span className="h-3 rounded bg-foreground/6 animate-pulse hidden md:block" style={{ width: '10%' }} />
            <span className="ml-auto h-7 w-20 rounded-md bg-foreground/8 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
