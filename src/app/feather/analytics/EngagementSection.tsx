'use client';

import { useEffect, useMemo, useState } from 'react';
import GoogleReconnectBanner from './GoogleReconnectBanner';
import { type DateRange, fmtDuration, fmtNumber, fmtPct, toApiDate } from './shared';

interface EngagementResponse {
  summary: {
    engagedSessions: number;
    engagementRate: number;
    eventCount: number;
    userEngagementDurationSec: number;
    avgSessionDurationSec: number;
    pagesPerSession: number;
  };
  heatmap: number[][];
  events: { name: string; count: number; activeUsers: number }[];
  newVsReturning: { bucket: string; activeUsers: number; sessions: number; engagementRate: number }[];
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function EngagementSection({ range }: { range: DateRange }) {
  const [data, setData] = useState<EngagementResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const queryKey = `${toApiDate(range.start)}_${toApiDate(range.end)}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/google/engagement?startDate=${toApiDate(range.start)}&endDate=${toApiDate(range.end)}`,
      { cache: 'no-store' }
    )
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(json?.error ?? `HTTP ${r.status}`);
          setData(null);
        } else {
          setData(json as EngagementResponse);
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

  const heatmapMax = useMemo(() => {
    if (!data?.heatmap) return 1;
    let m = 1;
    for (const row of data.heatmap) for (const v of row) if (v > m) m = v;
    return m;
  }, [data]);

  if (error) {
    return (
      <GoogleReconnectBanner label="engagement" error={error} />
    );
  }

  const totalUsers = (data?.newVsReturning ?? []).reduce((a, b) => a + b.activeUsers, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Stat label="Engaged sessions" value={data ? fmtNumber(data.summary.engagedSessions) : loading ? '…' : '—'} />
        <Stat label="Engagement rate" value={data ? fmtPct(data.summary.engagementRate) : loading ? '…' : '—'} />
        <Stat label="Events" value={data ? fmtNumber(data.summary.eventCount) : loading ? '…' : '—'} />
        <Stat
          label="Total time"
          value={data ? fmtDuration(data.summary.userEngagementDurationSec) : loading ? '…' : '—'}
        />
        <Stat
          label="Avg. session"
          value={data ? fmtDuration(data.summary.avgSessionDurationSec) : loading ? '…' : '—'}
        />
        <Stat
          label="Pages / session"
          value={data ? data.summary.pagesPerSession.toFixed(2) : loading ? '…' : '—'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-black/5 bg-white p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-foreground">When traffic arrives</h2>
              <p className="text-[11px] text-foreground/50 mt-0.5">
                Sessions by day of week × hour of day (America/Phoenix)
              </p>
            </div>
            <HeatLegend />
          </div>
          {data?.heatmap ? (
            <Heatmap grid={data.heatmap} max={heatmapMax} />
          ) : (
            <div className="text-xs text-foreground/50 py-8">
              {loading ? 'Loading…' : 'No sessions to plot.'}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-5">
          <h2 className="text-base font-bold text-foreground mb-4">New vs returning</h2>
          {data?.newVsReturning?.length ? (
            <div className="space-y-3">
              {data.newVsReturning.map((b) => {
                const share = totalUsers ? b.activeUsers / totalUsers : 0;
                return (
                  <div key={b.bucket}>
                    <div className="flex items-baseline justify-between text-sm mb-1">
                      <span className="font-semibold text-foreground capitalize">
                        {b.bucket === '(not set)' ? 'Unassigned' : b.bucket}
                      </span>
                      <span className="text-foreground">
                        {fmtNumber(b.activeUsers)}{' '}
                        <span className="text-foreground/40 text-xs">({fmtPct(share, 0)})</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/5 overflow-hidden">
                      <div className="h-full bg-primary/70" style={{ width: `${(share * 100).toFixed(1)}%` }} />
                    </div>
                    <p className="text-[11px] text-foreground/50 mt-1">
                      Engagement: {fmtPct(b.engagementRate)} · {fmtNumber(b.sessions)} sessions
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-foreground/50 py-4">
              {loading ? 'Loading…' : 'No user data in this range.'}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5">
          <h2 className="text-base font-bold text-foreground">Top events</h2>
          <p className="text-[11px] text-foreground/50 mt-0.5">
            What visitors actually do — clicks, scrolls, form interactions, page views
          </p>
        </div>
        {data?.events?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-warm-bg/40 text-[10px] uppercase tracking-[0.15em] text-foreground/50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Event</th>
                  <th className="px-5 py-3 text-right font-semibold">Count</th>
                  <th className="px-5 py-3 text-right font-semibold">Active users</th>
                  <th className="px-5 py-3 text-right font-semibold">Per user</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((e) => (
                  <tr key={e.name} className="border-t border-black/5">
                    <td className="px-5 py-2.5 font-mono text-[12px] text-foreground">{e.name}</td>
                    <td className="px-5 py-2.5 text-right">{fmtNumber(e.count)}</td>
                    <td className="px-5 py-2.5 text-right">{fmtNumber(e.activeUsers)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {e.activeUsers ? (e.count / e.activeUsers).toFixed(1) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-6 text-xs text-foreground/50">
            {loading ? 'Loading…' : 'No events in this range.'}
          </div>
        )}
      </div>
    </div>
  );
}

function Heatmap({ grid, max }: { grid: number[][]; max: number }) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex text-[10px] text-foreground/50 mb-1 pl-10">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="flex-1 text-center" style={{ minWidth: 16 }}>
              {h % 3 === 0 ? (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`) : ''}
            </div>
          ))}
        </div>
        {grid.map((row, dow) => (
          <div key={dow} className="flex items-center mb-0.5">
            <div className="w-10 text-[10px] text-foreground/50 pr-2 text-right">{DOW[dow]}</div>
            <div className="flex flex-1 gap-0.5">
              {row.map((v, hr) => {
                const alpha = max > 0 ? v / max : 0;
                const bg = v === 0 ? 'bg-black/[0.03]' : '';
                return (
                  <div
                    key={hr}
                    title={`${DOW[dow]} ${hr}:00 — ${fmtNumber(v)} sessions`}
                    className={`flex-1 h-5 rounded-sm ${bg}`}
                    style={{
                      minWidth: 14,
                      backgroundColor: v > 0 ? `rgba(160, 82, 45, ${0.12 + alpha * 0.8})` : undefined,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatLegend() {
  return (
    <div className="flex items-center gap-2 text-[10px] text-foreground/50">
      <span>Low</span>
      <div className="flex">
        {[0.12, 0.3, 0.5, 0.7, 0.9].map((a) => (
          <div key={a} className="w-4 h-3" style={{ backgroundColor: `rgba(160, 82, 45, ${a})` }} />
        ))}
      </div>
      <span>High</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/5 bg-white p-4">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50 mb-1.5">
        {label}
      </p>
      <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
    </div>
  );
}
