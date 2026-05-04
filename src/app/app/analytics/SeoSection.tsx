'use client';

import { useEffect, useMemo, useState } from 'react';
import { DeltaPill } from './DeltaPill';
import { Sparkline } from './Sparkline';
import { type DateRange, fmtNumber, fmtPct, toApiDate } from './shared';
import GoogleReconnectBanner from './GoogleReconnectBanner';

interface SeoResponse {
  range: { startDate: string; endDate: string };
  site: string;
  summary: { clicks: number; impressions: number; ctr: number; position: number };
  previous: { clicks: number; impressions: number; ctr: number; position: number } | null;
  daily: { date: string; clicks: number; impressions: number; ctr: number; position: number }[];
  topQueries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
  topPages: { page: string; clicks: number; impressions: number; ctr: number; position: number }[];
  quickWins: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
  positionBuckets: { label: string; impressions: number; clicks: number; share: number }[];
  devices: { device: string; clicks: number; impressions: number; ctr: number; position: number }[];
  countries: { country: string; clicks: number; impressions: number; ctr: number; position: number }[];
}

export function SeoSection({ range }: { range: DateRange }) {
  const [data, setData] = useState<SeoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [queryFilter, setQueryFilter] = useState('');
  const [pageFilter, setPageFilter] = useState('');

  const queryKey = `${toApiDate(range.start)}_${toApiDate(range.end)}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/google/search-console?startDate=${toApiDate(range.start)}&endDate=${toApiDate(range.end)}&compare=prev`,
      { cache: 'no-store' }
    )
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(json?.error ?? `HTTP ${r.status}`);
          setData(null);
        } else {
          setData(json as SeoResponse);
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

  const clicksSpark = useMemo(() => data?.daily.map((d) => d.clicks) ?? [], [data]);
  const imprSpark = useMemo(() => data?.daily.map((d) => d.impressions) ?? [], [data]);

  const filteredQueries = useMemo(() => {
    if (!data?.topQueries) return [];
    const q = queryFilter.trim().toLowerCase();
    if (!q) return data.topQueries;
    return data.topQueries.filter((r) => r.query.toLowerCase().includes(q));
  }, [data, queryFilter]);

  const filteredPages = useMemo(() => {
    if (!data?.topPages) return [];
    const q = pageFilter.trim().toLowerCase();
    if (!q) return data.topPages;
    return data.topPages.filter((r) => r.page.toLowerCase().includes(q));
  }, [data, pageFilter]);

  if (error) {
    return <GoogleReconnectBanner label="Search Console" error={error} />;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SeoKpi
          label="Clicks"
          value={data ? fmtNumber(data.summary.clicks) : loading ? '…' : '—'}
          current={data?.summary.clicks ?? 0}
          previous={data?.previous?.clicks ?? null}
          spark={clicksSpark}
          stroke="stroke-primary"
          fill="fill-primary/10"
        />
        <SeoKpi
          label="Impressions"
          value={data ? fmtNumber(data.summary.impressions) : loading ? '…' : '—'}
          current={data?.summary.impressions ?? 0}
          previous={data?.previous?.impressions ?? null}
          spark={imprSpark}
          stroke="stroke-amber-500"
          fill="fill-amber-500/10"
        />
        <SeoKpi
          label="CTR"
          value={data ? fmtPct(data.summary.ctr) : loading ? '…' : '—'}
          current={data?.summary.ctr ?? 0}
          previous={data?.previous?.ctr ?? null}
        />
        <SeoKpi
          label="Avg. position"
          value={data ? data.summary.position.toFixed(1) : loading ? '…' : '—'}
          current={data?.summary.position ?? 0}
          previous={data?.previous?.position ?? null}
          inverseDelta
        />
      </div>

      {/* Position buckets + device + country side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-black/5 bg-white p-5">
          <h2 className="text-base font-bold text-foreground mb-4">Position buckets</h2>
          {data?.positionBuckets?.length ? (
            <div className="space-y-3">
              {data.positionBuckets.map((b) => (
                <div key={b.label}>
                  <div className="flex items-baseline justify-between text-sm mb-1">
                    <span className="font-semibold text-foreground">{b.label}</span>
                    <span className="text-foreground/70 tabular-nums">
                      {fmtNumber(b.impressions)} imp
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/5 overflow-hidden">
                    <div
                      className={`h-full ${
                        b.label === 'Pos 1–3'
                          ? 'bg-emerald-500/80'
                          : b.label === 'Pos 4–10'
                          ? 'bg-amber-500/80'
                          : b.label === 'Pos 11–20'
                          ? 'bg-primary/70'
                          : 'bg-rose-500/60'
                      }`}
                      style={{ width: `${(b.share * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-foreground/50 mt-1">
                    {fmtPct(b.share, 0)} of impressions · {fmtNumber(b.clicks)} clicks
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <Empty loading={loading} />
          )}
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-5">
          <h2 className="text-base font-bold text-foreground mb-4">Device</h2>
          {data?.devices?.length ? (
            <ul className="space-y-3 text-sm">
              {data.devices.map((d) => {
                const total = data.summary.impressions || 1;
                const share = d.impressions / total;
                return (
                  <li key={d.device}>
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold capitalize text-foreground">{d.device}</span>
                      <span className="text-foreground/70 tabular-nums">{fmtNumber(d.clicks)} clicks</span>
                    </div>
                    <div className="mt-1 w-full h-1.5 rounded-full bg-black/5 overflow-hidden">
                      <div className="h-full bg-primary/70" style={{ width: `${(share * 100).toFixed(1)}%` }} />
                    </div>
                    <p className="text-[11px] text-foreground/50 mt-1">
                      CTR {fmtPct(d.ctr)} · pos {d.position.toFixed(1)}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty loading={loading} />
          )}
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-5">
          <h2 className="text-base font-bold text-foreground mb-4">Top countries</h2>
          {data?.countries?.length ? (
            <ul className="text-sm divide-y divide-black/5">
              {data.countries.map((c) => (
                <li key={c.country} className="flex items-center justify-between py-1.5">
                  <span className="font-mono text-[12px] text-foreground uppercase">{c.country}</span>
                  <span className="font-semibold text-foreground">{fmtNumber(c.clicks)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty loading={loading} />
          )}
        </div>
      </div>

      {/* Quick wins — the gold */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold">✓</span>
          <div>
            <h2 className="text-base font-bold text-foreground">Quick wins</h2>
            <p className="text-[11px] text-foreground/60 mt-0.5">
              Queries on page 2 (pos 11–20) with real impressions — move these to page 1 first
            </p>
          </div>
        </div>
        {data?.quickWins?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.15em] text-foreground/50">
                <tr>
                  <th className="py-2 text-left font-semibold">Query</th>
                  <th className="py-2 text-right font-semibold">Impressions</th>
                  <th className="py-2 text-right font-semibold">Clicks</th>
                  <th className="py-2 text-right font-semibold">CTR</th>
                  <th className="py-2 text-right font-semibold">Position</th>
                </tr>
              </thead>
              <tbody>
                {data.quickWins.map((q) => (
                  <tr key={q.query} className="border-t border-emerald-200/60">
                    <td className="py-2 font-semibold text-foreground truncate max-w-[340px]" title={q.query}>
                      {q.query}
                    </td>
                    <td className="py-2 text-right">{fmtNumber(q.impressions)}</td>
                    <td className="py-2 text-right">{fmtNumber(q.clicks)}</td>
                    <td className="py-2 text-right">{fmtPct(q.ctr)}</td>
                    <td className="py-2 text-right font-semibold">{q.position.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-xs text-foreground/60 py-2">
            {loading
              ? 'Loading…'
              : 'No quick wins in this range — you may need a longer window (try 90D) to surface page-2 opportunities.'}
          </div>
        )}
      </div>

      {/* Top queries + top pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-black/5 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-foreground">Top queries</h2>
            <input
              type="search"
              placeholder="Filter…"
              value={queryFilter}
              onChange={(e) => setQueryFilter(e.target.value)}
              className="rounded-lg border border-black/10 bg-white px-3 py-1 text-[12px] w-40"
            />
          </div>
          {filteredQueries.length ? (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-warm-bg/40 text-[10px] uppercase tracking-[0.15em] text-foreground/50 sticky top-0">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Query</th>
                    <th className="px-5 py-3 text-right font-semibold">Clicks</th>
                    <th className="px-5 py-3 text-right font-semibold">Impr.</th>
                    <th className="px-5 py-3 text-right font-semibold">CTR</th>
                    <th className="px-5 py-3 text-right font-semibold">Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueries.map((q) => (
                    <tr key={q.query} className="border-t border-black/5">
                      <td className="px-5 py-2 truncate max-w-[260px]" title={q.query}>{q.query}</td>
                      <td className="px-5 py-2 text-right font-semibold">{fmtNumber(q.clicks)}</td>
                      <td className="px-5 py-2 text-right">{fmtNumber(q.impressions)}</td>
                      <td className="px-5 py-2 text-right">{fmtPct(q.ctr)}</td>
                      <td className="px-5 py-2 text-right">{q.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty loading={loading} />
          )}
        </div>

        <div className="rounded-2xl border border-black/5 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-foreground">Top pages</h2>
            <input
              type="search"
              placeholder="Filter…"
              value={pageFilter}
              onChange={(e) => setPageFilter(e.target.value)}
              className="rounded-lg border border-black/10 bg-white px-3 py-1 text-[12px] w-40"
            />
          </div>
          {filteredPages.length ? (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-warm-bg/40 text-[10px] uppercase tracking-[0.15em] text-foreground/50 sticky top-0">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Page</th>
                    <th className="px-5 py-3 text-right font-semibold">Clicks</th>
                    <th className="px-5 py-3 text-right font-semibold">Impr.</th>
                    <th className="px-5 py-3 text-right font-semibold">CTR</th>
                    <th className="px-5 py-3 text-right font-semibold">Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPages.map((p) => (
                    <tr key={p.page} className="border-t border-black/5">
                      <td className="px-5 py-2 font-mono text-[12px] truncate max-w-[260px]" title={p.page}>
                        {pathOf(p.page)}
                      </td>
                      <td className="px-5 py-2 text-right font-semibold">{fmtNumber(p.clicks)}</td>
                      <td className="px-5 py-2 text-right">{fmtNumber(p.impressions)}</td>
                      <td className="px-5 py-2 text-right">{fmtPct(p.ctr)}</td>
                      <td className="px-5 py-2 text-right">{p.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty loading={loading} />
          )}
        </div>
      </div>

      {data ? (
        <p className="text-xs text-foreground/40">
          Search Console · {data.site} · {data.range.startDate} → {data.range.endDate}
        </p>
      ) : null}
    </div>
  );
}

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname || '/';
  } catch {
    return url;
  }
}

function SeoKpi({
  label,
  value,
  current,
  previous,
  spark,
  stroke,
  fill,
  inverseDelta,
}: {
  label: string;
  value: string;
  current: number;
  previous: number | null;
  spark?: number[];
  stroke?: string;
  fill?: string;
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
          <Sparkline values={spark} width={200} height={28} strokeClassName={stroke} fillClassName={fill} />
        </div>
      ) : null}
    </div>
  );
}

function Empty({ loading }: { loading: boolean }) {
  return (
    <div className="text-xs text-foreground/50 py-4 px-5">
      {loading ? 'Loading…' : 'No data in this range.'}
    </div>
  );
}
