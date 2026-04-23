'use client';

import { useEffect, useState } from 'react';

interface GscResponse {
  range: { startDate: string; endDate: string; days: number };
  site: string;
  configuredSite: string | null;
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

interface GscErrorPayload {
  error: string;
  configuredSite?: string | null;
  resolvedSite?: string;
  accessibleSites?: { siteUrl: string; permissionLevel: string }[];
  hint?: string;
}

interface GbpResponse {
  range: { startDate: string; endDate: string; days: number };
  location: {
    name: string;
    title: string | null;
    phone: string | null;
    website: string | null;
    mapsUri: string | null;
    newReviewUri: string | null;
    address: string | null;
  };
  account: { name: string; accountName: string | null; role: string | null };
  metrics: {
    series: { metric: string; total: number; daily: { date: string; value: number }[] }[];
    totals: Record<string, number>;
    error: string | null;
  };
  reviews: {
    reviews: {
      reviewId: string;
      reviewer: { displayName?: string; profilePhotoUrl?: string };
      starRating: number;
      comment?: string;
      createTime: string;
      reply?: { comment: string; updateTime: string };
    }[];
    averageRating: number | null;
    totalReviewCount: number | null;
    error?: string;
  };
  fetched_at: string;
}

interface GbpErrorPayload {
  error: string;
  hint?: string;
  accounts?: { name: string; accountName?: string }[];
}

export default function SeoContent() {
  const [days, setDays] = useState(28);
  const [data, setData] = useState<GscResponse | null>(null);
  const [errorPayload, setErrorPayload] = useState<GscErrorPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const [gbp, setGbp] = useState<GbpResponse | null>(null);
  const [gbpError, setGbpError] = useState<GbpErrorPayload | null>(null);
  const [gbpLoading, setGbpLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorPayload(null);
    fetch(`/api/google/search-console?days=${days}`, { cache: 'no-store' })
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setErrorPayload(json as GscErrorPayload);
          setData(null);
        } else {
          setData(json as GscResponse);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setErrorPayload({ error: e instanceof Error ? e.message : String(e) });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  useEffect(() => {
    let cancelled = false;
    setGbpLoading(true);
    setGbpError(null);
    fetch(`/api/google/business-profile?days=${days}`, { cache: 'no-store' })
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setGbpError(json as GbpErrorPayload);
          setGbp(null);
        } else {
          setGbp(json as GbpResponse);
        }
      })
      .catch((e) => {
        if (!cancelled) setGbpError({ error: e instanceof Error ? e.message : String(e) });
      })
      .finally(() => {
        if (!cancelled) setGbpLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const fmt = (n: number) => n.toLocaleString();
  const fmtPct = (r: number) => `${(r * 100).toFixed(1)}%`;
  const fmtPos = (p: number) => (p ? p.toFixed(1) : '—');

  const gbpTotals = gbp?.metrics?.totals ?? {};
  const gbpImpressions =
    (gbpTotals.BUSINESS_IMPRESSIONS_DESKTOP_MAPS ?? 0) +
    (gbpTotals.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH ?? 0) +
    (gbpTotals.BUSINESS_IMPRESSIONS_MOBILE_MAPS ?? 0) +
    (gbpTotals.BUSINESS_IMPRESSIONS_MOBILE_SEARCH ?? 0);
  const gbpSearch =
    (gbpTotals.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH ?? 0) +
    (gbpTotals.BUSINESS_IMPRESSIONS_MOBILE_SEARCH ?? 0);
  const gbpMaps =
    (gbpTotals.BUSINESS_IMPRESSIONS_DESKTOP_MAPS ?? 0) +
    (gbpTotals.BUSINESS_IMPRESSIONS_MOBILE_MAPS ?? 0);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-2">
            Marketing &amp; Admissions
          </p>
          <h1 className="text-2xl font-bold text-foreground">SEO</h1>
          <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
            Live Search Console performance for {data?.site ?? 'the connected Google property'}.
            Top queries, top pages, Google Business Profile activity, and how the
            site is performing in Google results.
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

      {errorPayload ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p><strong>Couldn&apos;t load Search Console:</strong> {errorPayload.error}</p>
          {errorPayload.hint ? (
            <p className="mt-2 text-red-900/80">{errorPayload.hint}</p>
          ) : null}
          {errorPayload.accessibleSites && errorPayload.accessibleSites.length > 0 ? (
            <div className="mt-3">
              <p className="font-semibold text-red-900">Sites the connected Google account can read:</p>
              <ul className="mt-1 list-disc pl-5 space-y-0.5 font-mono text-[12px] text-red-900/90">
                {errorPayload.accessibleSites.map((s) => (
                  <li key={s.siteUrl}>
                    {s.siteUrl} <span className="opacity-60">({s.permissionLevel})</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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

      <div className="mt-12 mb-4">
        <h2 className="text-lg font-bold text-foreground">Google Business Profile</h2>
        <p className="text-xs text-foreground/50 mt-1">
          {gbp?.location?.title ? (
            <>
              {gbp.location.title}
              {gbp.location.address ? <> · {gbp.location.address}</> : null}
            </>
          ) : (
            'Business views, calls, website clicks, and direction requests from Google Search & Maps.'
          )}
        </p>
      </div>

      {gbpError ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p><strong>Couldn&apos;t load Business Profile:</strong> {gbpError.error}</p>
          {gbpError.hint ? <p className="mt-2 text-amber-900/80">{gbpError.hint}</p> : null}
          {gbpError.accounts && gbpError.accounts.length > 0 ? (
            <div className="mt-3">
              <p className="font-semibold">Accessible Business Profile accounts:</p>
              <ul className="mt-1 list-disc pl-5 space-y-0.5 font-mono text-[12px]">
                {gbpError.accounts.map((a) => (
                  <li key={a.name}>
                    {a.name}
                    {a.accountName ? <> — {a.accountName}</> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {gbp?.metrics?.error ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Performance metrics unavailable: {gbp.metrics.error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat
          label="Profile views"
          value={gbp ? fmt(gbpImpressions) : gbpLoading ? '…' : '—'}
        />
        <Stat
          label="Website clicks"
          value={gbp ? fmt(gbpTotals.WEBSITE_CLICKS ?? 0) : gbpLoading ? '…' : '—'}
        />
        <Stat
          label="Calls"
          value={gbp ? fmt(gbpTotals.CALL_CLICKS ?? 0) : gbpLoading ? '…' : '—'}
        />
        <Stat
          label="Direction requests"
          value={gbp ? fmt(gbpTotals.BUSINESS_DIRECTION_REQUESTS ?? 0) : gbpLoading ? '…' : '—'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Where people find you">
          {gbp ? (
            <div className="space-y-3 text-sm">
              <SplitRow label="Google Search" value={fmt(gbpSearch)} />
              <SplitRow label="Google Maps" value={fmt(gbpMaps)} />
              <SplitRow
                label="Messages / conversations"
                value={fmt(gbpTotals.BUSINESS_CONVERSATIONS ?? 0)}
              />
              {gbp.location.website ? (
                <p className="pt-3 text-xs text-foreground/50 border-t border-black/5">
                  Website: <a className="text-primary hover:underline" href={gbp.location.website} target="_blank" rel="noreferrer">{gbp.location.website}</a>
                </p>
              ) : null}
              {gbp.location.mapsUri ? (
                <p className="text-xs text-foreground/50">
                  <a className="text-primary hover:underline" href={gbp.location.mapsUri} target="_blank" rel="noreferrer">View on Google Maps →</a>
                </p>
              ) : null}
            </div>
          ) : (
            <Empty loading={gbpLoading} />
          )}
        </Panel>

        <Panel title="Recent reviews">
          {gbp?.reviews?.error ? (
            <p className="text-xs text-amber-800">
              Reviews unavailable: {gbp.reviews.error}
            </p>
          ) : gbp?.reviews?.reviews?.length ? (
            <div className="space-y-3">
              {gbp.reviews.averageRating !== null ? (
                <p className="text-xs text-foreground/60">
                  {gbp.reviews.averageRating?.toFixed(1)} ★ average
                  {gbp.reviews.totalReviewCount !== null
                    ? ` · ${fmt(gbp.reviews.totalReviewCount ?? 0)} total reviews`
                    : ''}
                </p>
              ) : null}
              <ul className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {gbp.reviews.reviews.slice(0, 10).map((r) => (
                  <li key={r.reviewId} className="rounded-lg bg-warm-bg/40 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground truncate">
                        {r.reviewer.displayName || 'Google user'}
                      </span>
                      <span className="text-[11px] text-foreground/50">
                        {'★'.repeat(r.starRating)}
                        {'☆'.repeat(Math.max(0, 5 - r.starRating))}
                      </span>
                    </div>
                    {r.comment ? (
                      <p className="mt-1 text-xs text-foreground/70 line-clamp-3">{r.comment}</p>
                    ) : (
                      <p className="mt-1 text-xs text-foreground/40 italic">No comment</p>
                    )}
                    <p className="mt-1 text-[10px] text-foreground/40">
                      {new Date(r.createTime).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Empty loading={gbpLoading} />
          )}
        </Panel>
      </div>

      {gbp?.fetched_at ? (
        <p className="mt-6 text-xs text-foreground/40">
          Business Profile fetched {new Date(gbp.fetched_at).toLocaleString()} · range {gbp.range.startDate} → {gbp.range.endDate} · Performance data lags ~2 days
        </p>
      ) : null}
    </div>
  );
}

function SplitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-foreground/70">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
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
