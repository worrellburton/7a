'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

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
    case 'user.signed_in':
      return { verb: 'signed in', accent: 'text-emerald-600' };
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

    async function loadActivity() {
      const data = await db({
        action: 'select',
        table: 'activity_log',
        order: { column: 'created_at', ascending: false },
      }).catch(() => []);
      if (cancelled || !Array.isArray(data)) return;
      setRows((data as ActivityRow[]).slice(0, 500));
      setLoading(false);
    }

    loadUsers();
    loadActivity();
    const interval = setInterval(loadActivity, 5 * 1000);
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
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-4 sm:px-6 lg:px-10 pt-6 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
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

      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-10 pb-10">
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
              return (
                <Wrapper
                  key={row.id}
                  onClick={clickable ? () => router.push(row.target_path!) : undefined}
                  className={`w-full text-left flex items-center gap-3 px-3 py-3 border-b border-gray-100 transition-colors ${clickable ? 'hover:bg-warm-bg/50 cursor-pointer' : ''}`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {u?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-gray-100" />
                  ) : (
                    <div className="w-8 h-8 rounded-full shrink-0 bg-primary text-white flex items-center justify-center text-xs font-bold">
                      {(u?.full_name || u?.email || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      <span className="font-semibold">{u?.full_name || u?.email || 'Someone'}</span>
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
