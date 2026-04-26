'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import SeoSubNav from '../SeoSubNav';

// Live backlinks dashboard powered by Semrush analytics v1. The
// overview cards mirror what Semrush's own dashboard surfaces,
// and the filter chips (All / Dofollow / Nofollow / UGC /
// Sponsored) operate on the loaded page so the chip change feels
// instant — refilling chip state doesn't refetch.

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

interface Response {
  target: string;
  filter: string;
  overview: Overview | null;
  rows: BacklinkRow[];
  total_in_page: number;
  filtered_in_page: number;
  fetched_at: string;
  cached?: boolean;
  error?: string;
}

type Filter = 'all' | 'follow' | 'nofollow' | 'ugc' | 'sponsored';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'follow', label: 'Dofollow' },
  { id: 'nofollow', label: 'Nofollow' },
  { id: 'ugc', label: 'UGC' },
  { id: 'sponsored', label: 'Sponsored' },
];

export default function BacklinksContent() {
  const [filter, setFilter] = useState<Filter>('all');
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/seo/backlinks?filter=${encodeURIComponent(filter)}`, { cache: 'no-store' })
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(json?.error ?? `HTTP ${r.status}`);
          setData(null);
        } else {
          setData(json as Response);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter]);

  const overview = data?.overview ?? null;
  const followPct = useMemo(() => {
    if (!overview || overview.total === 0) return null;
    return (overview.follows_num / overview.total) * 100;
  }, [overview]);

  return (
    <div className="p-4 sm:p-6 lg:p-10" style={{ fontFamily: 'var(--font-body)' }}>
      <SeoSubNav />
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
            Live backlink profile from Semrush. Dofollow links pass ranking authority; nofollow / UGC / sponsored don&apos;t but still count for brand reach + crawl discovery. Filter to spot-check each bucket.
          </p>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Couldn&apos;t load backlinks:</strong> {error}
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
        {loading && !data ? (
          <div className="p-10 text-center text-sm text-foreground/50">Loading…</div>
        ) : !data || data.rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-foreground/50">
            {data?.total_in_page === 0
              ? 'No backlinks returned for this domain — Semrush may not have indexed any yet.'
              : `No ${filter === 'all' ? '' : filter} backlinks in this page of results.`}
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
                {data.rows.map((r, i) => (
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

      {data?.fetched_at ? (
        <p className="text-[11px] text-foreground/40 mt-3">
          Fetched {new Date(data.fetched_at).toLocaleString()}
          {data.cached ? ' · from cache (10 min TTL)' : ''}
          {' · target '}<span className="font-mono">{data.target}</span>
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
