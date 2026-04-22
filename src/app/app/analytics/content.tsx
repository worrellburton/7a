'use client';

import { useEffect, useState } from 'react';

interface Ga4Response {
  range: { startDate: string; endDate: string; days: number };
  summary: {
    sessions: number;
    activeUsers: number;
    pageViews: number;
    avgSessionDurationSec: number;
    bounceRate: number;
  };
  channels: { channel: string; sessions: number }[];
  topPages: { path: string; sessions: number; users: number }[];
  fetched_at: string;
}

export default function AnalyticsContent() {
  const [days, setDays] = useState(28);
  const [data, setData] = useState<Ga4Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/google/ga4?days=${days}`, { cache: 'no-store' })
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(json?.error ?? `HTTP ${r.status}`);
          setData(null);
        } else {
          setData(json as Ga4Response);
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
  }, [days]);

  const fmt = (n: number) => n.toLocaleString();
  const fmtDuration = (sec: number) => {
    if (!sec) return '0s';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };
  const fmtPct = (r: number) => `${(r * 100).toFixed(1)}%`;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-2">
            Marketing &amp; Admissions
          </p>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
            Site-wide GA4 performance for sevenarrowsrecovery.com. Live from the
            Google Analytics Data API.
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="text-sm rounded-lg border border-black/10 bg-white px-3 py-2"
        >
          <option value={7}>Last 7 days</option>
          <option value={28}>Last 28 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 12 months</option>
        </select>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Couldn&apos;t load GA4:</strong> {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Stat label="Sessions" value={data ? fmt(data.summary.sessions) : loading ? '…' : '—'} />
        <Stat label="Active users" value={data ? fmt(data.summary.activeUsers) : loading ? '…' : '—'} />
        <Stat label="Page views" value={data ? fmt(data.summary.pageViews) : loading ? '…' : '—'} />
        <Stat
          label="Avg. session"
          value={data ? fmtDuration(data.summary.avgSessionDurationSec) : loading ? '…' : '—'}
        />
        <Stat label="Bounce rate" value={data ? fmtPct(data.summary.bounceRate) : loading ? '…' : '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Traffic by channel">
          {data?.channels?.length ? (
            <ul className="text-sm divide-y divide-black/5">
              {data.channels.map((c) => (
                <li key={c.channel} className="flex items-center justify-between py-2">
                  <span className="text-foreground">{c.channel}</span>
                  <span className="font-semibold text-foreground">{fmt(c.sessions)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty loading={loading} />
          )}
        </Panel>

        <Panel title="Top landing pages">
          {data?.topPages?.length ? (
            <ul className="text-sm divide-y divide-black/5">
              {data.topPages.map((p) => (
                <li key={p.path} className="flex items-center justify-between py-2 gap-3">
                  <span className="text-foreground truncate" title={p.path}>{p.path || '/'}</span>
                  <span className="font-semibold text-foreground whitespace-nowrap">
                    {fmt(p.sessions)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty loading={loading} />
          )}
        </Panel>
      </div>

      {data?.fetched_at ? (
        <p className="mt-6 text-xs text-foreground/40">
          Fetched {new Date(data.fetched_at).toLocaleString()} · range {data.range.startDate} → {data.range.endDate}
        </p>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/5 bg-white p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50 mb-2">
        {label}
      </p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 min-h-[260px]">
      <h2 className="text-base font-bold text-foreground mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ loading }: { loading: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-black/10 bg-warm-bg/40 p-4 text-xs text-foreground/50">
      {loading ? 'Loading…' : 'No data in this range.'}
    </div>
  );
}
