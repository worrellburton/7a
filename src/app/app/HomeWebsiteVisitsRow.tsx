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

interface VisitsErrorEnvelope {
  error?: string;
  errorCode?: string | null;
  status?: number;
  endpoint?: string;
  quota_exhausted?: boolean;
  reconnect?: boolean;
}

interface DerivedError {
  /** Short, card-safe headline (≤ 28 chars). */
  short: string;
  /** Full text shown in the title tooltip + click-to-copy detail. */
  full: string;
  /** True when the fix is "Reconnect Google" and we should show that
   *  as the row-level CTA instead of a generic Retry. */
  reconnect: boolean;
}

function deriveError(
  status: number,
  body: VisitsErrorEnvelope | null,
): DerivedError {
  const code = body?.errorCode ?? null;
  const reconnect = body?.reconnect === true || status === 401 || code === 'UNAUTHENTICATED' || code === 'PERMISSION_DENIED';
  if (body?.quota_exhausted || code === 'RESOURCE_EXHAUSTED') {
    return {
      short: 'GA4 quota exhausted',
      full: body?.error ?? 'GA4 daily quota exhausted — resets in <24h',
      reconnect: false,
    };
  }
  if (status === 412) {
    return {
      short: 'GA4 not configured',
      full: body?.error ?? 'GA4_PROPERTY_ID is not set on the server.',
      reconnect: false,
    };
  }
  if (code === 'PERMISSION_DENIED') {
    return {
      short: 'Reconnect Google',
      full: body?.error ?? 'Connected account lacks access to the configured GA4 property.',
      reconnect: true,
    };
  }
  if (code === 'UNAUTHENTICATED' || status === 401) {
    return {
      short: 'Reconnect Google',
      full: body?.error ?? 'Google access token expired or revoked.',
      reconnect: true,
    };
  }
  if (status === 429) {
    return {
      short: 'GA4 rate-limited',
      full: body?.error ?? 'GA4 rate-limited; try again in <60 min',
      reconnect: false,
    };
  }
  return {
    short: code ? code.replace(/_/g, ' ').toLowerCase() : `HTTP ${status}`,
    full: body?.error ?? `Couldn't load (HTTP ${status})`,
    reconnect,
  };
}

export default function HomeWebsiteVisitsRow() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<VisitsSummary | null>(null);
  const [error, setError] = useState<DerivedError | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setError(null);
    setData(null);
    fetch('/api/google/visits-summary', { cache: 'no-store' })
      .then(async (r) => {
        const body = (await r.json().catch(() => null)) as VisitsErrorEnvelope | VisitsSummary | null;
        if (cancelled) return;
        if (!r.ok) {
          // eslint-disable-next-line no-console
          console.warn('[website-visits] API error', r.status, body);
          setError(deriveError(r.status, body as VisitsErrorEnvelope));
          return;
        }
        setData(body as VisitsSummary);
      })
      .catch((e) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn('[website-visits] fetch threw', e);
        setError({
          short: 'Network error',
          full: e instanceof Error ? e.message : 'Network error',
          reconnect: false,
        });
      });
    return () => { cancelled = true; };
  }, [isAdmin, retryNonce]);

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
          onRetry={() => setRetryNonce((n) => n + 1)}
          onClick={() => router.push('/app/analytics')}
        />
        <VisitCard
          label="This Week"
          value={data?.thisWeek ?? null}
          previous={data?.lastWeek ?? null}
          previousLabel="last week"
          error={error}
          onRetry={() => setRetryNonce((n) => n + 1)}
          onClick={() => router.push('/app/analytics')}
        />
        <VisitCard
          label="This Month"
          value={data?.thisMonth ?? null}
          previous={data?.lastMonth ?? null}
          previousLabel="last month"
          error={error}
          onRetry={() => setRetryNonce((n) => n + 1)}
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
  onRetry,
  onClick,
}: {
  label: string;
  value: number | null;
  previous: number | null;
  previousLabel: string;
  error: DerivedError | null;
  onRetry: () => void;
  onClick: () => void;
}) {
  const router = useRouter();
  const loading = !error && (value == null || previous == null);
  const ready = !error && !loading;
  const delta = ready ? (value as number) - (previous as number) : 0;
  const up = ready && delta > 0;
  const down = ready && delta < 0;
  const pct = ready && (previous ?? 0) > 0 ? Math.round((delta / (previous as number)) * 100) : null;
  const animated = useAnimatedNumber(ready ? (value as number) : null);
  // The card needs to stay inside its grid cell even when the error
  // text is long. `min-w-0` on the grid cell (and `overflow-hidden`
  // here) prevents the URL-shaped errors we used to see from
  // overflowing into the next card.
  return (
    <div
      className="min-w-0 px-4 py-3 rounded-xl hover:bg-warm-bg/50 transition-colors overflow-hidden"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-center"
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
        {!error && (
          <p className="text-[10px] mt-0.5 text-foreground/40">
            {loading
              ? 'Loading…'
              : previous === 0 && value === 0
                ? `None ${previousLabel}`
                : `vs ${previous} ${previousLabel}`}
          </p>
        )}
      </button>
      {error && (
        <div className="mt-1.5 flex flex-col items-center gap-1.5">
          <span
            title={error.full}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-700 max-w-full truncate"
          >
            <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <span className="truncate">{error.short}</span>
          </span>
          {error.reconnect ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push('/app/analytics');
              }}
              className="text-[10px] font-semibold text-primary hover:underline"
            >
              Reconnect Google →
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              className="text-[10px] font-semibold text-foreground/55 hover:text-foreground hover:underline"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
