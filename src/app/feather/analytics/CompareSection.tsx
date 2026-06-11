'use client';

import { useEffect, useMemo, useState } from 'react';
import GoogleReconnectBanner from './GoogleReconnectBanner';
import { type DateRange, fmtDuration, fmtNumber, fmtPct, toApiDate, pctChange } from './shared';

interface ComparePoint {
  sessions: number;
  activeUsers: number;
  pageViews: number;
  avgSessionDurationSec: number;
  bounceRate: number;
  engagementRate: number;
}

interface CompareResponse {
  current: ComparePoint;
  previousPeriod: ComparePoint;
  yearAgo: ComparePoint;
  range: { current: { startDate: string; endDate: string }; previousPeriod: { startDate: string; endDate: string }; yearAgo: { startDate: string; endDate: string } };
  daily: { date: string; current: number; previous: number }[];
}

export function CompareSection({ range }: { range: DateRange }) {
  const [data, setData] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const queryKey = `${toApiDate(range.start)}_${toApiDate(range.end)}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/google/compare?startDate=${toApiDate(range.start)}&endDate=${toApiDate(range.end)}`,
      { cache: 'no-store' }
    )
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(json?.error ?? `HTTP ${r.status}`);
          setData(null);
        } else {
          setData(json as CompareResponse);
        }
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

  const chartData = useMemo(() => data?.daily ?? [], [data]);
  const chartMax = useMemo(() => {
    if (!chartData.length) return 1;
    let m = 1;
    for (const d of chartData) {
      if (d.current > m) m = d.current;
      if (d.previous > m) m = d.previous;
    }
    return m;
  }, [chartData]);

  if (error) {
    return (
      <GoogleReconnectBanner label="compare" error={error} />
    );
  }

  const metrics: {
    key: keyof ComparePoint;
    label: string;
    formatter: (n: number) => string;
    inverse?: boolean;
  }[] = [
    { key: 'sessions', label: 'Sessions', formatter: fmtNumber },
    { key: 'activeUsers', label: 'Active users', formatter: fmtNumber },
    { key: 'pageViews', label: 'Page views', formatter: fmtNumber },
    { key: 'avgSessionDurationSec', label: 'Avg. session', formatter: fmtDuration },
    { key: 'engagementRate', label: 'Engagement rate', formatter: (n) => fmtPct(n) },
    { key: 'bounceRate', label: 'Bounce rate', formatter: (n) => fmtPct(n), inverse: true },
  ];

  return (
    <div className="space-y-6">
      {/* Chart: current period vs previous period, day by day */}
      <div className="rounded-2xl border border-black/5 bg-white p-5">
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-foreground">Sessions: current vs previous period</h2>
            <p className="text-[11px] text-foreground/50 mt-0.5">
              Daily overlay — each x-axis day aligns the ordinal position of the two periods
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Legend color="bg-primary" label="Current" />
            <Legend color="bg-foreground/30" label="Previous" />
          </div>
        </div>
        {chartData.length ? (
          <OverlayChart data={chartData} max={chartMax} />
        ) : (
          <div className="text-xs text-foreground/50 py-6">
            {loading ? 'Loading…' : 'No data in this range.'}
          </div>
        )}
      </div>

      {/* PoP + YoY table */}
      <div className="rounded-2xl border border-black/5 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-bold text-foreground">Side-by-side comparison</h2>
          {data?.range ? (
            <div className="text-[11px] text-foreground/50 space-x-4">
              <span>Current: {data.range.current.startDate} → {data.range.current.endDate}</span>
              <span>Prev period: {data.range.previousPeriod.startDate} → {data.range.previousPeriod.endDate}</span>
              <span>Year ago: {data.range.yearAgo.startDate} → {data.range.yearAgo.endDate}</span>
            </div>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-warm-bg/40 text-[10px] uppercase tracking-[0.15em] text-foreground/50">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Metric</th>
                <th className="px-5 py-3 text-right font-semibold">Current</th>
                <th className="px-5 py-3 text-right font-semibold">Prev period</th>
                <th className="px-5 py-3 text-right font-semibold">vs PoP</th>
                <th className="px-5 py-3 text-right font-semibold">Year ago</th>
                <th className="px-5 py-3 text-right font-semibold">vs YoY</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => {
                const cur = data?.current?.[m.key] ?? 0;
                const prev = data?.previousPeriod?.[m.key] ?? 0;
                const ya = data?.yearAgo?.[m.key] ?? 0;
                const popDelta = pctChange(cur, prev);
                const yoyDelta = pctChange(cur, ya);
                return (
                  <tr key={m.key} className="border-t border-black/5">
                    <td className="px-5 py-3 font-semibold text-foreground">{m.label}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-bold">{data ? m.formatter(cur) : '—'}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-foreground/70">
                      {data ? m.formatter(prev) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right"><DeltaCell delta={popDelta} inverse={m.inverse} /></td>
                    <td className="px-5 py-3 text-right tabular-nums text-foreground/70">
                      {data ? m.formatter(ya) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right"><DeltaCell delta={yoyDelta} inverse={m.inverse} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DeltaCell({ delta, inverse }: { delta: number | null; inverse?: boolean }) {
  if (delta === null || !isFinite(delta)) return <span className="text-foreground/40">—</span>;
  const positive = delta > 0;
  const good = inverse ? !positive : positive;
  const color = Math.abs(delta) < 0.001 ? 'text-foreground/50' : good ? 'text-emerald-700' : 'text-rose-700';
  const sign = positive ? '+' : '';
  return (
    <span className={`font-semibold tabular-nums ${color}`}>
      {sign}{(delta * 100).toFixed(1)}%
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-3 h-1 rounded-full ${color}`} />
      <span className="text-foreground/60">{label}</span>
    </span>
  );
}

function OverlayChart({ data, max }: { data: { date: string; current: number; previous: number }[]; max: number }) {
  const width = 1000;
  const height = 220;
  const padL = 40;
  const padR = 10;
  const padT = 10;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const stepX = data.length > 1 ? plotW / (data.length - 1) : plotW;

  const curPath = data
    .map((d, i) => {
      const x = padL + i * stepX;
      const y = padT + plotH - (d.current / max) * plotH;
      return i === 0 ? `M${x},${y}` : `L${x},${y}`;
    })
    .join(' ');

  const prevPath = data
    .map((d, i) => {
      const x = padL + i * stepX;
      const y = padT + plotH - (d.previous / max) * plotH;
      return i === 0 ? `M${x},${y}` : `L${x},${y}`;
    })
    .join(' ');

  const ticks = 4;
  const tickValues: number[] = [];
  for (let i = 0; i <= ticks; i++) tickValues.push(Math.round((max / ticks) * i));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      {tickValues.map((tv, i) => {
        const y = padT + plotH - (tv / max) * plotH;
        return (
          <g key={i}>
            <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="currentColor" className="text-black/5" />
            <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" className="fill-foreground/50">
              {tv.toLocaleString()}
            </text>
          </g>
        );
      })}
      <path d={prevPath} fill="none" strokeWidth={1.5} className="stroke-foreground/30" strokeDasharray="4 4" />
      <path d={curPath} fill="none" strokeWidth={2} className="stroke-primary" />
    </svg>
  );
}
