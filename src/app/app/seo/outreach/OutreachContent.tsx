'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SeoSubNav from '../SeoSubNav';
import LinksSubNav from '../LinksSubNav';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { RowChat } from '@/components/RowChat';
import { logActivity } from '@/lib/activity';

// Shared outreach tracker. Renders the same Add-row form + status
// summary + sortable list + per-row chat across the four "Backlinks"
// sub-pages (press releases, guest posts, comments, forums). Each
// page imports this with its own `channel` so rows stay scoped and
// the page header reflects the channel's wording.

export type OutreachChannel = 'press_release' | 'guest_post' | 'comment' | 'forum';

export type OutreachStatus = 'not_started' | 'in_progress' | 'published' | 'declined';

export interface OutreachEntry {
  id: string;
  channel: OutreachChannel;
  url: string;
  title: string | null;
  status: OutreachStatus;
  notes: string | null;
  added_by: string | null;
  added_by_name: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_ORDER: OutreachStatus[] = ['not_started', 'in_progress', 'published', 'declined'];

const STATUS_LABELS: Record<OutreachStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  published: 'Published',
  declined: 'Declined',
};

const STATUS_TONES: Record<OutreachStatus, string> = {
  not_started: 'bg-warm-bg/70 text-foreground/55 border-black/10',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  declined: 'bg-rose-50 text-rose-700 border-rose-200',
};

interface ChannelCopy {
  /** Slug used in /app/seo/<slug> — also the activity log target path. */
  slug: string;
  /** H1 title at the top of the page. */
  title: string;
  /** Subtitle below the H1. */
  blurb: string;
  /** Add-row form heading. */
  addLabel: string;
  /** Default placeholder for the URL input. */
  urlPlaceholder: string;
  /** Default placeholder for the title / topic input. */
  titlePlaceholder: string;
  /** Empty-state copy when there are no rows yet. */
  emptyHeadline: string;
  emptyHint: string;
}

const CHANNEL_COPY: Record<OutreachChannel, ChannelCopy> = {
  press_release: {
    slug: 'press-releases',
    title: 'Press releases',
    blurb:
      'Press release placements + pitches. Add the wire URL or pitch target as you send each one and check it off when it lands.',
    addLabel: 'Add a press release',
    urlPlaceholder: 'https://www.prnewswire.com/news-releases/...',
    titlePlaceholder: 'Headline or pitch topic',
    emptyHeadline: 'No press releases tracked yet.',
    emptyHint: 'Paste a URL above to start tracking your first placement.',
  },
  guest_post: {
    slug: 'guest-posts',
    title: 'Guest posts',
    blurb:
      'Guest-post outreach + placements. Track each pitch, the target site, and the published URL once the piece goes live.',
    addLabel: 'Add a guest post',
    urlPlaceholder: 'https://example.com/blog/our-guest-post',
    titlePlaceholder: 'Pitch topic or working title',
    emptyHeadline: 'No guest posts tracked yet.',
    emptyHint: 'Paste a URL above to start tracking your first pitch or placement.',
  },
  comment: {
    slug: 'comments',
    title: 'Comments',
    blurb:
      'Comment placements on relevant articles. Drop the article URL, leave a thoughtful comment, and track whether it was approved.',
    addLabel: 'Add a comment placement',
    urlPlaceholder: 'https://example.com/article-we-commented-on',
    titlePlaceholder: 'Article or thread title',
    emptyHeadline: 'No comments tracked yet.',
    emptyHint: 'Paste an article URL above to start tracking comment placements.',
  },
  forum: {
    slug: 'forums',
    title: 'Forums',
    blurb:
      'Forum threads we are contributing to. Reddit, Quora, recovery forums — track the threads, what we said, and whether the link stuck.',
    addLabel: 'Add a forum thread',
    urlPlaceholder: 'https://www.reddit.com/r/.../thread/...',
    titlePlaceholder: 'Thread topic or question',
    emptyHeadline: 'No forum threads tracked yet.',
    emptyHint: 'Paste a thread URL above to start tracking forum contributions.',
  },
};

export default function OutreachContent({ channel }: { channel: OutreachChannel }) {
  const { user } = useAuth();
  const copy = CHANNEL_COPY[channel];
  const [rows, setRows] = useState<OutreachEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add-row form
  const [draftUrl, setDraftUrl] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftStatus, setDraftStatus] = useState<OutreachStatus>('in_progress');
  const [adding, setAdding] = useState(false);

  // Status filter (chip strip above the list).
  const [filter, setFilter] = useState<'all' | OutreachStatus>('all');

  // Per-row open chat — the modal hosts the RowChat for one entry at a time.
  const [openChat, setOpenChat] = useState<OutreachEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await db({
        action: 'select',
        table: 'seo_outreach_entries',
        match: { channel },
        order: { column: 'created_at', ascending: false },
      });
      if (Array.isArray(res)) setRows(res as OutreachEntry[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useEffect(() => { void load(); }, [load]);

  // Realtime: any insert/update/delete to this channel's rows
  // refreshes the list. Cheap — we just refetch the whole channel
  // since each channel is small (manual outreach, not crawled data).
  useEffect(() => {
    const channelHandle = supabase
      .channel(`outreach-${channel}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seo_outreach_entries', filter: `channel=eq.${channel}` },
        () => { void load(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channelHandle); };
  }, [channel, load]);

  const counts = useMemo(() => {
    const out: Record<OutreachStatus, number> = {
      not_started: 0, in_progress: 0, published: 0, declined: 0,
    };
    for (const r of rows) out[r.status] = (out[r.status] || 0) + 1;
    return out;
  }, [rows]);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const addEntry = async () => {
    const url = draftUrl.trim();
    if (!url || !user || adding) return;
    setAdding(true);
    setError(null);
    try {
      const inserted = await db({
        action: 'insert',
        table: 'seo_outreach_entries',
        data: {
          channel,
          url,
          title: draftTitle.trim() || null,
          status: draftStatus,
          added_by: user.id,
          added_by_name: user.user_metadata?.full_name || user.email || null,
        },
      });
      if (inserted && (inserted as OutreachEntry).id) {
        const real = inserted as OutreachEntry;
        setRows((prev) => [real, ...prev.filter((r) => r.id !== real.id)]);
        setDraftUrl('');
        setDraftTitle('');
        setDraftStatus('in_progress');
        logActivity({
          userId: user.id,
          type: `seo.${channel}_added`,
          targetKind: `seo_${channel}`,
          targetId: real.id,
          targetLabel: real.title || real.url,
          targetPath: `/app/seo/${copy.slug}`,
          metadata: { url: real.url },
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  };

  const updateStatus = async (id: string, status: OutreachStatus) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    await db({
      action: 'update',
      table: 'seo_outreach_entries',
      match: { id },
      data: { status, updated_at: new Date().toISOString() },
    });
  };

  const remove = async (id: string) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this entry and its chat thread?')) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    await db({ action: 'delete', table: 'seo_outreach_entries', match: { id } });
  };

  // ESC closes the chat modal
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

  return (
    <div className="p-8 max-w-7xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6">
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
          {copy.title}
        </h1>
        <p className="mt-1 text-sm text-foreground/60 max-w-2xl">{copy.blurb}</p>
      </header>

      <SeoSubNav />
      <LinksSubNav />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 mb-5">
          <strong>Couldn&apos;t load {copy.title.toLowerCase()}:</strong> {error}
        </div>
      ) : null}

      {/* Stats card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 mb-5 flex items-stretch gap-5 flex-wrap">
        <div className="flex flex-col justify-center pr-5 border-r border-black/5 min-w-[100px]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">Total</p>
          <p className="text-3xl font-bold tabular-nums mt-0.5 text-foreground">{rows.length}</p>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-2.5">
          {STATUS_ORDER.map((s) => {
            const v = counts[s] ?? 0;
            const dim = v === 0;
            const tone = s === 'published' ? 'text-emerald-600'
              : s === 'in_progress' ? 'text-amber-600'
              : s === 'declined' ? 'text-rose-600'
              : 'text-foreground/55';
            return (
              <div key={s} className="flex flex-col min-w-[88px]">
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${dim ? 'text-foreground/30' : 'text-foreground/55'}`}>
                  {STATUS_LABELS[s]}
                </p>
                <p className={`text-xl font-bold tabular-nums leading-tight ${dim ? 'text-foreground/25' : tone}`}>
                  {v}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add-row form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
        <h2 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          {copy.addLabel}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_auto_auto] gap-2">
          <input
            type="url"
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            placeholder={copy.urlPlaceholder}
            className="px-3 py-2 rounded-lg border border-black/10 bg-warm-bg/40 text-sm focus:outline-none focus:border-primary/50 focus:bg-white"
            disabled={adding}
          />
          <input
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder={copy.titlePlaceholder}
            className="px-3 py-2 rounded-lg border border-black/10 bg-warm-bg/40 text-sm focus:outline-none focus:border-primary/50 focus:bg-white"
            disabled={adding}
          />
          <select
            value={draftStatus}
            onChange={(e) => setDraftStatus(e.target.value as OutreachStatus)}
            className="px-3 py-2 rounded-lg border border-black/10 bg-warm-bg/40 text-sm focus:outline-none focus:border-primary/50 focus:bg-white"
            disabled={adding}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={addEntry}
            disabled={adding || !draftUrl.trim() || !user}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:bg-foreground/30 disabled:cursor-not-allowed"
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="inline-flex items-center gap-1 mb-3 rounded-full bg-foreground/90 p-1">
        <FilterChip label="All" count={rows.length} active={filter === 'all'} onClick={() => setFilter('all')} />
        {STATUS_ORDER.map((s) => (
          <FilterChip
            key={s}
            label={STATUS_LABELS[s]}
            count={counts[s] ?? 0}
            active={filter === s}
            onClick={() => setFilter(s)}
          />
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <p className="p-10 text-center text-sm text-foreground/50">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-foreground/70">{copy.emptyHeadline}</p>
            <p className="text-xs text-foreground/45 mt-1">{copy.emptyHint}</p>
          </div>
        ) : (
          <ul className="divide-y divide-black/5">
            {filtered.map((r) => (
              <li key={r.id} className="px-5 py-3.5 hover:bg-warm-bg/30 transition-colors">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-primary hover:underline break-all"
                    >
                      {r.title || r.url}
                    </a>
                    {r.title ? (
                      <p className="text-[11px] text-foreground/45 break-all mt-0.5">{r.url}</p>
                    ) : null}
                    {r.notes ? (
                      <p className="text-xs text-foreground/65 mt-1 whitespace-pre-line">{r.notes}</p>
                    ) : null}
                    <p className="text-[10px] text-foreground/40 mt-1.5">
                      Added {formatDate(r.created_at)}
                      {r.added_by_name ? ` by ${r.added_by_name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value as OutreachStatus)}
                      className={`px-2 py-1 rounded-md border text-[11px] font-semibold ${STATUS_TONES[r.status]}`}
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setOpenChat(r)}
                      className="px-2.5 py-1 rounded-md border border-black/10 text-[11px] font-medium text-foreground/65 hover:text-foreground hover:bg-warm-bg/50"
                      title="Open the chat thread for this entry"
                    >
                      Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
                      className="px-2 py-1 rounded-md text-[11px] text-foreground/40 hover:text-rose-600 hover:bg-rose-50"
                      title="Delete entry + chat"
                      aria-label="Delete entry"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Chat modal */}
      {openChat ? (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
          onClick={() => setOpenChat(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl h-[600px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-black/5">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-foreground/45 font-semibold">
                  {copy.title} · chat
                </p>
                <p className="text-sm font-semibold text-foreground truncate" title={openChat.url}>
                  {openChat.title || openChat.url}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenChat(null)}
                className="text-foreground/40 hover:text-foreground text-2xl leading-none"
                aria-label="Close chat"
              >
                ×
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <RowChat
                table="seo_outreach_messages"
                keyColumn="entry_id"
                keyValue={openChat.id}
                label={openChat.title || openChat.url}
                targetPath={`/app/seo/${copy.slug}`}
                activityType={`seo.${channel}_chat_message`}
                activityKind={`seo_${channel}`}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors inline-flex items-center gap-1.5 ${
        active ? 'bg-primary text-white' : 'text-white/65 hover:text-white'
      }`}
    >
      {label}
      <span className={`text-[10px] tabular-nums ${active ? 'text-white/80' : 'text-white/40'}`}>{count}</span>
    </button>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return ''; }
}
