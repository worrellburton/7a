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

export default function HomeDailyLogsChip({ variant = 'pill' }: { variant?: 'pill' | 'circle' } = {}) {
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

  // Compact circle variant — used in the home header's right cluster
  // next to the "+" button. Same payload + record-beat treatment as
  // the pill, but compressed to a single round 36-40px button with
  // the count centred and a small 🪵 / 🔥 floating in the corner.
  // No "Daily record" caption underneath (the home header is tight
  // already; the dedicated /app/logs page surfaces the record).
  if (variant === 'circle') {
    const ringResting = 'border border-emerald-500/40 bg-white/85 supports-[backdrop-filter]:bg-white/65 backdrop-blur-md hover:border-emerald-500/70 shadow-[0_6px_18px_-10px_rgba(16,84,57,0.45)]';
    const ringFire = 'border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 shadow-[0_0_22px_rgba(251,146,60,0.55)] hover:shadow-[0_0_30px_rgba(251,146,60,0.75)]';
    return (
      <Link
        href="/feather/logs"
        title={
          beatRecord
            ? `🔥 New all-time daily record! ${data.total} logs · previous best ${data.record?.count ?? 0} on ${data.record ? fmtRecordDate(data.record.date) : ''}.`
            : `${data.total} log${data.total === 1 ? '' : 's'} today · click for the full breakdown`
        }
        aria-label={`Daily logs: ${data.total}`}
        className={`relative inline-flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 rounded-full transition-all ${beatRecord ? ringFire : ringResting}`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {beatRecord && (
          <span aria-hidden className="absolute -inset-1 rounded-full bg-amber-400/30 blur-md animate-pulse" />
        )}
        <span
          className={`relative tabular-nums font-bold leading-none ${beatRecord ? 'text-amber-700' : 'text-emerald-700'} ${data.total >= 1000 ? 'text-[11px]' : 'text-[14px]'}`}
        >
          {data.total}
        </span>
        <span
          aria-hidden
          className={`absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-[10px] leading-none border border-white shadow-sm ${beatRecord ? 'bg-amber-400 text-white animate-bounce' : 'bg-emerald-500/95 text-white'}`}
          style={beatRecord ? { animationDuration: '1.4s' } : undefined}
        >
          {beatRecord ? '🔥' : '🪵'}
        </span>
      </Link>
    );
  }

  // When today beats the prior all-time daily record, swap the chip
  // styling from the resting emerald look to an "on fire" amber +
  // orange treatment: a pulsing halo behind the pill, a thicker
  // glowing ring, and a 🔥 prefix. Pure CSS / Tailwind so it
  // doesn't pull in a runtime animation lib.
  const pillBase = 'group inline-flex items-center gap-2 rounded-full backdrop-blur-md px-3.5 py-1.5 transition-all';
  const pillResting = 'border border-emerald-500/40 bg-white/85 supports-[backdrop-filter]:bg-white/65 shadow-[0_8px_22px_-12px_rgba(16,84,57,0.45)] hover:border-emerald-500/70 hover:shadow-[0_12px_26px_-12px_rgba(16,84,57,0.55)]';
  const pillFire = 'border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 shadow-[0_0_28px_rgba(251,146,60,0.55)] hover:shadow-[0_0_36px_rgba(251,146,60,0.75)]';
  const numberColor = beatRecord ? 'text-amber-700' : 'text-emerald-700';
  const labelColor = beatRecord ? 'text-amber-800' : 'text-emerald-700';
  const dotColor = beatRecord ? 'text-amber-700/50' : 'text-emerald-700/40';
  const arrowColor = beatRecord ? 'text-amber-700/70' : 'text-emerald-700/60';

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="relative inline-flex">
        {beatRecord && (
          <>
            {/* Pulsing halo behind the pill. Two layers — the outer
                slow pulse for ambient warmth and an inner faster
                ping for liveness. */}
            <span aria-hidden className="absolute -inset-1.5 rounded-full bg-amber-400/35 blur-md animate-pulse" />
            <span aria-hidden className="absolute -inset-0.5 rounded-full bg-orange-300/30 animate-ping" />
          </>
        )}
        <Link
          href="/feather/logs"
          className={`${pillBase} ${beatRecord ? pillFire : pillResting} relative`}
          title={beatRecord ? `🔥 New all-time daily record! Previous best: ${data.record?.count ?? 0} on ${data.record ? fmtRecordDate(data.record.date) : ''}.` : 'See every log that landed today'}
        >
          {beatRecord && (
            <span aria-hidden className="text-base leading-none animate-bounce" style={{ animationDuration: '1.4s' }}>🔥</span>
          )}
          <span aria-hidden className="text-base leading-none">🪵</span>
          <span className={`text-[10.5px] font-bold uppercase tracking-[0.22em] ${labelColor}`}>
            {beatRecord ? 'On fire' : 'Daily logs'}
          </span>
          <span aria-hidden className={`text-[9px] ${dotColor}`}>•</span>
          <span className={`text-[13px] font-bold tabular-nums leading-none ${numberColor}`}>
            {data.total}
          </span>
          <span aria-hidden className={`ml-0.5 text-[10px] transition-transform duration-200 group-hover:translate-x-0.5 ${arrowColor}`}>→</span>
        </Link>
      </div>

      {data.record && (
        <p className="text-[10px] text-foreground/55 tabular-nums">
          {beatRecord ? (
            <>
              <span className="font-bold uppercase tracking-wider text-amber-700">🔥 New record!</span>
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
