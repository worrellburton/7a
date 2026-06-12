'use client';

// Alumni Admin — one hub for every alumni-related permission surface.
// The general admin pages (Incoming Users, Pages, User Permissions)
// each carry an alumni-shaped corner; this page pulls those corners
// together so managing the alumni side of the platform is one stop:
//
//   1. Incoming sign-ins   — approve external sign-ins as alumni (or
//                            decline them) without leaving the page.
//   2. Alumni users        — roster snapshot: who's in, status,
//                            check-in streaks; rows link to profiles.
//   3. Alumni-only pages   — which pages only alumni (and super
//                            admins) can see; toggle directly.
//   4. Alumni admins       — who holds is_alumni_admin; super admins
//                            grant/revoke here.
//
// Reuses the SAME APIs and context the dedicated pages use
// (/api/incoming-users, /api/alumni-roster, usePagePermissions,
// users.is_alumni_admin) so there's one source of truth — this is a
// dashboard over the existing permission structure, not a fork of it.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';
import { usePagePermissions } from '@/lib/PagePermissions';
import { db } from '@/lib/db';
import { toAvatarThumb } from '@/lib/avatarThumb';

// ─── Shared bits ────────────────────────────────────────────────

function fmtAgo(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  on_hold: 'bg-amber-50 text-amber-800 border-amber-200',
  denied: 'bg-rose-50 text-rose-700 border-rose-200',
};

function Avatar({ url, name, size = 7 }: { url: string | null; name: string | null; size?: 7 | 8 }) {
  const cls = size === 8 ? 'w-8 h-8' : 'w-7 h-7';
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={toAvatarThumb(url, 80) ?? url}
        alt=""
        referrerPolicy="no-referrer"
        className={`${cls} rounded-full object-cover bg-warm-bg ring-1 ring-black/5 shrink-0`}
      />
    );
  }
  return (
    <span aria-hidden className={`${cls} inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold shrink-0`}>
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

function Panel({ title, hint, action, children }: {
  title: string;
  hint: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white flex flex-col min-h-0">
      <header className="px-4 py-3 border-b border-black/5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">{title}</p>
          <p className="mt-0.5 text-[11.5px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{hint}</p>
        </div>
        {action}
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  );
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60 whitespace-nowrap"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {children}
    </Link>
  );
}

// ─── Types mirrored from the source pages ──────────────────────

interface IncomingUser {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  status: 'active' | 'on_hold' | 'denied' | null;
  user_kind: 'staff' | 'guest' | 'alumni';
  created_at: string;
  last_sign_in: string | null;
}

interface IncomingPayload {
  pendingStaff: IncomingUser[];
  externalNew: IncomingUser[];
  guests: IncomingUser[];
  alumni: IncomingUser[];
}

interface RosterRow {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  status: 'active' | 'on_hold' | 'denied' | null;
  checkInStreak: number;
  lastSeenAt: string | null;
  city: string | null;
  state: string | null;
}

interface AdminUserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_alumni_admin: boolean;
  is_super_admin: boolean;
  user_kind: 'staff' | 'guest' | 'alumni';
}

// ─── Page ───────────────────────────────────────────────────────

export default function AlumniAdminContent() {
  const { user, session, isAdmin, isSuperAdmin, isAlumniAdmin } = useAuth();
  const canView = isAdmin || isSuperAdmin || isAlumniAdmin;
  // Granting roles and flipping page flags stays with real admins;
  // alumni admins get the same picture read-only.
  const canEdit = isAdmin || isSuperAdmin;

  if (!user || !canView) {
    return (
      <div className="p-6 sm:p-10 max-w-[1100px] mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
        <div className="rounded-2xl border border-black/10 bg-white px-6 py-12 text-center text-sm text-foreground/55">
          This page is for admins and alumni admins.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1240px] mx-auto pb-[max(1rem,env(safe-area-inset-bottom))]" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-5 sm:mb-7">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">
          <Link href="/feather/admin" className="hover:text-foreground/70">Admin</Link>
          <span aria-hidden className="mx-1.5 text-foreground/25">/</span>
          Alumni
        </p>
        <h1 className="mt-1 text-lg font-semibold text-foreground tracking-tight">Alumni Admin</h1>
        <p className="text-sm text-foreground/55 mt-0.5">
          Everything alumni in one place: who gets in, what they can see, and who manages them.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IncomingAlumniPanel session={session} canEdit={canEdit} />
        <AlumniRosterPanel session={session} />
        <AlumniPagesPanel canEdit={canEdit} />
        <AlumniAdminsPanel canEdit={canEdit} />
      </div>
    </div>
  );
}

// ─── 1. Incoming sign-ins → alumni ─────────────────────────────

function IncomingAlumniPanel({ session, canEdit }: { session: ReturnType<typeof useAuth>['session']; canEdit: boolean }) {
  const [data, setData] = useState<IncomingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    const res = await fetch('/api/incoming-users', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    });
    if (res.status === 401 || res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    if (res.ok) setData((await res.json()) as IncomingPayload);
    setLoading(false);
  }, [session?.access_token]);

  useEffect(() => { void load(); }, [load]);

  async function classify(target: IncomingUser, kind: 'alumni' | 'guest', status: 'active' | 'denied') {
    if (!session?.access_token || busyId) return;
    setBusyId(target.id);
    try {
      const res = await fetch(`/api/incoming-users/${target.id}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ kind, status }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(`Couldn't update: ${(json as { error?: string }).error ?? res.status}`);
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const incoming = data?.externalNew ?? [];

  return (
    <Panel
      title="Incoming sign-ins"
      hint="External sign-ins waiting for triage — approve them straight into the alumni portal."
      action={<PanelLink href="/feather/admin/incoming-users">Open Incoming Users →</PanelLink>}
    >
      {loading ? (
        <p className="px-4 py-8 text-[12.5px] text-foreground/50 italic text-center">Loading…</p>
      ) : forbidden ? (
        <p className="px-4 py-8 text-[12.5px] text-foreground/50 text-center">
          Sign-in triage needs Super Admin — your view here is read-only.
        </p>
      ) : incoming.length === 0 ? (
        <p className="px-4 py-8 text-[12.5px] text-foreground/50 text-center">
          No external sign-ins waiting. New ones land here automatically.
        </p>
      ) : (
        <ul className="divide-y divide-black/5">
          {incoming.map((u) => (
            <li key={u.id} className="px-4 py-2.5 flex items-center gap-3">
              <Avatar url={u.avatar_url} name={u.full_name} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">{u.full_name || u.email || 'Unknown'}</p>
                <p className="text-[11px] text-foreground/50 truncate">{u.email} · signed in {fmtAgo(u.last_sign_in ?? u.created_at)}</p>
              </div>
              {canEdit && (
                <div className="shrink-0 flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busyId === u.id}
                    onClick={() => void classify(u, 'alumni', 'active')}
                    className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    Approve as alumnus
                  </button>
                  <button
                    type="button"
                    disabled={busyId === u.id}
                    onClick={() => void classify(u, 'guest', 'denied')}
                    className="px-2.5 py-1 rounded-md border border-rose-200 bg-white text-rose-700 text-[11px] font-semibold hover:bg-rose-50 disabled:opacity-50 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ─── 2. Alumni users snapshot ───────────────────────────────────

function AlumniRosterPanel({ session }: { session: ReturnType<typeof useAuth>['session'] }) {
  const [rows, setRows] = useState<RosterRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch('/api/alumni-roster', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (cancelled) return;
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const json = (await res.json()) as { rows?: RosterRow[] };
      setRows(json.rows ?? []);
    })();
    return () => { cancelled = true; };
  }, [session?.access_token]);

  // Most-recently-seen first so the panel reads as "who's around",
  // not a static alphabetical wall.
  const sorted = useMemo(() => {
    return (rows ?? []).slice().sort((a, b) => {
      const at = a.lastSeenAt ? Date.parse(a.lastSeenAt) : 0;
      const bt = b.lastSeenAt ? Date.parse(b.lastSeenAt) : 0;
      return bt - at;
    });
  }, [rows]);

  return (
    <Panel
      title="Alumni users"
      hint={rows ? `${rows.length} ${rows.length === 1 ? 'alumnus' : 'alumni'} on the platform, most recently seen first.` : 'Everyone with user_kind = alumni.'}
      action={<PanelLink href="/feather/alumni-roster">Open full roster →</PanelLink>}
    >
      {error ? (
        <p className="px-4 py-8 text-[12.5px] text-rose-600 text-center">Couldn&apos;t load the roster: {error}</p>
      ) : rows === null ? (
        <p className="px-4 py-8 text-[12.5px] text-foreground/50 italic text-center">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-8 text-[12.5px] text-foreground/50 text-center">No alumni yet — approve incoming sign-ins to add them.</p>
      ) : (
        <ul className="divide-y divide-black/5 max-h-[320px] overflow-y-auto overscroll-contain">
          {sorted.map((r) => (
            <li key={r.id}>
              <Link href={`/feather/alumni/u/${r.id}`} className="px-4 py-2.5 flex items-center gap-3 hover:bg-warm-bg/40 transition-colors">
                <Avatar url={r.avatarUrl} name={r.fullName} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">{r.fullName || 'Unnamed'}</p>
                  <p className="text-[11px] text-foreground/50 truncate">
                    {[r.city, r.state].filter(Boolean).join(', ') || '—'}
                    {r.checkInStreak > 0 && <span> · 🔥 {r.checkInStreak}-day streak</span>}
                  </p>
                </div>
                {r.status && (
                  <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${STATUS_TONE[r.status] ?? ''}`}>
                    {r.status === 'on_hold' ? 'On hold' : r.status}
                  </span>
                )}
                <span className="shrink-0 text-[11px] text-foreground/40 w-16 text-right">{fmtAgo(r.lastSeenAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ─── 3. Alumni-only pages ───────────────────────────────────────

function AlumniPagesPanel({ canEdit }: { canEdit: boolean }) {
  const { pages, setPageAlumniOnly, loading } = usePagePermissions();
  const [showAll, setShowAll] = useState(false);

  const alumniPages = useMemo(
    () => pages.filter((p) => p.alumniOnly === true).sort((a, b) => a.label.localeCompare(b.label)),
    [pages],
  );
  const staffPages = useMemo(
    () => pages.filter((p) => p.alumniOnly !== true).sort((a, b) => a.label.localeCompare(b.label)),
    [pages],
  );

  function Row({ path, label, on }: { path: string; label: string; on: boolean }) {
    return (
      <li className="px-4 py-2 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground truncate">{label}</p>
          <p className="text-[10.5px] text-foreground/40 truncate font-mono">{path}</p>
        </div>
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setPageAlumniOnly(path, !on)}
          aria-pressed={on}
          aria-label={`${label}: alumni only ${on ? 'on' : 'off'}`}
          className={`relative shrink-0 w-9 h-5 rounded-full transition-colors disabled:opacity-40 ${on ? 'bg-violet-500' : 'bg-foreground/15'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      </li>
    );
  }

  return (
    <Panel
      title="Alumni-only pages"
      hint="Pages with this flag are visible only to alumni and super admins — staff never see them."
      action={<PanelLink href="/feather/admin/pages">Open Pages editor →</PanelLink>}
    >
      {loading ? (
        <p className="px-4 py-8 text-[12.5px] text-foreground/50 italic text-center">Loading…</p>
      ) : (
        <div className="max-h-[320px] overflow-y-auto overscroll-contain">
          <ul className="divide-y divide-black/5">
            {alumniPages.length === 0 ? (
              <li className="px-4 py-6 text-[12.5px] text-foreground/50 text-center">No alumni-only pages yet.</li>
            ) : (
              alumniPages.map((p) => <Row key={p.path} path={p.path} label={p.label} on />)
            )}
          </ul>
          {canEdit && (
            <div className="border-t border-black/5">
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="w-full px-4 py-2.5 text-left text-[11.5px] font-semibold text-foreground/55 hover:bg-warm-bg/40 transition-colors"
                aria-expanded={showAll}
              >
                {showAll ? '▾' : '▸'} Make another page alumni-only ({staffPages.length})
              </button>
              {showAll && (
                <ul className="divide-y divide-black/5 border-t border-black/5">
                  {staffPages.map((p) => <Row key={p.path} path={p.path} label={p.label} on={false} />)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

// ─── 4. Alumni admins ───────────────────────────────────────────

function AlumniAdminsPanel({ canEdit }: { canEdit: boolean }) {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    // db() select returns the rows array directly (or {error}).
    const res = await db({
      action: 'select',
      table: 'users',
      select: 'id, full_name, email, avatar_url, is_alumni_admin, is_super_admin, user_kind',
    });
    setUsers(Array.isArray(res) ? (res as unknown as AdminUserRow[]) : []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const admins = useMemo(
    () => (users ?? []).filter((u) => u.is_alumni_admin).sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '')),
    [users],
  );
  // Grant candidates: search across everyone who isn't already an
  // alumni admin. Requires 2+ chars so the panel doesn't render the
  // whole org by default.
  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return (users ?? [])
      .filter((u) => !u.is_alumni_admin)
      .filter((u) => (u.full_name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [users, search]);

  async function setAlumniAdmin(target: AdminUserRow, next: boolean) {
    if (!canEdit || busyId) return;
    setBusyId(target.id);
    // Same lockstep semantics as the user-permissions role select:
    // alumni admin and super admin are mutually exclusive role bits.
    const patch: Record<string, boolean> = { is_alumni_admin: next };
    if (next && target.is_super_admin) patch.is_super_admin = false;
    setUsers((prev) => (prev ?? []).map((u) => (u.id === target.id ? { ...u, ...patch } as AdminUserRow : u)));
    const res = await db({ action: 'update', table: 'users', data: patch, match: { id: target.id } });
    if (res?.error) {
      alert(`Couldn't update: ${res.error}`);
      await load();
    }
    if (next) setSearch('');
    setBusyId(null);
  }

  return (
    <Panel
      title="Alumni admins"
      hint="is_alumni_admin lets someone run the alumni side (roster, incoming alumni, this page) without full admin."
      action={<PanelLink href="/feather/admin/user-permissions">Open User Permissions →</PanelLink>}
    >
      {users === null ? (
        <p className="px-4 py-8 text-[12.5px] text-foreground/50 italic text-center">Loading…</p>
      ) : (
        <div>
          <ul className="divide-y divide-black/5">
            {admins.length === 0 ? (
              <li className="px-4 py-6 text-[12.5px] text-foreground/50 text-center">Nobody holds the alumni-admin role yet.</li>
            ) : (
              admins.map((u) => (
                <li key={u.id} className="px-4 py-2.5 flex items-center gap-3">
                  <Avatar url={u.avatar_url} name={u.full_name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{u.full_name || u.email || 'Unknown'}</p>
                    <p className="text-[11px] text-foreground/50 truncate">{u.email}</p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => void setAlumniAdmin(u, false)}
                      className="shrink-0 px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/60 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
          {canEdit && (
            <div className="border-t border-black/5 px-4 py-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search someone to grant alumni admin…"
                className="w-full px-3 py-1.5 rounded-md border border-black/10 bg-warm-bg/30 text-[12.5px] focus:bg-white transition-colors"
                style={{ outline: 'none' }}
              />
              {candidates.length > 0 && (
                <ul className="mt-1.5 rounded-lg border border-black/10 bg-white divide-y divide-black/5 overflow-hidden">
                  {candidates.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => void setAlumniAdmin(u, true)}
                        className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-warm-bg/60 disabled:opacity-50 transition-colors"
                      >
                        <Avatar url={u.avatar_url} name={u.full_name} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12.5px] font-semibold text-foreground truncate">{u.full_name || 'Unnamed'}</span>
                          <span className="block text-[10.5px] text-foreground/50 truncate">{u.email}</span>
                        </span>
                        <span className="shrink-0 text-[11px] font-semibold text-primary">Grant</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
