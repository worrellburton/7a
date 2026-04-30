'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';

// Live feed of seo.directory_* events from public.activity_log.
// Originally rendered on /app/seo/directories above the table; now
// it lives on the Activities page (/app/seo/actions) so directory
// edits show up alongside other SEO activity.

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
      const label =
        to === 'listed' ? 'marked as Listed'
        : to === 'pending' ? 'marked as Submitted'
        : to === 'skip' ? 'marked as Skip'
        : to === 'need_credentials' ? 'flagged Need credentials'
        : to === 'claim_in_process' ? 'started Claim in process'
        : to === 'todo' ? 'reset to To do'
        : 'updated status of';
      const accent =
        to === 'listed' ? 'text-emerald-700'
        : to === 'pending' ? 'text-amber-700'
        : to === 'need_credentials' ? 'text-rose-700'
        : to === 'claim_in_process' ? 'text-blue-700'
        : to === 'skip' ? 'text-foreground/55'
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
        .filter((r) => r.type.startsWith('seo.directory_'))
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
        if (!row.type?.startsWith('seo.directory_')) return;
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
      {!collapsed && (
        <div className="max-h-72 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-xs text-foreground/45 text-center">
              No directory edits yet — status changes and live links you save will appear here.
            </p>
          ) : (
            <ol className="divide-y divide-black/5">
              {rows.map((row) => {
                const u = row.user_id ? usersById[row.user_id] : null;
                const { verb, accent } = describeDirectoryActivity(row);
                const initial = (u?.full_name || u?.email || '?').charAt(0).toUpperCase();
                return (
                  <li key={row.id} className="flex items-center gap-2.5 px-4 py-2">
                    {u?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-black/5" />
                    ) : (
                      <span className="w-6 h-6 rounded-full shrink-0 bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                        {initial}
                      </span>
                    )}
                    <p className="text-xs text-foreground/85 flex-1 min-w-0 truncate">
                      <span className="font-semibold">{u?.full_name || u?.email || 'Someone'}</span>
                      <span className={`ml-1 ${accent}`}>{verb}</span>
                      {row.target_label && (
                        <span className="ml-1 text-foreground/80">&quot;{row.target_label}&quot;</span>
                      )}
                    </p>
                    <span className="shrink-0 text-[10px] text-foreground/40 whitespace-nowrap">
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
