'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// "SEO actions taken today" row inside the home At-a-glance card.
// Shows the count for the current Phoenix-local day plus a Claude-
// generated 3-5 sentence summary explaining how the actions impact
// SEO health. The summary is cached server-side (one row per day in
// public.seo_action_daily_summaries) so this fetch is cheap on a
// repeat load.

interface SummaryResponse {
  day: string;
  count: number;
  summary: string | null;
  generated_at: string | null;
  error?: string;
}

export default function HomeSeoActionsRow() {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/seo/actions/today-summary', {
          cache: 'no-store',
          credentials: 'include',
        });
        const json = await res.json().catch(() => null);
        if (!cancelled) setData(json);
      } catch {
        /* non-fatal — section just collapses */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
      <div className="flex items-baseline justify-between mb-1">
        <p
          className="text-xs font-semibold text-foreground/40 uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          SEO actions today
        </p>
        <Link
          href="/app/seo/actions"
          className="text-[11px] font-semibold text-primary hover:text-primary-dark transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Open actions →
        </Link>
      </div>

      <div className="grid grid-cols-[auto,1fr] gap-3 sm:gap-4 items-start py-1">
        {/* Big count number on the left, mirrors the visual weight of
            the meaningful-calls / website-visits rows above. */}
        <div className="px-1 py-0.5 min-w-[64px]">
          <p
            className={`text-3xl sm:text-4xl font-bold tabular-nums ${
              loading ? 'text-foreground/25'
              : (data?.count ?? 0) > 0 ? 'text-emerald-600'
              : 'text-foreground/35'
            }`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {loading ? '—' : (data?.count ?? 0)}
          </p>
          <p
            className="text-[10px] uppercase tracking-wider text-foreground/45 mt-0.5"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {data?.count === 1 ? 'action' : 'actions'}
          </p>
        </div>

        {/* Summary panel on the right. Three states: loading, idle
            (zero actions today), or filled. */}
        <div className="rounded-xl border border-black/5 bg-white/55 supports-[backdrop-filter]:bg-white/40 backdrop-blur-md px-3.5 py-2.5 min-h-[64px]">
          {loading ? (
            <SummarySkeleton />
          ) : !data || data.count === 0 ? (
            <p
              className="text-xs text-foreground/45 italic"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              No SEO actions logged yet today. Submit one in{' '}
              <Link href="/app/seo/actions" className="not-italic font-semibold text-primary hover:underline">
                the Actions tab
              </Link>{' '}
              and it will appear here.
            </p>
          ) : data.summary ? (
            <p
              className="text-[13px] leading-relaxed text-foreground/85"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {data.summary}
            </p>
          ) : (
            <p
              className="text-xs text-foreground/45 italic"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {data.count} action{data.count === 1 ? '' : 's'} logged today — summary not available right now.
            </p>
          )}
          {data?.generated_at && data.summary && (
            <p
              className="text-[10px] text-foreground/35 mt-1.5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Summary by Claude · {new Date(data.generated_at).toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix',
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-1.5 animate-pulse">
      <div className="h-2.5 rounded bg-foreground/10 w-[88%]" />
      <div className="h-2.5 rounded bg-foreground/10 w-[94%]" />
      <div className="h-2.5 rounded bg-foreground/10 w-[72%]" />
    </div>
  );
}
