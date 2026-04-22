'use client';

import { useEffect, useState } from 'react';

interface GscResponse {
  range: { startDate: string; endDate: string; days: number };
  site: string;
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
  topPages: {
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
  fetched_at: string;
}

export default function SeoContent() {
  const [days, setDays] = useState(28);
  const [data, setData] = useState<GscResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/google/search-console?days=${days}`, { cache: 'no-store' })
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(json?.error ?? `HTTP ${r.status}`);
          setData(null);
        } else {
          setData(json as GscResponse);
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
  const fmtPct = (r: number) => `${(r * 100).toFixed(1)}%`;
  const fmtPos = (p: number) => (p ? p.toFixed(1) : '—');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-2">
            Marketing &amp; Admissions
          </p>
          <h1 className="text-2xl font-bold text-foreground">SEO</h1>
          <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
            Live Search Console performance for {data?.site ?? 'sevenarrowsrecovery.com'}.
            Top queries, top pages, and how the site is performing in Google results.
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
        </select>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Couldn&apos;t load Search Console:</strong> {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Clicks" value={data ? fmt(data.summary.clicks) : loading ? '…' : '—'} />
        <Stat label="Impressions" value={data ? fmt(data.summary.impressions) : loading ? '…' : '—'} />
        <Stat label="CTR" value={data ? fmtPct(data.summary.ctr) : loading ? '…' : '—'} />
        <Stat
          label="Avg. position"
          value={data ? fmtPos(data.summary.position) : loading ? '…' : '—'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Top queries">
          {data?.topQueries?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-semibold tracking-[0.16em] uppercase text-foreground/50">
                    <th className="py-2 pr-2">Query</th>
                    <th className="py-2 px-2 text-right">Clicks</th>
                    <th className="py-2 px-2 text-right">Impr.</th>
                    <th className="py-2 pl-2 text-right">Pos.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {data.topQueries.map((q) => (
                    <tr key={q.query}>
                      <td className="py-2 pr-2 text-foreground truncate max-w-[260px]" title={q.query}>{q.query || '—'}</td>
                      <td className="py-2 px-2 text-right font-semibold">{fmt(q.clicks)}</td>
                      <td className="py-2 px-2 text-right text-foreground/70">{fmt(q.impressions)}</td>
                      <td className="py-2 pl-2 text-right text-foreground/70">{fmtPos(q.position)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty loading={loading} />
          )}
        </Panel>

        <Panel title="Top pages">
          {data?.topPages?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-semibold tracking-[0.16em] uppercase text-foreground/50">
                    <th className="py-2 pr-2">Page</th>
                    <th className="py-2 px-2 text-right">Clicks</th>
                    <th className="py-2 px-2 text-right">Impr.</th>
                    <th className="py-2 pl-2 text-right">Pos.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {data.topPages.map((p) => (
                    <tr key={p.page}>
                      <td className="py-2 pr-2 text-foreground truncate max-w-[260px]" title={p.page}>
                        {prettyPath(p.page)}
                      </td>
                      <td className="py-2 px-2 text-right font-semibold">{fmt(p.clicks)}</td>
                      <td className="py-2 px-2 text-right text-foreground/70">{fmt(p.impressions)}</td>
                      <td className="py-2 pl-2 text-right text-foreground/70">{fmtPos(p.position)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty loading={loading} />
          )}
        </Panel>
      </div>

      {data?.fetched_at ? (
        <p className="mt-6 text-xs text-foreground/40">
          Fetched {new Date(data.fetched_at).toLocaleString()} · range {data.range.startDate} → {data.range.endDate} · Search Console lags ~2 days
        </p>
      ) : null}
    </div>
  );
}

function prettyPath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
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
