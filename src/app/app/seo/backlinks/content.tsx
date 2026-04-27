'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SeoSubNav from '../SeoSubNav';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { BacklinkChat } from '@/components/BacklinkChat';

// localStorage for per-user "last read" timestamps so the unread dot
// only lights up when there's a message the current user hasn't seen.
const READ_KEY = 'sa-backlink-chat-read';
function getReadMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(window.localStorage.getItem(READ_KEY) || '{}'); }
  catch { return {}; }
}
function setReadAt(sourceUrl: string, ts: string) {
  if (typeof window === 'undefined') return;
  try {
    const map = getReadMap();
    map[sourceUrl] = ts;
    window.localStorage.setItem(READ_KEY, JSON.stringify(map));
  } catch { /* quota — fine */ }
}

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
  // Per-row chat metadata: latest message timestamp + total count per
  // source_url, plus a localStorage read map so the unread dot only
  // lights up for messages this user hasn't seen.
  const { session } = useAuth();
  const [chatLatest, setChatLatest] = useState<Record<string, string>>({});
  const [chatCounts, setChatCounts] = useState<Record<string, number>>({});
  const [chatRead, setChatRead] = useState<Record<string, string>>({});
  const [openChat, setOpenChat] = useState<BacklinkRow | null>(null);

  // Load chat metadata + subscribe to realtime so the bubble icon
  // updates the moment a teammate posts.
  useEffect(() => {
    if (!session?.access_token) return;
    setChatRead(getReadMap());
    let cancelled = false;
    async function loadChatMeta() {
      const rows = await db({
        action: 'select',
        table: 'seo_backlink_messages',
        select: 'source_url, created_at',
        order: { column: 'created_at', ascending: false },
      }).catch(() => null);
      if (cancelled || !Array.isArray(rows)) return;
      const latest: Record<string, string> = {};
      const counts: Record<string, number> = {};
      for (const r of rows as Array<{ source_url: string; created_at: string }>) {
        if (!latest[r.source_url]) latest[r.source_url] = r.created_at;
        counts[r.source_url] = (counts[r.source_url] || 0) + 1;
      }
      setChatLatest(latest);
      setChatCounts(counts);
    }
    loadChatMeta();
    const channel = supabase
      .channel('backlinks-chat-meta')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'seo_backlink_messages' }, (payload) => {
        const row = payload.new as { source_url: string; created_at: string };
        setChatLatest((prev) => ({ ...prev, [row.source_url]: row.created_at }));
        setChatCounts((prev) => ({ ...prev, [row.source_url]: (prev[row.source_url] || 0) + 1 }));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'seo_backlink_messages' }, (payload) => {
        const row = payload.old as { source_url: string };
        setChatCounts((prev) => {
          const next = { ...prev };
          if (next[row.source_url]) next[row.source_url] = Math.max(0, next[row.source_url] - 1);
          return next;
        });
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session]);

  const markChatRead = useCallback((sourceUrl: string) => {
    const ts = chatLatest[sourceUrl] || new Date().toISOString();
    setReadAt(sourceUrl, ts);
    setChatRead((prev) => ({ ...prev, [sourceUrl]: ts }));
  }, [chatLatest]);

  const isUnread = (sourceUrl: string): boolean => {
    const latest = chatLatest[sourceUrl];
    if (!latest) return false;
    const read = chatRead[sourceUrl];
    if (!read) return true;
    return new Date(latest).getTime() > new Date(read).getTime();
  };

  const openComments = (row: BacklinkRow) => {
    setOpenChat(row);
    markChatRead(row.source_url);
  };

  // Close the drawer on Escape + lock body scroll while open.
  useEffect(() => {
    if (!openChat) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenChat(null); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [openChat]);

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
                  <Th className="text-right w-12">Notes</Th>
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
                    <Td className="text-right">
                      <button
                        type="button"
                        onClick={() => openComments(r)}
                        title={chatCounts[r.source_url] ? `${chatCounts[r.source_url]} comment${chatCounts[r.source_url] === 1 ? '' : 's'}` : 'Add a comment'}
                        aria-label="Open comments"
                        className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg text-foreground/45 hover:text-primary hover:bg-primary/5 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                        {chatCounts[r.source_url] ? (
                          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[9px] font-bold tabular-nums">
                            {chatCounts[r.source_url] > 99 ? '99+' : chatCounts[r.source_url]}
                          </span>
                        ) : null}
                        {isUnread(r.source_url) && (
                          <span aria-label="Unread" className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                        )}
                      </button>
                    </Td>
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

      {openChat && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Comments for ${openChat.source_url}`}
          className="fixed inset-0 z-[100] flex justify-end"
          onClick={() => setOpenChat(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <aside
            className="relative bg-white w-full sm:max-w-md h-full shadow-2xl flex flex-col animate-drawer-slide"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <header className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/45">
                  Backlink comments
                </p>
                <p className="text-sm font-medium text-foreground truncate mt-0.5" title={openChat.source_title || openChat.source_url}>
                  {openChat.source_title || openChat.source_url}
                </p>
                <a
                  href={openChat.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary/70 hover:text-primary hover:underline truncate block max-w-full"
                  title={openChat.source_url}
                >
                  {openChat.source_url}
                </a>
              </div>
              <button
                type="button"
                onClick={() => setOpenChat(null)}
                aria-label="Close"
                className="shrink-0 p-1.5 rounded-lg text-foreground/45 hover:bg-warm-bg hover:text-foreground/80 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>
            <div className="flex-1 min-h-0">
              <BacklinkChat
                sourceUrl={openChat.source_url}
                label={openChat.source_title || openChat.source_url}
              />
            </div>
          </aside>
        </div>
      )}
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
