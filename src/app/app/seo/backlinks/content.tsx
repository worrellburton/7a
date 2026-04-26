'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SeoSubNav from '../SeoSubNav';

// Backlinks dashboard powered by a persisted Semrush snapshot. Click
// "Sync" to refresh against Semrush — until then everyone reads the
// last good pull. Filter chips (All / Dofollow / Nofollow / UGC /
// Sponsored) operate purely client-side over the snapshot rows so
// switching is instant and free.

interface BacklinkRow {
  source_url: string;
  source_title: string;
  target_url: string;
  anchor: string;
  external_num: number;
  internal_num: number;
  first_seen: string;
  last_seen: string;
  is_follow: boolean;
  is_nofollow: boolean;
  is_ugc: boolean;
  is_sponsored: boolean;
  response_code: number;
  page_score: number;
}

interface Overview {
  domain_score: number | null;
  total: number;
  follows_num: number;
  nofollows_num: number;
  ips_num: number;
  ref_domains_num: number;
  ref_pages_num: number;
}

interface RefDomainBucket {
  label: string;
  lo: number;
  hi: number;
  count: number;
}

interface Snapshot {
  target: string;
  overview: Overview | null;
  rows: BacklinkRow[];
  refdomain_buckets?: RefDomainBucket[];
  total_in_snapshot?: number;
  synced_at: string | null;
  synced_by_name: string | null;
  empty?: boolean;
}

type Filter = 'all' | 'follow' | 'nofollow' | 'ugc' | 'sponsored';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'follow', label: 'Dofollow' },
  { id: 'nofollow', label: 'Nofollow' },
  { id: 'ugc', label: 'UGC' },
  { id: 'sponsored', label: 'Sponsored' },
];

function applyFilter(rows: BacklinkRow[], filter: Filter): BacklinkRow[] {
  switch (filter) {
    case 'follow': return rows.filter((r) => r.is_follow);
    case 'nofollow': return rows.filter((r) => r.is_nofollow);
    case 'ugc': return rows.filter((r) => r.is_ugc);
    case 'sponsored': return rows.filter((r) => r.is_sponsored);
    case 'all':
    default: return rows;
  }
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.round(diffSec / 60)} min ago`;
  if (diffSec < 86_400) return `${Math.round(diffSec / 3600)} hr ago`;
  return `${Math.round(diffSec / 86_400)} d ago`;
}

export default function BacklinksContent() {
  const [filter, setFilter] = useState<Filter>('all');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/backlinks', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setSnapshot(json as Snapshot);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/backlinks', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setSnapshot(json as Snapshot);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const overview = snapshot?.overview ?? null;
  const followPct = useMemo(() => {
    if (!overview || overview.total === 0) return null;
    return (overview.follows_num / overview.total) * 100;
  }, [overview]);

  const visibleRows = useMemo(() => {
    if (!snapshot) return [];
    return applyFilter(snapshot.rows ?? [], filter);
  }, [snapshot, filter]);

  return (
    <div className="p-8 max-w-7xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/app/seo"
              className="text-xs font-semibold text-foreground/40 hover:text-primary uppercase tracking-wider inline-flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              SEO
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Backlinks
          </h1>
          <p className="mt-1 text-sm text-foreground/60 max-w-2xl">
            Backlink profile from Semrush. Dofollow links pass ranking authority; nofollow / UGC / sponsored don&apos;t but still count for brand reach + crawl discovery. Click <span className="font-semibold">Sync</span> to refresh.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={sync}
            disabled={syncing}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition ${
              syncing
                ? 'bg-foreground/40 text-white cursor-wait'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
            title="Pull a fresh snapshot from Semrush. Each sync uses Semrush API units, so don't hammer the button."
          >
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <path d="M21 4v5h-5" />
            </svg>
            {syncing ? 'Syncing…' : 'Sync from Semrush'}
          </button>
          <p className="text-[11px] text-foreground/50 tabular-nums">
            Last updated{' '}
            <span className="font-medium text-foreground/70">
              {relativeTime(snapshot?.synced_at ?? null)}
            </span>
            {snapshot?.synced_by_name ? (
              <span className="text-foreground/40"> by {snapshot.synced_by_name}</span>
            ) : null}
          </p>
        </div>
      </header>

      <SeoSubNav />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 mb-5">
          <strong>Couldn&apos;t load backlinks:</strong> {error}
        </div>
      ) : null}

      {snapshot?.empty && !error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 mb-5">
          No snapshot yet for <span className="font-mono">{snapshot.target}</span>.
          Click <span className="font-semibold">Sync from Semrush</span> to pull the first one.
        </div>
      ) : null}

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <OverviewCard label="Domain score" value={overview?.domain_score ?? null} suffix="" loading={loading} accent="primary" />
        <OverviewCard label="Total backlinks" value={overview?.total ?? null} loading={loading} />
        <OverviewCard label="Dofollow" value={overview?.follows_num ?? null} loading={loading} accent="emerald"
          subtitle={followPct != null ? `${followPct.toFixed(1)}% of total` : undefined} />
        <OverviewCard label="Nofollow" value={overview?.nofollows_num ?? null} loading={loading} />
        <OverviewCard label="Ref. domains" value={overview?.ref_domains_num ?? null} loading={loading}
          subtitle={overview?.ref_pages_num != null ? `${overview.ref_pages_num.toLocaleString()} pages` : undefined} />
      </div>

      {/* Filter chips */}
      <div className="bg-foreground rounded-xl p-1 inline-flex flex-wrap gap-1 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              f.id === filter
                ? 'bg-primary text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading && !snapshot ? (
          <div className="p-10 text-center text-sm text-foreground/50">Loading…</div>
        ) : !snapshot || visibleRows.length === 0 ? (
          <div className="p-10 text-center text-sm text-foreground/50">
            {snapshot?.empty
              ? 'Sync to see backlinks.'
              : (snapshot?.total_in_snapshot ?? 0) === 0
                ? 'No backlinks in the latest snapshot — Semrush may not have indexed any yet.'
                : `No ${filter === 'all' ? '' : filter} backlinks in the snapshot. Try a different filter or run Sync to refresh.`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-warm-bg/40 text-[11px] uppercase tracking-wider text-foreground/55">
                <tr>
                  <Th>Source</Th>
                  <Th>Anchor → Target</Th>
                  <Th>Type</Th>
                  <Th className="text-right">Page score</Th>
                  <Th className="text-right">Last seen</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {visibleRows.map((r, i) => (
                  <tr key={`${r.source_url}-${i}`} className="align-top">
                    <Td>
                      <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium truncate max-w-[280px] block" title={r.source_url}>
                        {r.source_title || domainOf(r.source_url) || r.source_url}
                      </a>
                      <p className="text-[11px] text-foreground/45 truncate max-w-[280px]" title={r.source_url}>
                        {r.source_url}
                      </p>
                    </Td>
                    <Td>
                      <p className="font-medium text-foreground truncate max-w-[260px]" title={r.anchor}>
                        {r.anchor || <span className="italic text-foreground/40">(no anchor text)</span>}
                      </p>
                      <p className="text-[11px] text-foreground/45 truncate max-w-[260px]" title={r.target_url}>
                        → {r.target_url}
                      </p>
                    </Td>
                    <Td>
                      <TypeChips r={r} />
                    </Td>
                    <Td className="text-right tabular-nums">{r.page_score || '—'}</Td>
                    <Td className="text-right text-foreground/60">{r.last_seen || '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {snapshot?.target ? (
        <p className="text-[11px] text-foreground/40 mt-3">
          Target <span className="font-mono">{snapshot.target}</span>
          {snapshot?.total_in_snapshot != null
            ? ` · ${snapshot.total_in_snapshot} rows in snapshot`
            : ''}
          {' · '}
          <Link href="/app/seo/refdomains" className="underline decoration-dotted hover:text-foreground">
            See referring-domain quality
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function OverviewCard({
  label,
  value,
  suffix = '',
  subtitle,
  loading,
  accent,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  subtitle?: string;
  loading: boolean;
  accent?: 'primary' | 'emerald';
}) {
  const color =
    accent === 'primary' ? 'text-primary'
    : accent === 'emerald' ? 'text-emerald-600'
    : 'text-foreground';
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-1 ${color}`}>
        {loading && value == null ? '…' : value == null ? '—' : value.toLocaleString()}{suffix}
      </p>
      {subtitle ? <p className="text-[11px] text-foreground/45 mt-0.5">{subtitle}</p> : null}
    </div>
  );
}

function TypeChips({ r }: { r: BacklinkRow }) {
  const chips: { label: string; tone: string }[] = [];
  if (r.is_follow) chips.push({ label: 'Dofollow', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
  if (r.is_nofollow) chips.push({ label: 'Nofollow', tone: 'bg-gray-50 text-gray-700 border-gray-200' });
  if (r.is_ugc) chips.push({ label: 'UGC', tone: 'bg-amber-50 text-amber-700 border-amber-200' });
  if (r.is_sponsored) chips.push({ label: 'Sponsored', tone: 'bg-rose-50 text-rose-700 border-rose-200' });
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c.label}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border ${c.tone}`}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left px-4 py-2.5 font-semibold border-b border-black/10 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function domainOf(url: string): string | null {
  try { return new URL(url).host; } catch { return null; }
}
