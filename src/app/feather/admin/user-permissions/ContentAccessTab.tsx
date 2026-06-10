'use client';

import { useCallback, useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/AuthProvider';
import { toAvatarThumb } from '@/lib/avatarThumb';

// Content access tab on /app/admin/user-permissions.
//
// Single-purpose surface: for every teammate, one toggle that
// grants/revokes access to /app/content. Toggling ON does two
// things at once:
//   1. Writes user_page_permissions (path='/feather/content',
//      can_view=true). This makes the page show up in the sidebar
//      for the user (PagePermissions provider reads from here).
//   2. The /api/content/* routes are gated on requireSuperAdmin
//      in /lib/content-server, which was updated alongside this
//      tab to also accept user_page_permissions.can_view=true on
//      /app/content. So the same toggle that puts the page in
//      the sidebar also lets the user create, edit, and publish
//      blogs through the AI pipeline.
//
// Super admins always have access regardless of the toggle —
// disabling them through this UI is a no-op on the server side.

const CONTENT_PATH = '/feather/content';

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
  is_admin: boolean;
}

export default function ContentAccessTab() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // All non-denied users — same filter the other tabs use.
      const usersRes = await db({
        action: 'select',
        table: 'users',
        select: 'id, full_name, email, avatar_url, is_super_admin, is_admin',
        match: { status: 'active' },
      });
      const rows = Array.isArray(usersRes) ? usersRes as TeamMember[] : [];
      // Sort: super admins first, then admins, then everyone else,
      // each group alphabetical so the layout is predictable.
      rows.sort((a, b) => {
        const score = (m: TeamMember) => (m.is_super_admin ? 0 : m.is_admin ? 1 : 2);
        const aScore = score(a);
        const bScore = score(b);
        if (aScore !== bScore) return aScore - bScore;
        return (a.full_name ?? a.email ?? '').localeCompare(b.full_name ?? b.email ?? '');
      });
      setMembers(rows);

      // Per-user content overrides — only the rows for /app/content
      // matter to this tab.
      const permsRes = await db({
        action: 'select',
        table: 'user_page_permissions',
        select: 'user_id, can_view',
        match: { path: CONTENT_PATH },
      });
      const perms = Array.isArray(permsRes) ? permsRes as Array<{ user_id: string; can_view: boolean }> : [];
      setGranted(new Set(perms.filter((p) => p.can_view).map((p) => p.user_id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function toggle(memberId: string, next: boolean) {
    setSavingId(memberId);
    setError(null);
    try {
      if (next) {
        const res = await db({
          action: 'upsert',
          table: 'user_page_permissions',
          data: [{ user_id: memberId, path: CONTENT_PATH, can_view: true, updated_by: user?.id ?? null }],
          onConflict: 'user_id,path',
        });
        if (!res || (typeof res === 'object' && 'error' in res)) throw new Error('Save failed');
        setGranted((cur) => {
          const nx = new Set(cur);
          nx.add(memberId);
          return nx;
        });
      } else {
        const res = await db({
          action: 'delete',
          table: 'user_page_permissions',
          match: { user_id: memberId, path: CONTENT_PATH },
        });
        if (!res || (typeof res === 'object' && 'error' in res)) throw new Error('Save failed');
        setGranted((cur) => {
          const nx = new Set(cur);
          nx.delete(memberId);
          return nx;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingId(null);
    }
  }

  const filtered = members.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (m.full_name ?? '').toLowerCase().includes(q) || (m.email ?? '').toLowerCase().includes(q);
  });

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-foreground/45">Content page access</p>
          <p className="mt-1 text-[13px] text-foreground/75">
            Toggle <strong>/app/content</strong> on for a teammate to let them open the page in the sidebar AND create,
            edit, and publish blog posts through the AI pipeline. Super admins always have access.
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="px-2.5 py-1.5 rounded-md border border-black/10 bg-white text-[12.5px] w-56 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </header>

      {error && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-black/10 bg-white overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-[12.5px] text-foreground/55 italic text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-[12.5px] text-foreground/55 italic text-center">No teammates match.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {filtered.map((m) => {
              const has = m.is_super_admin || granted.has(m.id);
              const saving = savingId === m.id;
              return (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-warm-bg/40">
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={toAvatarThumb(m.avatar_url, 200) ?? m.avatar_url} alt="" className="shrink-0 w-9 h-9 rounded-full object-cover bg-warm-bg" />
                  ) : (
                    <div className="shrink-0 w-9 h-9 rounded-full bg-warm-bg flex items-center justify-center text-[11px] font-bold text-foreground/55">
                      {(m.full_name ?? m.email ?? '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-foreground truncate">{m.full_name ?? '—'}</p>
                      {m.is_super_admin && (
                        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200">
                          Super admin
                        </span>
                      )}
                      {!m.is_super_admin && m.is_admin && (
                        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-foreground/55 truncate">{m.email ?? '—'}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={has}
                    disabled={saving || m.is_super_admin}
                    onClick={() => void toggle(m.id, !granted.has(m.id))}
                    title={m.is_super_admin
                      ? 'Super admins always have content access.'
                      : has
                        ? 'Click to revoke content access.'
                        : 'Click to grant content access.'}
                    className={`shrink-0 relative inline-flex items-center h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                      has ? 'bg-emerald-500' : 'bg-foreground/20'
                    }`}
                  >
                    <span className="sr-only">{has ? 'Has access' : 'No access'}</span>
                    <span
                      className={`absolute top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        has ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-3 text-[11px] text-foreground/45">
        Granting access writes a single <code className="font-mono">user_page_permissions</code> row for the user. The
        <code className="font-mono">/api/content/*</code> routes accept either super-admin OR this row, so the toggle
        unlocks the page + the post + publish endpoints at once.
      </p>
    </div>
  );
}
