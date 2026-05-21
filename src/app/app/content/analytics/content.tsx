'use client';

// /app/content/analytics — overview of every blog the site publishes,
// scored against GA4 so the marketing team can see at a glance which
// posts are pulling traffic and which are dragging. One round-trip
// to /api/content/analytics-overview returns the catalogue + GA4
// metrics joined by pagePath; everything else is plain client-side
// sorting / filtering.

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

interface BlogRow {
  path: string;
  title: string;
  slug: string;
  source: 'ai' | 'static';
  status?: string;
  publishedAt?: string | null;
  updatedAt?: string | null;
  episodeNumber?: number | null;
  pageViews: number;
  activeUsers: number;
  sessions: number;
  avgEngagementSec: number;
  engagementRate: number;
}
interface ChannelRow { channel: string; sessions: number; activeUsers: number; pageViews: number }
interface CountryRow { country: string; activeUsers: number; pageViews: number }
interface DeviceRow { device: string; activeUsers: number; pageViews: number; engagementRate: number }
interface Totals {
  pageViews: number;
  activeUsers: number;
  sessions: number;
  newUsers: number;
  avgEngagementSec: number;
  engagementRate: number;
  bounceRate: number;
}
interface Payload {
  configured: boolean;
  error?: string;
  range: { startDate: string; endDate: string; days: number };
  totals: Totals;
  blogs: BlogRow[];
  channels: ChannelRow[];
  countries: CountryRow[];
  devices: DeviceRow[];
}

type SortKey = 'pageViews' | 'activeUsers' | 'engagementRate' | 'avgEngagementSec';
type SourceFilter = 'all' | 'ai' | 'static';

export default function AnalyticsOverviewContent() {
  const { user, isSuperAdmin, session } = useAuth();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [sortKey, setSortKey] = useState<SortKey>('pageViews');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/content/analytics-overview?days=${days}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((j as { error?: string }).error ?? `HTTP ${r.status}`);
        return j as Payload;
      })
      .then((j) => { if (!cancelled) setData(j); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.access_token, days]);

  const blogs = data?.blogs ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return blogs
      .filter((b) => sourceFilter === 'all' || b.source === sourceFilter)
      .filter((b) => !q || b.title.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q));
  }, [blogs, sourceFilter, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      // Always descending for the four numeric keys; ties broken by
      // page views so a row with great engagement but no traffic
      // doesn't outrank a row with both.
      if (av !== bv) return bv - av;
      return b.pageViews - a.pageViews;
    });
  }, [filtered, sortKey]);

  const total = filtered.reduce((a, b) => a + b.pageViews, 0);
  const top10 = sorted.slice(0, 10);

  if (!user) return null;
  if (!isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center" style={{ fontFamily: 'var(--font-body)' }}>
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/45 mb-2">Marketing &amp; Admissions</p>
        <h1 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-display)' }}>Content analytics</h1>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-900 leading-relaxed">
          <p className="font-semibold mb-1">Super-admin only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="mb-3">
        <Link href="/app/content" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; All content</Link>
      </div>
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Marketing &amp; Admissions</p>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Content analytics</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Every blog on the site, scored against GA4. Sort to find your best performers or the ones falling behind.
          </p>
        </div>
        <div className="flex items-center gap-1">
          {[7, 30, 90, 365].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDays(n)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${days === n ? 'bg-foreground text-white border-foreground' : 'bg-white text-foreground/65 border-black/10 hover:bg-warm-bg/60'}`}
            >
              {n === 7 ? '7d' : n === 30 ? '30d' : n === 90 ? '90d' : '1y'}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">{error}</div>
      )}
      {data && !data.configured && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          GA4 isn&apos;t configured. Connect a property in <Link href="/app/admin" className="underline">/app/admin</Link> to see real numbers; the table below still lists every blog so you can see what&apos;s in the catalogue.
        </div>
      )}

      {/* Aggregate KPIs */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
        <Kpi label="Page views" value={data?.totals.pageViews ?? 0} />
        <Kpi label="Active users" value={data?.totals.activeUsers ?? 0} />
        <Kpi label="Sessions" value={data?.totals.sessions ?? 0} />
        <Kpi label="New users" value={data?.totals.newUsers ?? 0} />
        <Kpi label="Avg engagement" value={`${Math.round(data?.totals.avgEngagementSec ?? 0)}s`} small />
        <Kpi label="Engagement rate" value={`${Math.round((data?.totals.engagementRate ?? 0) * 100)}%`} small />
        <Kpi label="Bounce rate" value={`${Math.round((data?.totals.bounceRate ?? 0) * 100)}%`} small />
      </section>

      {/* Top 10 performers */}
      <section className="mb-6 rounded-2xl border border-black/10 bg-white overflow-hidden">
        <header className="px-4 py-3 border-b border-black/5 flex items-baseline justify-between">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">Top 10 by page views</p>
          <p className="text-[11px] text-foreground/45">last {data?.range.days ?? days}d · across the blog catalogue</p>
        </header>
        {loading ? (
          <p className="px-4 py-8 text-[12.5px] text-foreground/55 italic text-center">Loading…</p>
        ) : top10.length === 0 ? (
          <p className="px-4 py-8 text-[12.5px] text-foreground/55 italic text-center">No traffic on any blog yet.</p>
        ) : (
          <ol className="divide-y divide-black/5">
            {top10.map((b, i) => {
              const share = total > 0 ? b.pageViews / total : 0;
              return (
                <li key={b.path} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="shrink-0 w-7 text-[12px] font-bold text-foreground/55 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{b.title}</p>
                    <p className="text-[11px] text-foreground/55 truncate font-mono">{b.path}</p>
                  </div>
                  <div className="shrink-0 w-32">
                    <div className="h-1.5 bg-warm-bg/60 rounded-full overflow-hidden">
                      <div className="h-full bg-primary/80 rounded-full" style={{ width: `${Math.max(2, share * 100)}%` }} />
                    </div>
                  </div>
                  <span className="shrink-0 w-16 text-right text-[13px] font-semibold tabular-nums">{b.pageViews.toLocaleString()}</span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Mix tiles */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <MixCard label="Channels" rows={(data?.channels ?? []).map((c) => ({ label: c.channel, value: c.sessions }))} unit="sessions" />
        <MixCard label="Countries" rows={(data?.countries ?? []).map((c) => ({ label: c.country, value: c.activeUsers }))} unit="users" />
        <MixCard label="Devices" rows={(data?.devices ?? []).map((d) => ({ label: d.device, value: d.activeUsers }))} unit="users" />
      </section>

      {/* Full sortable table */}
      <section className="rounded-2xl border border-black/10 bg-white overflow-hidden">
        <header className="px-4 py-3 border-b border-black/5 flex items-center justify-between flex-wrap gap-2">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">All blogs · {sorted.length}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title or slug…"
              className="px-2 py-1 rounded-md border border-black/10 bg-white text-[11.5px] w-44 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <SegBtn active={sourceFilter === 'all'} onClick={() => setSourceFilter('all')}>All</SegBtn>
            <SegBtn active={sourceFilter === 'ai'} onClick={() => setSourceFilter('ai')}>AI</SegBtn>
            <SegBtn active={sourceFilter === 'static'} onClick={() => setSourceFilter('static')}>Hand-coded</SegBtn>
          </div>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-warm-bg/40 text-foreground/55 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2">Blog</th>
                <SortTh active={sortKey === 'pageViews'} onClick={() => setSortKey('pageViews')}>Page views</SortTh>
                <SortTh active={sortKey === 'activeUsers'} onClick={() => setSortKey('activeUsers')}>Users</SortTh>
                <SortTh active={sortKey === 'avgEngagementSec'} onClick={() => setSortKey('avgEngagementSec')}>Avg engagement</SortTh>
                <SortTh active={sortKey === 'engagementRate'} onClick={() => setSortKey('engagementRate')}>Engagement rate</SortTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {sorted.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-[12.5px] text-foreground/55 italic text-center">No matches.</td></tr>
              ) : sorted.map((b) => (
                <tr key={b.path} className="hover:bg-warm-bg/40">
                  <td className="px-3 py-2 min-w-[18rem]">
                    <div className="flex items-center gap-2">
                      <span className={`shrink-0 inline-block px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border ${b.source === 'ai' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-warm-bg/60 text-foreground/55 border-black/10'}`}>
                        {b.source === 'ai' ? 'AI' : 'Hand'}
                      </span>
                      {b.episodeNumber && (
                        <span className="shrink-0 text-[10px] font-bold text-foreground/45 tabular-nums">Ep {b.episodeNumber}</span>
                      )}
                      <a href={b.path} target="_blank" rel="noreferrer" className="font-semibold text-foreground truncate hover:underline">{b.title}</a>
                    </div>
                    <p className="text-[10.5px] text-foreground/45 truncate font-mono">{b.path}</p>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.pageViews.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.activeUsers.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{Math.round(b.avgEngagementSec)}s</td>
                  <td className="px-3 py-2 text-right tabular-nums">{Math.round(b.engagementRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, small }: { label: string; value: number | string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white px-3 py-2">
      <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-foreground/55 truncate">{label}</p>
      <p className={`mt-0.5 ${small ? 'text-base' : 'text-xl'} font-semibold tabular-nums text-foreground`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  );
}

function MixCard({ label, rows, unit }: { label: string; rows: { label: string; value: number }[]; unit: string }) {
  const total = rows.reduce((a, b) => a + b.value, 0);
  return (
    <div className="rounded-xl border border-black/10 bg-white">
      <header className="px-3 py-2 border-b border-black/5">
        <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-foreground/55">{label}</p>
      </header>
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-[11.5px] italic text-foreground/45">No data.</p>
      ) : (
        <ul className="px-3 py-2 space-y-1.5">
          {rows.slice(0, 6).map((r) => (
            <li key={r.label} className="text-[11.5px] flex items-center gap-2">
              <span className="flex-1 truncate text-foreground/85">{r.label}</span>
              <div className="shrink-0 w-20">
                <div className="h-1.5 bg-warm-bg/60 rounded-full overflow-hidden">
                  <div className="h-full bg-foreground/55 rounded-full" style={{ width: `${total > 0 ? Math.max(2, (r.value / total) * 100) : 0}%` }} />
                </div>
              </div>
              <span className="shrink-0 w-12 text-right tabular-nums text-foreground/55">{r.value.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
      <footer className="px-3 py-1.5 text-[10px] text-foreground/40 border-t border-black/5">{unit}</footer>
    </div>
  );
}

function SegBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded-md text-[11px] font-semibold border ${active ? 'bg-foreground text-white border-foreground' : 'bg-white text-foreground/65 border-black/10 hover:bg-warm-bg/60'}`}
    >
      {children}
    </button>
  );
}

function SortTh({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <th className="text-right px-3 py-2">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${active ? 'text-foreground' : 'text-foreground/55 hover:text-foreground'}`}
      >
        {children}
        <span aria-hidden className={`text-[9px] ${active ? 'opacity-80' : 'opacity-30'}`}>{active ? '▼' : '▽'}</span>
      </button>
    </th>
  );
}
