'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

interface ActivityRow {
  id: string;
  user_id: string | null;
  type: string;
  target_kind: string | null;
  target_id: string | null;
  target_label: string | null;
  target_path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface UserLite {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Same threshold the Home orbit uses (HomeOnlineOrbit.tsx). >10
// activity_log rows in the current Phoenix day → user is "on fire".
const ON_FIRE_THRESHOLD = 10;

// Today's start in Phoenix time, returned as an ISO string. Used to
// gate which rows count toward on-fire. The site is hosted in
// America/Phoenix and the Home orbit uses the same boundary.
function startOfPhoenixDayIso(): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Phoenix',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value])) as Record<string, string>;
  // Phoenix is UTC-7 year-round (no DST). Reconstruct midnight Phoenix
  // as UTC by subtracting 7 hours.
  const y = parts.year, m = parts.month, d = parts.day;
  return new Date(`${y}-${m}-${d}T00:00:00-07:00`).toISOString();
}

function describe(row: ActivityRow): { verb: string; accent: string } {
  switch (row.type) {
    case 'jd.signed':
      return { verb: 'signed job description', accent: 'text-emerald-600' };
    case 'jd.sent_for_signature':
      return { verb: 'sent for signature', accent: 'text-primary' };
    case 'jd.updated':
      return { verb: 'updated job description', accent: 'text-foreground' };
    case 'jd.version_saved':
      return { verb: 'saved a new version of', accent: 'text-foreground' };
    case 'jd.created':
      return { verb: 'created job description', accent: 'text-primary' };
    case 'jd.renamed':
      return { verb: 'renamed job description', accent: 'text-foreground' };
    case 'doc.uploaded':
      return { verb: 'uploaded document', accent: 'text-primary' };
    case 'calendar_event.created':
      return { verb: 'created calendar event', accent: 'text-foreground' };
    case 'calendar_event.updated':
      return { verb: 'updated calendar event', accent: 'text-foreground' };
    case 'calendar_event.deleted':
      return { verb: 'deleted calendar event', accent: 'text-red-600' };
    case 'user.role_changed':
      return { verb: 'changed admin role for', accent: 'text-foreground' };
    case 'facilities.created':
      return { verb: 'reported facilities issue', accent: 'text-primary' };
    case 'facilities.chat_message':
      return { verb: 'commented on facilities issue', accent: 'text-foreground' };
    case 'contact.created':
      return { verb: 'added new contact', accent: 'text-emerald-600' };
    case 'contact.logged': {
      const method = typeof row.metadata?.method === 'string' ? row.metadata.method as string : null;
      const verb = method ? `logged ${method.toLowerCase()} with` : 'logged a touchpoint with';
      return { verb, accent: 'text-primary' };
    }
    case 'user.signed_in':
      return { verb: 'signed in', accent: 'text-emerald-600' };
    case 'social.posted': {
      const platforms = Array.isArray(row.metadata?.platforms) ? (row.metadata.platforms as string[]) : [];
      const where = platforms.length > 0 ? ` to ${platforms.join(', ')}` : '';
      return { verb: `posted${where}`, accent: 'text-primary' };
    }
    case 'social.scheduled': {
      const platforms = Array.isArray(row.metadata?.platforms) ? (row.metadata.platforms as string[]) : [];
      const where = platforms.length > 0 ? ` to ${platforms.join(', ')}` : '';
      return { verb: `scheduled a post${where}`, accent: 'text-foreground' };
    }
    default:
      return { verb: row.type.replace(/[._]/g, ' '), accent: 'text-foreground' };
  }
}

export default function ActivityContent() {
  const { session, isAdmin } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!session?.access_token) return;
    if (!isAdmin) {
      router.replace('/app');
    }
  }, [session, isAdmin, router]);

  // Cursor for incremental polls. After the initial full pull we
  // only ask Supabase for rows created since the newest row we
  // already hold — usually 0-2 rows per tick instead of the whole
  // table.
  const newestSeenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;

    let cancelled = false;
    async function loadUsers() {
      const data = await db({
        action: 'select',
        table: 'users',
        select: 'id, full_name, avatar_url, email',
      }).catch(() => []);
      if (cancelled || !Array.isArray(data)) return;
      setUsers(data as UserLite[]);
    }

    // Initial load: pull the most recent 500 rows server-side
    // (used to pull the entire table then slice client-side, which
    // grew unbounded with activity_log).
    async function loadActivityInitial() {
      const { data } = await supabase
        .from('activity_log')
        .select('id, user_id, type, target_kind, target_id, target_label, target_path, metadata, created_at')
        .neq('type', 'user.signed_in')
        .order('created_at', { ascending: false })
        .limit(500);
      if (cancelled || !data) return;
      const rows = data as ActivityRow[];
      setRows(rows);
      if (rows[0]?.created_at) newestSeenRef.current = rows[0].created_at;
      setLoading(false);
    }

    // Incremental tick: only ask for rows newer than what we have,
    // and pause entirely when the tab isn't visible.
    async function loadActivityIncremental() {
      if (typeof document !== 'undefined' && document.hidden) return;
      const since = newestSeenRef.current;
      if (!since) return loadActivityInitial();
      const { data } = await supabase
        .from('activity_log')
        .select('id, user_id, type, target_kind, target_id, target_label, target_path, metadata, created_at')
        .neq('type', 'user.signed_in')
        .gt('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200);
      if (cancelled || !data || data.length === 0) return;
      const fresh = data as ActivityRow[];
      newestSeenRef.current = fresh[0].created_at;
      setRows((prev) => {
        // Keep the most recent 500 across new + existing.
        const merged = [...fresh, ...prev];
        const seen = new Set<string>();
        const deduped: ActivityRow[] = [];
        for (const r of merged) {
          if (seen.has(r.id)) continue;
          seen.add(r.id);
          deduped.push(r);
          if (deduped.length >= 500) break;
        }
        return deduped;
      });
    }

    loadUsers();
    loadActivityInitial();
    // 15s instead of 5s — incremental polls are cheap but a 5s
    // cadence is overkill for a feed that humans read.
    const interval = setInterval(loadActivityIncremental, 15 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session]);

  const usersById = useMemo(() => {
    const m = new Map<string, UserLite>();
    for (const u of users) m.set(u.id, u);
    return m;
  }, [users]);

  // Per-user count of TODAY's activity_log rows. Drives the on-fire
  // 🔥 badge in the feed. Recomputed every time the rows poll picks
  // up new activity so the badge appears the moment a teammate
  // crosses the threshold.
  const actionsToday = useMemo(() => {
    const startIso = startOfPhoenixDayIso();
    const counts: Record<string, number> = {};
    for (const r of rows) {
      if (!r.user_id) continue;
      if (r.created_at < startIso) continue;
      counts[r.user_id] = (counts[r.user_id] ?? 0) + 1;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const u = r.user_id ? usersById.get(r.user_id) : null;
      const name = (u?.full_name || u?.email || '').toLowerCase();
      return (
        name.includes(q) ||
        r.type.toLowerCase().includes(q) ||
        (r.target_label || '').toLowerCase().includes(q)
      );
    });
  }, [rows, filter, usersById]);

  return (
    <div className="flex flex-col">
      <div className="px-4 sm:px-6 lg:px-10 pt-6 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activity</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Live feed of every actionable event across the platform.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by person, type, or target…"
            className="text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none bg-white flex-1 sm:w-72 sm:flex-none"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-10 pb-10">
        {loading && rows.length === 0 ? (
          <div className="text-sm text-foreground/50 py-10 text-center">Loading activity…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-foreground/50 py-10 text-center">No activity yet.</div>
        ) : (
          <ol className="flex flex-col">
            {filtered.map((row) => {
              const u = row.user_id ? usersById.get(row.user_id) : null;
              const { verb, accent } = describe(row);
              const clickable = !!row.target_path;
              const Wrapper: 'button' | 'div' = clickable ? 'button' : 'div';
              const userActions = row.user_id ? actionsToday[row.user_id] ?? 0 : 0;
              const onFire = userActions > ON_FIRE_THRESHOLD;
              return (
                <Wrapper
                  key={row.id}
                  onClick={clickable ? () => router.push(row.target_path!) : undefined}
                  className={`w-full text-left flex items-center gap-3 px-3 py-3 border-b border-gray-100 transition-colors ${clickable ? 'hover:bg-warm-bg/50 cursor-pointer' : ''}`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <div className="relative shrink-0">
                    {u?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.avatar_url}
                        alt=""
                        className={`w-8 h-8 rounded-full object-cover ring-1 ${onFire ? 'ring-2 ring-amber-400 shadow-[0_0_10px_rgba(251,146,60,0.55)]' : 'ring-gray-100'}`}
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold ${onFire ? 'ring-2 ring-amber-400 shadow-[0_0_10px_rgba(251,146,60,0.55)]' : ''}`}>
                        {(u?.full_name || u?.email || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    {onFire && (
                      <span
                        aria-label={`On a streak — ${userActions} actions today`}
                        title={`On a streak — ${userActions} actions today`}
                        className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white text-[10px] leading-none shadow"
                      >
                        🔥
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      <span className="font-semibold">{u?.full_name || u?.email || 'Someone'}</span>
                      {onFire && (
                        <span
                          className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider align-middle"
                          title={`${userActions} actions today`}
                        >
                          🔥 {userActions}
                        </span>
                      )}
                      <span className={`ml-1 font-medium ${accent}`}>{verb}</span>
                      {row.target_label && (
                        <span className="ml-1 text-foreground/80">&quot;{row.target_label}&quot;</span>
                      )}
                    </p>
                    {row.target_path && (
                      <p className="text-[11px] text-foreground/40 truncate">{row.target_path}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-foreground/45 whitespace-nowrap">{timeAgo(row.created_at)}</span>
                </Wrapper>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
