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

export default function HomeWebsiteVisitsRow() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<VisitsSummary | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetch('/api/google/visits-summary', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: VisitsSummary | null) => {
        if (cancelled || !json) return;
        setData(json);
      })
      .catch(() => { /* non-fatal */ });
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
          onClick={() => router.push('/app/analytics')}
        />
        <VisitCard
          label="This Week"
          value={data?.thisWeek ?? null}
          previous={data?.lastWeek ?? null}
          previousLabel="last week"
          onClick={() => router.push('/app/analytics')}
        />
        <VisitCard
          label="This Month"
          value={data?.thisMonth ?? null}
          previous={data?.lastMonth ?? null}
          previousLabel="last month"
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
  onClick,
}: {
  label: string;
  value: number | null;
  previous: number | null;
  previousLabel: string;
  onClick: () => void;
}) {
  const loading = value == null || previous == null;
  const delta = !loading ? (value as number) - (previous as number) : 0;
  const up = delta > 0;
  const down = delta < 0;
  const pct = !loading && (previous ?? 0) > 0 ? Math.round((delta / (previous as number)) * 100) : null;
  const animated = useAnimatedNumber(loading ? null : (value as number));
  return (
    <button
      onClick={onClick}
      className="text-center px-4 py-3 rounded-xl hover:bg-warm-bg/50 transition-colors"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">{label}</p>
      <div className="mt-1 flex items-baseline justify-center gap-2">
        <span className="text-3xl font-bold text-emerald-600 tabular-nums">
          {loading ? '—' : (animated ?? 0).toLocaleString()}
        </span>
        {!loading && (
          <span className={`text-[11px] font-medium ${up ? 'text-emerald-600' : down ? 'text-red-500' : 'text-foreground/40'}`}>
            {up ? '▲' : down ? '▼' : '·'} {Math.abs(delta)}
            {pct != null && ` (${pct > 0 ? '+' : ''}${pct}%)`}
          </span>
        )}
      </div>
      <p className="text-[10px] text-foreground/40 mt-0.5">
        {loading
          ? 'Loading…'
          : previous === 0 && value === 0
            ? `None ${previousLabel}`
            : `vs ${previous} ${previousLabel}`}
      </p>
    </button>
  );
}
