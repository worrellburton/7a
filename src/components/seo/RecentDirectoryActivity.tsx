'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';

// Live feed of every seo.* event from public.activity_log — the
// single feed for the whole SEO area. Renders on /app/seo/actions
// (the Activities tab) and surfaces directory edits, backlink
// adds/removes/comments, Speed audit runs, outing-photo loads,
// and anything else that writes to activity_log under the seo.
// prefix in the future. Component name kept as
// RecentDirectoryActivity so existing imports don't churn; scope
// is the broader SEO feed.

interface ActivityRow {
  id: string;
  user_id: string | null;
  type: string;
  target_id: string | null;
  target_label: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface ActivityUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

// Which activity_log rows belong on this feed. Originally just
// directory edits; now broadened to every seo.* event so the
// Activities tab is the single feed for the whole SEO area —
// directories, backlinks, speed runs, outing-photo loads, and
// anything else that writes to activity_log under that prefix.
function isFeedEvent(type: string | null | undefined): boolean {
  if (!type) return false;
  return type.startsWith('seo.');
}

function activityTimeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function describeDirectoryActivity(row: ActivityRow): { verb: string; accent: string } {
  switch (row.type) {
    case 'seo.directory_status_changed': {
      const meta = row.metadata as { from?: string; to?: string } | null;
      const to = meta?.to ?? '';
      // New canonical statuses + legacy keys (kept so historic
      // activity rows from before the enum rename still render
      // sensibly).
      const label =
        to === 'claim_in_process' ? 'started Claim in Process'
        : to === 'claimed' ? 'marked as Claimed'
        : to === 'submitted' ? 'marked as Submitted'
        : to === 'pending' ? 'marked as Pending'
        : to === 'live' ? 'marked as Live'
        : to === 'paid_list' ? 'marked as Paid List'
        : to === 'no_option' ? 'marked as No option'
        : to === 'requires_official_docs' ? 'flagged Requires official Docs'
        : to === 'skip' ? 'marked as Skip'
        : to === 'todo' ? 'reset to To do'
        // legacy
        : to === 'listed' ? 'marked as Listed'
        : to === 'pending_review' ? 'marked as Pending'
        : to === 'need_credentials' ? 'flagged Need credentials'
        : 'updated status of';
      const accent =
        to === 'claim_in_process' ? 'text-blue-700'
        : to === 'claimed' ? 'text-indigo-700'
        : to === 'submitted' ? 'text-amber-700'
        : to === 'pending' ? 'text-yellow-700'
        : to === 'live' ? 'text-emerald-700'
        : to === 'paid_list' ? 'text-violet-700'
        : to === 'no_option' ? 'text-slate-600'
        : to === 'requires_official_docs' ? 'text-rose-700'
        : to === 'skip' ? 'text-foreground/55'
        // legacy
        : to === 'listed' ? 'text-emerald-700'
        : to === 'pending_review' ? 'text-yellow-700'
        : to === 'need_credentials' ? 'text-rose-700'
        : 'text-foreground/70';
      return { verb: label, accent };
    }
    case 'seo.directory_link_added':
      return { verb: 'added a live link for', accent: 'text-emerald-700' };
    case 'seo.directory_link_removed':
      return { verb: 'removed the live link for', accent: 'text-rose-700' };
    case 'seo.directory_chat_message':
      return { verb: 'commented on', accent: 'text-primary' };
    case 'seo.directory_nap_added':
      return { verb: 'added NAP for', accent: 'text-emerald-700' };
    case 'seo.directory_nap_updated':
      return { verb: 'updated NAP for', accent: 'text-amber-700' };
    case 'seo.directory_nap_cleared':
      return { verb: 'cleared NAP for', accent: 'text-rose-700' };
    case 'seo.backlink_added':
      return { verb: 'added a backlink for', accent: 'text-emerald-700' };
    case 'seo.backlink_removed':
      return { verb: 'removed a backlink for', accent: 'text-rose-700' };
    case 'seo.backlink_chat_message':
      return { verb: 'commented on a backlink for', accent: 'text-primary' };
    case 'seo.backlink_chat_message_deleted':
      return { verb: 'deleted a backlink comment for', accent: 'text-rose-700' };
    case 'seo.speed_run_completed':
      return { verb: 'ran a Speed audit on', accent: 'text-blue-700' };
    case 'seo.outing_photos_loaded':
      return { verb: 'loaded outing photos —', accent: 'text-emerald-700' };
    default:
      return { verb: row.type.replace(/[._]/g, ' '), accent: 'text-foreground/70' };
  }
}

export default function RecentDirectoryActivity() {
  const { session } = useAuth();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [usersById, setUsersById] = useState<Record<string, ActivityUser>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    async function load() {
      const data = await db({
        action: 'select',
        table: 'activity_log',
        select: 'id, user_id, type, target_id, target_label, metadata, created_at',
        order: { column: 'created_at', ascending: false },
      }).catch(() => null);
      if (cancelled || !Array.isArray(data)) {
        setLoading(false);
        return;
      }
      const directoryRows = (data as ActivityRow[])
        .filter((r) => isFeedEvent(r.type))
        .slice(0, 25);
      setRows(directoryRows);
      setLoading(false);

      const ids = Array.from(new Set(directoryRows.map((r) => r.user_id).filter((v): v is string => !!v)));
      if (ids.length > 0) {
        const usrs = await db({
          action: 'select',
          table: 'users',
          select: 'id, full_name, avatar_url, email',
        }).catch(() => null);
        if (!cancelled && Array.isArray(usrs)) {
          const map: Record<string, ActivityUser> = {};
          for (const u of usrs as ActivityUser[]) map[u.id] = u;
          setUsersById(map);
        }
      }
    }
    load();

    const channel = supabase
      .channel(`directory-recent-activity-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, (payload) => {
        const row = payload.new as ActivityRow;
        if (!isFeedEvent(row.type)) return;
        setRows((prev) => [row, ...prev].slice(0, 25));
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session]);

  if (loading && rows.length === 0) return null;

  return (
    <section className="mb-5 rounded-xl border border-black/10 bg-white">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 border-b border-black/10 hover:bg-warm-bg/40 transition-colors"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/55">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Recent activity
          </span>
          <span className="text-[11px] text-foreground/45">
            {rows.length === 0 ? 'No edits yet' : `last ${rows.length} update${rows.length === 1 ? '' : 's'} · synced live`}
          </span>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-foreground/40 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {/* Tall feed by default — fills most of the viewport on
          desktop so admins can scan a week of activity without
          scrolling inside a small window. Caps at ~75vh so it
          never pushes the rest of the page off-screen. */}
      {!collapsed && (
        <div className="max-h-[75vh] overflow-y-auto">
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-xs text-foreground/45 text-center">
              No SEO activity yet — directory edits, backlink adds, Speed runs, and other SEO actions will appear here as they happen.
            </p>
          ) : (
            <ol className="divide-y divide-black/5">
              {rows.map((row) => {
                const u = row.user_id ? usersById[row.user_id] : null;
                const { verb, accent } = describeDirectoryActivity(row);
                const initial = (u?.full_name || u?.email || '?').charAt(0).toUpperCase();
                return (
                  <li key={row.id} className="flex items-start gap-2.5 px-4 py-2">
                    {u?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-black/5 mt-0.5" />
                    ) : (
                      <span className="w-6 h-6 rounded-full shrink-0 bg-primary text-white flex items-center justify-center text-[10px] font-bold mt-0.5">
                        {initial}
                      </span>
                    )}
                    {/* break-words + no truncate so long target_label
                        values wrap to a second line on mobile instead
                        of getting cut off mid-phrase. leading-snug
                        keeps the wrap tight so the row doesn't grow
                        too tall. */}
                    <p className="text-xs text-foreground/85 flex-1 min-w-0 break-words leading-snug">
                      <span className="font-semibold">{u?.full_name || u?.email || 'Someone'}</span>
                      <span className={`ml-1 ${accent}`}>{verb}</span>
                      {row.target_label && (
                        <span className="ml-1 text-foreground/80">&quot;{row.target_label}&quot;</span>
                      )}
                    </p>
                    <span className="shrink-0 text-[10px] text-foreground/40 whitespace-nowrap mt-0.5">
                      {activityTimeAgo(row.created_at)}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
