'use client';

import { useEffect, useMemo, useState } from 'react';
import { DeltaPill } from './DeltaPill';
import { Sparkline } from './Sparkline';
import { TrendChart } from './TrendChart';
import { InsightsSection } from './InsightsSection';
import GoogleReconnectBanner from './GoogleReconnectBanner';
import {
  type DateRange,
  fmtDuration,
  fmtNumber,
  fmtPct,
  toApiDate,
} from './shared';

interface Ga4Response {
  range: { startDate: string; endDate: string; days: number };
  previousRange: { startDate: string; endDate: string; days: number } | null;
  summary: SummaryValues;
  previous: SummaryValues | null;
  daily: DailyPoint[];
  channels: { channel: string; sessions: number }[];
  topPages: { path: string; sessions: number; users: number }[];
  fetched_at: string;
}

interface SummaryValues {
  sessions: number;
  activeUsers: number;
  newUsers: number;
  pageViews: number;
  avgSessionDurationSec: number;
  bounceRate: number;
}

interface DailyPoint {
  date: string;
  sessions: number;
  activeUsers: number;
  pageViews: number;
}

interface GscResponse {
  summary: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  topQueries: {
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
}

export function OverviewSection({ range }: { range: DateRange }) {
  const [ga4, setGa4] = useState<Ga4Response | null>(null);
  const [gsc, setGsc] = useState<GscResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const queryKey = `${toApiDate(range.start)}_${toApiDate(range.end)}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const ga4Url = `/api/google/ga4?startDate=${toApiDate(range.start)}&endDate=${toApiDate(range.end)}&compare=prev`;
    const gscUrl = `/api/google/search-console?startDate=${toApiDate(range.start)}&endDate=${toApiDate(range.end)}`;

    Promise.all([
      fetch(ga4Url, { cache: 'no-store' }).then(async (r) => ({ ok: r.ok, status: r.status, body: await r.json() })),
      fetch(gscUrl, { cache: 'no-store' }).then(async (r) => ({ ok: r.ok, status: r.status, body: await r.json() })),
    ])
      .then(([ga4Res, gscRes]) => {
        if (cancelled) return;
        if (!ga4Res.ok) {
          setError(ga4Res.body?.error ?? `GA4 HTTP ${ga4Res.status}`);
          setGa4(null);
        } else {
          setGa4(ga4Res.body as Ga4Response);
        }
        // GSC is optional on the Overview — don't fail the whole page on it.
        setGsc(gscRes.ok ? (gscRes.body as GscResponse) : null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryKey]);

  const sessionsSpark = useMemo(() => ga4?.daily.map((d) => d.sessions) ?? [], [ga4]);
  const usersSpark = useMemo(() => ga4?.daily.map((d) => d.activeUsers) ?? [], [ga4]);
  const pvSpark = useMemo(() => ga4?.daily.map((d) => d.pageViews) ?? [], [ga4]);

  return (
    <>
      {error ? (
        <div className="mb-6">
          <GoogleReconnectBanner label="GA4" error={error} />
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KpiCard
          label="Sessions"
          value={ga4 ? fmtNumber(ga4.summary.sessions) : loading ? '…' : '—'}
          current={ga4?.summary.sessions ?? 0}
          previous={ga4?.previous?.sessions ?? null}
          spark={sessionsSpark}
          sparkStroke="stroke-primary"
          sparkFill="fill-primary/10"
        />
        <KpiCard
          label="Active users"
          value={ga4 ? fmtNumber(ga4.summary.activeUsers) : loading ? '…' : '—'}
          current={ga4?.summary.activeUsers ?? 0}
          previous={ga4?.previous?.activeUsers ?? null}
          spark={usersSpark}
          sparkStroke="stroke-emerald-500"
          sparkFill="fill-emerald-500/10"
        />
        <KpiCard
          label="New users"
          value={ga4 ? fmtNumber(ga4.summary.newUsers) : loading ? '…' : '—'}
          current={ga4?.summary.newUsers ?? 0}
          previous={ga4?.previous?.newUsers ?? null}
        />
        <KpiCard
          label="Page views"
          value={ga4 ? fmtNumber(ga4.summary.pageViews) : loading ? '…' : '—'}
          current={ga4?.summary.pageViews ?? 0}
          previous={ga4?.previous?.pageViews ?? null}
          spark={pvSpark}
          sparkStroke="stroke-amber-500"
          sparkFill="fill-amber-500/10"
        />
        <KpiCard
          label="Avg. session"
          value={ga4 ? fmtDuration(ga4.summary.avgSessionDurationSec) : loading ? '…' : '—'}
          current={ga4?.summary.avgSessionDurationSec ?? 0}
          previous={ga4?.previous?.avgSessionDurationSec ?? null}
        />
        <KpiCard
          label="Bounce rate"
          value={ga4 ? fmtPct(ga4.summary.bounceRate) : loading ? '…' : '—'}
          current={ga4?.summary.bounceRate ?? 0}
          previous={ga4?.previous?.bounceRate ?? null}
          inverseDelta
        />
      </div>

      {ga4?.daily?.length ? (
        <div className="mb-6">
          <TrendChart data={ga4.daily} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <DigestCard
          title="Top channel"
          primary={ga4?.channels?.[0]?.channel ?? (loading ? '…' : '—')}
          secondary={ga4?.channels?.[0] ? `${fmtNumber(ga4.channels[0].sessions)} sessions` : ''}
          rows={(ga4?.channels ?? []).slice(1, 5).map((c) => ({
            label: c.channel,
            value: fmtNumber(c.sessions),
          }))}
        />
        <DigestCard
          title="Top landing page"
          primary={ga4?.topPages?.[0]?.path || (loading ? '…' : '—')}
          secondary={ga4?.topPages?.[0] ? `${fmtNumber(ga4.topPages[0].sessions)} sessions` : ''}
          rows={(ga4?.topPages ?? []).slice(1, 5).map((p) => ({
            label: p.path || '/',
            value: fmtNumber(p.sessions),
          }))}
        />
        <DigestCard
          title="Top search query"
          primary={gsc?.topQueries?.[0]?.query || '—'}
          secondary={
            gsc?.topQueries?.[0]
              ? `${fmtNumber(gsc.topQueries[0].clicks)} clicks · pos ${gsc.topQueries[0].position.toFixed(1)}`
              : gsc
              ? 'No queries in range'
              : ''
          }
          rows={(gsc?.topQueries ?? []).slice(1, 5).map((q) => ({
            label: q.query,
            value: `${fmtNumber(q.clicks)}`,
          }))}
        />
      </div>

      <InsightsSection range={range} compact />

      {ga4?.fetched_at ? (
        <p className="mt-4 text-xs text-foreground/40">
          GA4 fetched {new Date(ga4.fetched_at).toLocaleString()} · range {ga4.range.startDate} → {ga4.range.endDate}
          {ga4.previousRange ? ` · vs ${ga4.previousRange.startDate} → ${ga4.previousRange.endDate}` : ''}
        </p>
      ) : null}
    </>
  );
}

function KpiCard({
  label,
  value,
  current,
  previous,
  spark,
  sparkStroke,
  sparkFill,
  inverseDelta,
}: {
  label: string;
  value: string;
  current: number;
  previous: number | null;
  spark?: number[];
  sparkStroke?: string;
  sparkFill?: string;
  inverseDelta?: boolean;
}) {
  return (
    <div className="rounded-xl border border-black/5 bg-white p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50">
          {label}
        </p>
        <DeltaPill current={current} previous={previous} inverse={inverseDelta} />
      </div>
      <p className="text-3xl font-bold text-foreground leading-none">{value}</p>
      {spark && spark.length > 0 ? (
        <div className="mt-3">
          <Sparkline
            values={spark}
            width={200}
            height={28}
            strokeClassName={sparkStroke}
            fillClassName={sparkFill}
          />
        </div>
      ) : null}
    </div>
  );
}

function DigestCard({
  title,
  primary,
  secondary,
  rows,
}: {
  title: string;
  primary: string;
  secondary: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50 mb-3">
        {title}
      </p>
      <p className="text-xl font-bold text-foreground leading-tight truncate" title={primary}>
        {primary || '—'}
      </p>
      <p className="text-xs text-foreground/50 mt-1">{secondary}</p>
      {rows.length > 0 ? (
        <ul className="mt-4 divide-y divide-black/5 text-[13px]">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between py-1.5 gap-3">
              <span className="truncate text-foreground/70" title={r.label}>
                {r.label}
              </span>
              <span className="font-semibold text-foreground whitespace-nowrap">{r.value}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
