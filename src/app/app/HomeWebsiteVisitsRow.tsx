'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { useRouter } from 'next/navigation';
import { useAnimatedNumber } from '@/lib/useAnimatedNumber';

// Home row: three stat cards for public-site sessions — today /
// this week / this month — with a delta vs the prior equal-length
// period. Single GA4 call (multi-dateRange) + 5 minute server
// cache means the row is cheap on quota even with several admins
// watching. Mirrors HomeMeaningfulCallsRow's visual shape.

interface VisitsSummary {
  today: number;
  yesterday: number;
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  lastMonth: number;
}

// Map common API failure shapes to a short, actionable message the
// row can render under each card. Keep it tight — the cards only
// have ~24 chars of vertical real estate.
function deriveErrorMessage(
  status: number,
  body: { error?: string; quota_exhausted?: boolean } | null,
): string {
  if (body?.quota_exhausted) return 'GA4 daily quota exhausted';
  if (status === 401) return 'Sign in again to load';
  if (status === 412) return body?.error ?? 'GA4 not configured';
  if (status === 429) return 'GA4 rate-limited — try later';
  if (body?.error) return body.error.slice(0, 80);
  return `Couldn't load (HTTP ${status})`;
}

export default function HomeWebsiteVisitsRow() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<VisitsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setError(null);
    setData(null);
    fetch('/api/google/visits-summary', { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (cancelled) return;
        if (!r.ok) {
          const msg = deriveErrorMessage(r.status, body);
          // Loud in the console too so an admin checking devtools can
          // see exactly which endpoint failed and why.
          // eslint-disable-next-line no-console
          console.warn('[website-visits] API error', r.status, body);
          setError(msg);
          return;
        }
        setData(body as VisitsSummary);
      })
      .catch((e) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn('[website-visits] fetch threw', e);
        setError(e instanceof Error ? e.message : 'Network error');
      });
    return () => { cancelled = true; };
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
          Website visits
        </p>
        <button
          type="button"
          onClick={() => router.push('/app/analytics')}
          className="text-[11px] font-semibold text-primary hover:underline"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Open analytics →
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <VisitCard
          label="Today"
          value={data?.today ?? null}
          previous={data?.yesterday ?? null}
          previousLabel="yesterday"
          error={error}
          onClick={() => router.push('/app/analytics')}
        />
        <VisitCard
          label="This Week"
          value={data?.thisWeek ?? null}
          previous={data?.lastWeek ?? null}
          previousLabel="last week"
          error={error}
          onClick={() => router.push('/app/analytics')}
        />
        <VisitCard
          label="This Month"
          value={data?.thisMonth ?? null}
          previous={data?.lastMonth ?? null}
          previousLabel="last month"
          error={error}
          onClick={() => router.push('/app/analytics')}
        />
      </div>
    </div>
  );
}

function VisitCard({
  label,
  value,
  previous,
  previousLabel,
  error,
  onClick,
}: {
  label: string;
  value: number | null;
  previous: number | null;
  previousLabel: string;
  error: string | null;
  onClick: () => void;
}) {
  const loading = !error && (value == null || previous == null);
  const ready = !error && !loading;
  const delta = ready ? (value as number) - (previous as number) : 0;
  const up = ready && delta > 0;
  const down = ready && delta < 0;
  const pct = ready && (previous ?? 0) > 0 ? Math.round((delta / (previous as number)) * 100) : null;
  const animated = useAnimatedNumber(ready ? (value as number) : null);
  return (
    <button
      onClick={onClick}
      className="text-center px-4 py-3 rounded-xl hover:bg-warm-bg/50 transition-colors"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">{label}</p>
      <div className="mt-1 flex items-baseline justify-center gap-2">
        <span
          className={`text-3xl font-bold tabular-nums ${
            error ? 'text-foreground/30' : 'text-emerald-600'
          }`}
        >
          {error ? '—' : loading ? '—' : (animated ?? 0).toLocaleString()}
        </span>
        {ready && (
          <span className={`text-[11px] font-medium ${up ? 'text-emerald-600' : down ? 'text-red-500' : 'text-foreground/40'}`}>
            {up ? '▲' : down ? '▼' : '·'} {Math.abs(delta)}
            {pct != null && ` (${pct > 0 ? '+' : ''}${pct}%)`}
          </span>
        )}
      </div>
      <p
        className={`text-[10px] mt-0.5 ${
          error ? 'text-red-500 font-medium' : 'text-foreground/40'
        }`}
        title={error ?? undefined}
      >
        {error
          ? error
          : loading
            ? 'Loading…'
            : previous === 0 && value === 0
              ? `None ${previousLabel}`
              : `vs ${previous} ${previousLabel}`}
      </p>
    </button>
  );
}
