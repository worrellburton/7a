'use client';

import { useEffect, useState } from 'react';

// Per-page GA4 deep-dive shown inline beneath a blog row on
// /app/content. Fetches /api/google/page-analytics?path=<path> and
// renders six little visualisations:
//
//   - headline KPIs (pageViews, users, avg engagement, bounce/eng rate)
//   - 30-day sparkline of pageviews + active users
//   - channel grouping bars
//   - top sources × medium
//   - countries
//   - devices
//   - external referrers
//
// All charts are pure SVG / CSS so the panel doesn't pull a charting
// library just to render a few inline graphics.

interface DailyPoint { date: string; pageViews: number; activeUsers: number }
interface ChannelRow { channel: string; sessions: number; activeUsers: number; pageViews: number }
interface SourceRow { source: string; medium: string; sessions: number; activeUsers: number }
interface CountryRow { country: string; activeUsers: number; pageViews: number }
interface DeviceRow { device: string; activeUsers: number; pageViews: number; engagementRate: number }
interface ReferrerRow { referrer: string; sessions: number; activeUsers: number }
interface Totals {
  pageViews: number;
  activeUsers: number;
  avgEngagementSec: number;
  bounceRate: number;
  engagementRate: number;
  sessions: number;
  newUsers: number;
}
interface Payload {
  path: string;
  range: { startDate: string; endDate: string; days: number };
  totals: Totals;
  daily: DailyPoint[];
  channels: ChannelRow[];
  sources: SourceRow[];
  countries: CountryRow[];
  devices: DeviceRow[];
  referrers: ReferrerRow[];
  realtimeActiveUsers: number;
  fetched_at: string;
}

export default function PageAnalyticsPanel({ path, token }: { path: string; token: string | null }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/google/page-analytics?path=${encodeURIComponent(path)}&days=${days}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? `HTTP ${res.status}`);
          setData(null);
        } else {
          setData(json as Payload);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [path, days, token]);

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-foreground/55">
          Analytics · <span className="font-mono normal-case tracking-normal text-[11px] text-foreground/60">{path}</span>
        </p>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border transition-colors ${
                days === d
                  ? 'bg-foreground text-white border-foreground'
                  : 'bg-white text-foreground/60 border-black/10 hover:bg-warm-bg/60'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-[12px] text-foreground/50 py-3">Loading analytics…</div>}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          {error === 'GA4 not configured'
            ? 'GA4 isn\'t connected yet. Hook up Google OAuth + GA4_PROPERTY_ID to surface this.'
            : `Couldn't load analytics: ${error}`}
        </div>
      )}

      {data && (
        <div className="grid gap-3 md:grid-cols-12">
          {/* Headline KPIs */}
          <div className="md:col-span-7 rounded-xl border border-black/10 bg-white p-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Kpi label="Pageviews" value={fmt(data.totals.pageViews)} accent="text-emerald-700" />
              <Kpi label="Active users" value={fmt(data.totals.activeUsers)} accent="text-sky-700" />
              <Kpi label="Avg engagement" value={fmtTime(data.totals.avgEngagementSec)} accent="text-violet-700" />
              <Kpi label="Bounce rate" value={fmtPct(data.totals.bounceRate)} accent="text-rose-700" />
              <Kpi label="Engagement rate" value={fmtPct(data.totals.engagementRate)} accent="text-amber-700" />
              <Kpi label="Sessions" value={fmt(data.totals.sessions)} accent="text-foreground/70" />
              <Kpi label="New users" value={fmt(data.totals.newUsers)} accent="text-foreground/70" />
              <Kpi label="Live now (site)" value={fmt(data.realtimeActiveUsers)} accent="text-emerald-600" pulse />
            </div>
          </div>

          {/* Sparkline */}
          <div className="md:col-span-5 rounded-xl border border-black/10 bg-white p-3">
            <p className="text-[9.5px] font-bold tracking-[0.18em] uppercase text-foreground/45 mb-1.5">{data.range.days}-day trend</p>
            <Sparkline daily={data.daily} />
          </div>

          {/* Channels */}
          <div className="md:col-span-5 rounded-xl border border-black/10 bg-white p-3">
            <p className="text-[9.5px] font-bold tracking-[0.18em] uppercase text-foreground/45 mb-2">Traffic source — channel</p>
            <ChannelBars rows={data.channels} />
          </div>

          {/* Devices */}
          <div className="md:col-span-3 rounded-xl border border-black/10 bg-white p-3">
            <p className="text-[9.5px] font-bold tracking-[0.18em] uppercase text-foreground/45 mb-2">Devices</p>
            <DeviceDonut rows={data.devices} />
          </div>

          {/* Countries */}
          <div className="md:col-span-4 rounded-xl border border-black/10 bg-white p-3">
            <p className="text-[9.5px] font-bold tracking-[0.18em] uppercase text-foreground/45 mb-2">Top countries</p>
            <SimpleList rows={data.countries.map((c) => ({ label: c.country, value: c.activeUsers }))} unit="users" />
          </div>

          {/* Sources */}
          <div className="md:col-span-6 rounded-xl border border-black/10 bg-white p-3">
            <p className="text-[9.5px] font-bold tracking-[0.18em] uppercase text-foreground/45 mb-2">Source × medium</p>
            <SimpleList
              rows={data.sources.map((s) => ({ label: `${s.source} / ${s.medium}`, value: s.sessions }))}
              unit="sessions"
            />
          </div>

          {/* Referrers */}
          <div className="md:col-span-6 rounded-xl border border-black/10 bg-white p-3">
            <p className="text-[9.5px] font-bold tracking-[0.18em] uppercase text-foreground/45 mb-2">External referrers</p>
            <SimpleList
              rows={data.referrers.map((r) => ({ label: shortReferrer(r.referrer), value: r.sessions }))}
              unit="sessions"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, accent, pulse }: { label: string; value: string; accent: string; pulse?: boolean }) {
  return (
    <div>
      <p className="text-[9.5px] font-bold tracking-[0.18em] uppercase text-foreground/45">{label}</p>
      <p className={`mt-0.5 text-[18px] sm:text-[20px] font-bold tabular-nums ${accent} ${pulse ? 'animate-pulse' : ''}`} style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </p>
    </div>
  );
}

function Sparkline({ daily }: { daily: DailyPoint[] }) {
  if (daily.length === 0) {
    return <p className="text-[11.5px] text-foreground/45 py-4 text-center italic">No traffic in this window.</p>;
  }
  const w = 320;
  const h = 80;
  const padX = 4;
  const padY = 6;
  const maxV = Math.max(1, ...daily.map((d) => d.pageViews), ...daily.map((d) => d.activeUsers));
  const sx = (i: number) => padX + (i * (w - padX * 2)) / Math.max(1, daily.length - 1);
  const sy = (v: number) => h - padY - (v / maxV) * (h - padY * 2);

  function buildPath(pick: (d: DailyPoint) => number): string {
    return daily.map((d, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(pick(d)).toFixed(1)}`).join(' ');
  }
  function buildArea(pick: (d: DailyPoint) => number): string {
    const top = daily.map((d, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(pick(d)).toFixed(1)}`).join(' ');
    return `${top} L${sx(daily.length - 1).toFixed(1)},${h - padY} L${sx(0).toFixed(1)},${h - padY} Z`;
  }

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[80px] block" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="sparkfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={buildArea((d) => d.pageViews)} fill="url(#sparkfill)" />
        <path d={buildPath((d) => d.pageViews)} fill="none" stroke="rgb(5 150 105)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={buildPath((d) => d.activeUsers)} fill="none" stroke="rgb(2 132 199)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2" />
      </svg>
      <div className="flex items-center gap-3 mt-1 text-[10px] text-foreground/55">
        <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-[2px] bg-emerald-600 rounded-full" />Pageviews</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-[2px] bg-sky-600 rounded-full" />Users</span>
      </div>
    </div>
  );
}

function ChannelBars({ rows }: { rows: ChannelRow[] }) {
  if (rows.length === 0) return <p className="text-[11.5px] text-foreground/45 italic">No traffic.</p>;
  const max = Math.max(1, ...rows.map((r) => r.sessions));
  return (
    <ul className="space-y-1.5">
      {rows.slice(0, 6).map((r) => {
        const pct = (r.sessions / max) * 100;
        return (
          <li key={r.channel}>
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="text-foreground/75 truncate">{r.channel}</span>
              <span className="tabular-nums text-foreground/60">{fmt(r.sessions)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                style={{ width: `${pct.toFixed(1)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DeviceDonut({ rows }: { rows: DeviceRow[] }) {
  const total = rows.reduce((s, r) => s + r.activeUsers, 0);
  if (total === 0) return <p className="text-[11.5px] text-foreground/45 italic">No data.</p>;
  // Stacked horizontal bar — cleaner than a donut at this small size,
  // and the per-segment percent reads instantly.
  const palette: Record<string, string> = {
    desktop: 'bg-sky-500',
    mobile: 'bg-emerald-500',
    tablet: 'bg-violet-500',
  };
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-foreground/[0.06]">
        {rows.map((r) => {
          const pct = (r.activeUsers / total) * 100;
          const color = palette[r.device.toLowerCase()] ?? 'bg-foreground/40';
          return (
            <div
              key={r.device}
              className={color}
              style={{ width: `${pct.toFixed(1)}%` }}
              title={`${r.device}: ${fmt(r.activeUsers)} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>
      <ul className="mt-2 space-y-0.5 text-[11px]">
        {rows.map((r) => {
          const pct = (r.activeUsers / total) * 100;
          const dot = palette[r.device.toLowerCase()] ?? 'bg-foreground/40';
          return (
            <li key={r.device} className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-foreground/65">
                <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
                {r.device}
              </span>
              <span className="tabular-nums text-foreground/55">{pct.toFixed(0)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SimpleList({ rows, unit }: { rows: { label: string; value: number }[]; unit: string }) {
  if (rows.length === 0) return <p className="text-[11.5px] text-foreground/45 italic">None.</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-1">
      {rows.slice(0, 6).map((r, i) => {
        const pct = (r.value / max) * 100;
        return (
          <li key={`${r.label}-${i}`}>
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="text-foreground/75 truncate">{r.label}</span>
              <span className="tabular-nums text-foreground/55">{fmt(r.value)} {unit}</span>
            </div>
            <div className="h-1 rounded-full bg-foreground/[0.06] overflow-hidden">
              <div className="h-full bg-foreground/30" style={{ width: `${pct.toFixed(1)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function fmt(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function fmtTime(sec: number): string {
  if (sec < 60) return `${sec.toFixed(0)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return `${m}m ${s}s`;
}

function fmtPct(rate: number): string {
  // GA4 returns 0..1
  return `${(rate * 100).toFixed(1)}%`;
}

function shortReferrer(ref: string): string {
  if (!ref) return '(direct)';
  try {
    const u = new URL(ref);
    return u.host;
  } catch {
    return ref.replace(/^https?:\/\//, '').slice(0, 60);
  }
}
