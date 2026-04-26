'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SeoSubNav from '../SeoSubNav';

// Referring-domain quality view. Same data source as the Backlinks
// page (the seo_backlinks_snapshots table) — this page just slices
// the snapshot's ref-domain rows by Authority Score so you can see
// at a glance whether the link profile leans toward high-authority
// domains or long-tail low-DA ones.
//
// Visual mirrors Semrush's "Referring Domains by Authority Score"
// histogram: 10 buckets, 91-100 at the top → 0-10 at the bottom,
// each row showing % of total + count + a horizontal bar.

interface RefDomainBucket {
  label: string;
  lo: number;
  hi: number;
  count: number;
}

interface RefDomainRow {
  domain: string;
  ascore: number;
  backlinks_num: number;
  ip: string;
  country: string;
  first_seen: string;
  last_seen: string;
}

interface Snapshot {
  target: string;
  refdomain_buckets: RefDomainBucket[];
  refdomains?: RefDomainRow[];
  synced_at: string | null;
  synced_by_name: string | null;
  empty?: boolean;
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

// Fade from light blue (low authority) → strong blue (high authority).
// Matches the Semrush histogram's gradient cue at a glance.
function barColorForAscore(lo: number): string {
  if (lo >= 81) return '#10b981'; // emerald — top quality
  if (lo >= 61) return '#0ea5e9'; // sky-500 — strong
  if (lo >= 41) return '#3b82f6'; // blue-500 — good
  if (lo >= 21) return '#60a5fa'; // blue-400 — fair
  return '#bfdbfe';               // blue-200 — long tail
}

export default function RefDomainsContent() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullList, setShowFullList] = useState(false);
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

  const buckets = snapshot?.refdomain_buckets ?? [];
  const total = useMemo(
    () => buckets.reduce((acc, b) => acc + b.count, 0),
    [buckets],
  );
  // Bar widths are scaled against the busiest bucket so even a tiny
  // 91-100 segment shows a sliver — easier to compare distributions.
  const maxCount = useMemo(
    () => buckets.reduce((acc, b) => Math.max(acc, b.count), 0),
    [buckets],
  );

  const sortedDomains = useMemo(() => {
    return [...(snapshot?.refdomains ?? [])].sort((a, b) => b.ascore - a.ascore);
  }, [snapshot?.refdomains]);

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
            Referring Domains
          </h1>
          <p className="mt-1 text-sm text-foreground/60 max-w-2xl">
            Distribution of referring domains by Semrush Authority Score (0-100).
            High-authority links carry more SEO weight — a healthy profile has at
            least some 50+ domains, not just long-tail 0-10 ones.
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
            title="Pull a fresh snapshot from Semrush. Same data feeds Backlinks too."
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
          <strong>Couldn&apos;t load referring domains:</strong> {error}
        </div>
      ) : null}

      {snapshot?.empty && !error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 mb-5">
          No snapshot yet. Click <span className="font-semibold">Sync from Semrush</span> to pull the first one.
        </div>
      ) : null}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Referring Domains by Authority Score
            </h2>
            <p className="text-[11px] text-foreground/50 mt-0.5">
              {total > 0
                ? `${total.toLocaleString()} domains in snapshot`
                : 'No data yet — Sync to populate.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowFullList((v) => !v)}
            className="text-[12px] font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-1"
          >
            {showFullList ? 'Hide full report' : 'View full report'}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={showFullList ? 'M19 15l-7-7-7 7' : 'M5 9l7 7 7-7'} />
            </svg>
          </button>
        </div>

        {loading && !snapshot ? (
          <p className="text-sm text-foreground/50 py-10 text-center">Loading…</p>
        ) : (
          <div className="space-y-2.5">
            {buckets.map((b) => {
              const pct = total === 0 ? 0 : (b.count / total) * 100;
              const barWidth = maxCount === 0 ? 0 : (b.count / maxCount) * 100;
              return (
                <div key={b.label} className="grid grid-cols-[64px_1fr_56px_48px] items-center gap-3 text-[13px]">
                  <div className="text-foreground/70 tabular-nums">{b.label}</div>
                  <div className="relative h-5 rounded bg-warm-bg/60 overflow-hidden">
                    <div
                      className="h-full rounded transition-[width] duration-700"
                      style={{ width: `${barWidth}%`, background: barColorForAscore(b.lo) }}
                    />
                  </div>
                  <div className="text-right text-foreground/55 tabular-nums">
                    {pct < 1 && pct > 0 ? '<1%' : `${Math.round(pct)}%`}
                  </div>
                  <div className="text-right text-primary font-semibold tabular-nums">
                    {b.count.toLocaleString()}
                  </div>
                </div>
              );
            })}
            {buckets.length === 0 ? (
              <p className="text-sm text-foreground/50 py-6 text-center">
                No buckets yet. Run Sync to pull referring-domain data.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {showFullList ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-5">
          <div className="p-5 sm:p-6 border-b border-black/5 flex items-baseline justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Top referring domains</h3>
              <p className="text-[11px] text-foreground/50 mt-0.5">
                Sorted by Authority Score (Semrush, 0-100).
                {snapshot?.refdomains?.length
                  ? ` Showing ${sortedDomains.length} of the snapshot's pull.`
                  : ''}
              </p>
            </div>
          </div>
          {sortedDomains.length === 0 ? (
            <p className="p-10 text-center text-sm text-foreground/50">
              No referring domains in this snapshot yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-warm-bg/40 text-[11px] uppercase tracking-wider text-foreground/55">
                  <tr>
                    <Th>Domain</Th>
                    <Th className="text-right">AS</Th>
                    <Th className="text-right">Backlinks</Th>
                    <Th>Country</Th>
                    <Th>First seen</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {sortedDomains.map((d) => (
                    <tr key={d.domain}>
                      <Td>
                        <a
                          href={`https://${d.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-medium"
                        >
                          {d.domain}
                        </a>
                      </Td>
                      <Td className="text-right tabular-nums">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${ascorePillTone(d.ascore)}`}>
                          {d.ascore}
                        </span>
                      </Td>
                      <Td className="text-right tabular-nums">{d.backlinks_num.toLocaleString()}</Td>
                      <Td className="text-foreground/55 uppercase">{d.country || '—'}</Td>
                      <Td className="text-foreground/55">{d.first_seen || '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {snapshot?.target ? (
        <p className="text-[11px] text-foreground/40 mt-3">
          Target <span className="font-mono">{snapshot.target}</span>
          {' · '}
          <Link href="/app/seo/backlinks" className="underline decoration-dotted hover:text-foreground">
            Back to Backlinks
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function ascorePillTone(score: number): string {
  if (score >= 81) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (score >= 61) return 'bg-sky-50 text-sky-700 border border-sky-200';
  if (score >= 41) return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (score >= 21) return 'bg-blue-50 text-blue-600 border border-blue-100';
  return 'bg-warm-bg/70 text-foreground/60 border border-black/5';
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left px-4 py-2.5 font-semibold border-b border-black/10 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
