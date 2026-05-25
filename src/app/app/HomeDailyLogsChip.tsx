'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

// Small pill that sits just under the Online Orbit on the home page,
// linking to /app/logs. Reads the count + the historical
// single-day record from /api/contacts/logs-today (the same endpoint
// the dedicated page hydrates from) so a quick glance from home
// answers "how many touches landed today?" and "did we beat the
// record yet?" without leaving the dashboard.

interface ChipPayload {
  total: number;
  record: { count: number; date: string } | null;
}

function fmtRecordDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  if (!y || !m || !d) return yyyyMmDd;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HomeDailyLogsChip() {
  const { session } = useAuth();
  const [data, setData] = useState<ChipPayload | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/contacts/logs-today', { credentials: 'include' });
        if (!r.ok) return;
        const j = (await r.json()) as ChipPayload;
        if (!cancelled) setData(j);
      } catch {
        // Silent — chip stays absent if the fetch fails.
      }
    })();
    return () => { cancelled = true; };
  }, [session?.access_token]);

  if (!data) return null;

  const beatRecord = data.record != null && data.total > data.record.count && data.total > 0;

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ fontFamily: 'var(--font-body)' }}>
      <Link
        href="/app/logs"
        className="group inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-white/85 supports-[backdrop-filter]:bg-white/65 backdrop-blur-md px-3.5 py-1.5 shadow-[0_8px_22px_-12px_rgba(16,84,57,0.45)] hover:border-emerald-500/70 hover:shadow-[0_12px_26px_-12px_rgba(16,84,57,0.55)] transition-all"
        title="See every log that landed today"
      >
        <span aria-hidden className="text-base leading-none">🪵</span>
        <span className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-emerald-700">
          Daily logs
        </span>
        <span aria-hidden className="text-emerald-700/40 text-[9px]">•</span>
        <span className="text-[13px] font-bold text-emerald-700 tabular-nums leading-none">
          {data.total}
        </span>
        <span aria-hidden className="ml-0.5 text-emerald-700/60 text-[10px] transition-transform duration-200 group-hover:translate-x-0.5">→</span>
      </Link>

      {data.record && (
        <p className="text-[10px] text-foreground/55 tabular-nums">
          {beatRecord ? (
            <>
              <span className="font-bold uppercase tracking-wider text-amber-700">New record!</span>
              <span className="ml-1.5 text-foreground/50">previous {data.record.count} · {fmtRecordDate(data.record.date)}</span>
            </>
          ) : (
            <>
              <span className="font-semibold uppercase tracking-wider text-foreground/45 text-[9.5px]">Daily record</span>
              <span className="ml-1.5">{data.record.count} on {fmtRecordDate(data.record.date)}</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}
