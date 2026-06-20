'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { updates } from '@/lib/updates';

// Floating "What's new" link pinned to the lower-right. Pulses when there's
// an update newer than whatever the user last viewed. The list itself now
// lives on its own page (/feather/whats-new), which clears the indicator
// (writes the latest update's timestamp to localStorage `whats_new_seen_at`).

const SEEN_KEY = 'whats_new_seen_at';

export default function WhatsNewButton() {
  const [seenAt, setSeenAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSeenAt(window.localStorage.getItem(SEEN_KEY));
    } catch {
      /* ignore */
    }
  }, []);

  const latest = updates[0]?.at;
  const hasNew = !!latest && (!seenAt || new Date(latest) > new Date(seenAt));

  return (
    <Link
      href="/feather/whats-new"
      className="fixed bottom-4 right-4 z-40 group flex items-center gap-2 px-3 py-2.5 rounded-full bg-white border border-gray-200 shadow-md hover:shadow-lg hover:border-primary/40 transition-all"
      aria-label="What's new"
      title="What's new"
    >
      <span className="relative inline-flex items-center justify-center">
        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {hasNew && (
          <>
            <span className="absolute -top-1 -right-1 block w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
            <span className="absolute -top-1 -right-1 block w-2.5 h-2.5 rounded-full bg-primary" />
          </>
        )}
      </span>
      <span className="text-xs font-semibold text-foreground/70 group-hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
        What&apos;s new
      </span>
    </Link>
  );
}
