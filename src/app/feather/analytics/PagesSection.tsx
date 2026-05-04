'use client';

import { useEffect, useMemo, useState } from 'react';
import GoogleReconnectBanner from './GoogleReconnectBanner';
import { type DateRange, fmtDuration, fmtNumber, fmtPct, toApiDate } from './shared';

interface PageRow {
  path: string;
  pageViews: number;
  activeUsers: number;
  avgEngagementSec: number;
  engagementRate: number;
}

interface LandingRow {
  path: string;
  sessions: number;
  activeUsers: number;
  bounceRate: number;
  engagementRate: number;
  avgDurationSec: number;
  pagesPerSession: number;
}

interface GroupRow {
  group: string;
  pageViews: number;
  activeUsers: number;
  avgEngagementSec: number;
}

interface PagesResponse {
  allPages: PageRow[];
  landing: LandingRow[];
  highBounce: { path: string; sessions: number; bounceRate: number }[];
  groups: GroupRow[];
  totalPageViews: number;
}

type Tab = 'top' | 'landing' | 'bounce' | 'groups';

export function PagesSection({ range }: { range: DateRange }) {
  const [data, setData] = useState<PagesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('top');
  const [filter, setFilter] = useState('');

  const queryKey = `${toApiDate(range.start)}_${toApiDate(range.end)}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/google/pages?startDate=${toApiDate(range.start)}&endDate=${toApiDate(range.end)}`,
      { cache: 'no-store' }
    )
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(json?.error ?? `HTTP ${r.status}`);
          setData(null);
        } else {
          setData(json as PagesResponse);
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

  const filteredTop = useMemo(() => {
    if (!data?.allPages) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return data.allPages;
    return data.allPages.filter((p) => p.path.toLowerCase().includes(q));
  }, [data, filter]);

  const filteredLanding = useMemo(() => {
    if (!data?.landing) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return data.landing;
    return data.landing.filter((p) => p.path.toLowerCase().includes(q));
  }, [data, filter]);

  if (error) {
    return (
      <GoogleReconnectBanner label="pages" error={error} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Groups row — always visible, drives quick triage */}
      <div className="rounded-2xl border border-black/5 bg-white p-5">
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-foreground">Content groups</h2>
            <p className="text-[11px] text-foreground/50 mt-0.5">
              Rollup by top-level path segment
            </p>
          </div>
        </div>
        {data?.groups?.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.groups.slice(0, 10).map((g) => {
              const share = data.totalPageViews ? g.pageViews / data.totalPageViews : 0;
              return (
                <div key={g.group} className="rounded-xl border border-black/5 bg-warm-bg/30 p-4">
                  <p className="font-mono text-[11px] text-foreground/60 truncate" title={g.group}>
                    {g.group}
                  </p>
                  <p className="text-xl font-bold text-foreground mt-1">{fmtNumber(g.pageViews)}</p>
                  <p className="text-[11px] text-foreground/50">
                    {fmtNumber(g.activeUsers)} users · {fmtDuration(g.avgEngagementSec)} avg
                  </p>
                  <div className="mt-2 w-full h-1 rounded-full bg-black/5 overflow-hidden">
                    <div className="h-full bg-primary/60" style={{ width: `${(share * 100).toFixed(1)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty loading={loading} />
        )}
      </div>

      <div className="rounded-2xl border border-black/5 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-warm-bg rounded-lg p-0.5">
            {(
              [
                ['top', 'Most viewed'],
                ['landing', 'Landing pages'],
                ['bounce', 'High bounce'],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  tab === key ? 'bg-white shadow-sm text-foreground' : 'text-foreground/60 hover:text-foreground/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Filter paths…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[12px] min-w-[200px]"
          />
        </div>

        {tab === 'top' && (
          <TopPagesTable pages={filteredTop} loading={loading} />
        )}
        {tab === 'landing' && (
          <LandingPagesTable pages={filteredLanding} loading={loading} />
        )}
        {tab === 'bounce' && (
          <BouncePagesTable pages={data?.highBounce ?? []} loading={loading} />
        )}
      </div>
    </div>
  );
}

function TopPagesTable({ pages, loading }: { pages: PageRow[]; loading: boolean }) {
  if (!pages.length) {
    return (
      <div className="px-5 py-6 text-xs text-foreground/50">
        {loading ? 'Loading…' : 'No pages match.'}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-warm-bg/40 text-[10px] uppercase tracking-[0.15em] text-foreground/50 sticky top-0">
          <tr>
            <th className="px-5 py-3 text-left font-semibold">Page</th>
            <th className="px-5 py-3 text-right font-semibold">Views</th>
            <th className="px-5 py-3 text-right font-semibold">Users</th>
            <th className="px-5 py-3 text-right font-semibold">Avg. engage.</th>
            <th className="px-5 py-3 text-right font-semibold">Engagement</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.path} className="border-t border-black/5">
              <td className="px-5 py-2.5 font-mono text-[12px] text-foreground truncate max-w-[400px]" title={p.path}>
                {p.path || '/'}
              </td>
              <td className="px-5 py-2.5 text-right">{fmtNumber(p.pageViews)}</td>
              <td className="px-5 py-2.5 text-right">{fmtNumber(p.activeUsers)}</td>
              <td className="px-5 py-2.5 text-right">{fmtDuration(p.avgEngagementSec)}</td>
              <td className="px-5 py-2.5 text-right">{fmtPct(p.engagementRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LandingPagesTable({ pages, loading }: { pages: LandingRow[]; loading: boolean }) {
  if (!pages.length) {
    return (
      <div className="px-5 py-6 text-xs text-foreground/50">
        {loading ? 'Loading…' : 'No pages match.'}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-warm-bg/40 text-[10px] uppercase tracking-[0.15em] text-foreground/50 sticky top-0">
          <tr>
            <th className="px-5 py-3 text-left font-semibold">Landing page</th>
            <th className="px-5 py-3 text-right font-semibold">Sessions</th>
            <th className="px-5 py-3 text-right font-semibold">Users</th>
            <th className="px-5 py-3 text-right font-semibold">Bounce</th>
            <th className="px-5 py-3 text-right font-semibold">Engage.</th>
            <th className="px-5 py-3 text-right font-semibold">Avg. dur.</th>
            <th className="px-5 py-3 text-right font-semibold">Pgs/sess.</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.path} className="border-t border-black/5">
              <td className="px-5 py-2.5 font-mono text-[12px] text-foreground truncate max-w-[320px]" title={p.path}>
                {p.path || '/'}
              </td>
              <td className="px-5 py-2.5 text-right">{fmtNumber(p.sessions)}</td>
              <td className="px-5 py-2.5 text-right">{fmtNumber(p.activeUsers)}</td>
              <td className="px-5 py-2.5 text-right">{fmtPct(p.bounceRate)}</td>
              <td className="px-5 py-2.5 text-right">{fmtPct(p.engagementRate)}</td>
              <td className="px-5 py-2.5 text-right">{fmtDuration(p.avgDurationSec)}</td>
              <td className="px-5 py-2.5 text-right">{p.pagesPerSession.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BouncePagesTable({
  pages,
  loading,
}: {
  pages: { path: string; sessions: number; bounceRate: number }[];
  loading: boolean;
}) {
  if (!pages.length) {
    return (
      <div className="px-5 py-6 text-xs text-foreground/50">
        {loading ? 'Loading…' : 'No problem pages — nice!'}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-warm-bg/40 text-[10px] uppercase tracking-[0.15em] text-foreground/50">
          <tr>
            <th className="px-5 py-3 text-left font-semibold">Page</th>
            <th className="px-5 py-3 text-right font-semibold">Sessions</th>
            <th className="px-5 py-3 text-right font-semibold">Bounce</th>
            <th className="px-5 py-3 text-right font-semibold w-40">Severity</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.path} className="border-t border-black/5">
              <td className="px-5 py-2.5 font-mono text-[12px] text-foreground truncate max-w-[320px]" title={p.path}>
                {p.path || '/'}
              </td>
              <td className="px-5 py-2.5 text-right">{fmtNumber(p.sessions)}</td>
              <td className="px-5 py-2.5 text-right">{fmtPct(p.bounceRate)}</td>
              <td className="px-5 py-2.5 text-right">
                <div className="inline-flex items-center gap-2">
                  <span className="w-20 h-1.5 rounded-full bg-black/5 overflow-hidden">
                    <span
                      className="block h-full bg-rose-500/70"
                      style={{ width: `${Math.min(100, p.bounceRate * 100).toFixed(1)}%` }}
                    />
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ loading }: { loading: boolean }) {
  return (
    <div className="text-xs text-foreground/50 py-4">
      {loading ? 'Loading…' : 'No data in this range.'}
    </div>
  );
}
