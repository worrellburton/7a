'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { updates } from '@/lib/updates';

// What's-new lives on its own page now (was a floating button + popup on
// the home). Visiting it marks every update as seen, which clears the
// pulsing dot on the home's "What's new" link.

const SEEN_KEY = 'whats_new_seen_at';

function formatUpdateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      hour12: true, timeZone: 'America/Phoenix',
    });
  } catch {
    return iso;
  }
}

export default function WhatsNewContent() {
  useEffect(() => {
    try {
      const latest = updates[0]?.at;
      if (latest) window.localStorage.setItem(SEEN_KEY, latest);
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 max-w-2xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/feather" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
        ← Home
      </Link>

      <header className="mt-3 mb-5">
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-foreground/45">
          Seven Arrows · Feather
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          What&apos;s new
        </h1>
        <p className="mt-1 text-[12.5px] text-foreground/55">
          Recent improvements and changes across the platform.
        </p>
      </header>

      {updates.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/15 bg-warm-bg/30 px-5 py-10 text-center text-sm text-foreground/55">
          No updates yet.
        </p>
      ) : (
        <ol className="rounded-2xl border border-black/10 bg-white divide-y divide-gray-100 overflow-hidden">
          {updates.map((u) => (
            <li key={u.at} className="px-5 py-4">
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <p className="text-sm font-semibold text-foreground">{u.title}</p>
                <span className="text-[10.5px] text-foreground/40 shrink-0 whitespace-nowrap">
                  {formatUpdateTime(u.at)}
                </span>
              </div>
              <ul className="text-[13px] text-foreground/65 space-y-1 list-disc pl-4">
                {u.items.map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
