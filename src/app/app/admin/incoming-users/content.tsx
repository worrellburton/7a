'use client';

// Incoming Users — super-admin-only triage surface that replaces the
// "Pending Approval" strip that used to live at the top of /app/team.
// Three tabs:
//   1. Pending staff       @sevenarrowsrecovery.com sign-ins waiting
//                          for approval — Approve / Deny.
//   2. External sign-ins   non-@sa accounts that haven't been
//                          classified yet — Mark Guest / Alumni.
//   3. Already classified  current Guests + Alumni list, with the
//                          ability to re-edit guest page permissions
//                          or flip them back to staff.

import { useAuth } from '@/lib/AuthProvider';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePagePermissions } from '@/lib/PagePermissions';

interface IncomingUser {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  status: 'active' | 'on_hold' | 'denied' | null;
  is_admin: boolean | null;
  is_super_admin: boolean | null;
  user_kind: 'staff' | 'guest' | 'alumni';
  department_id: string | null;
  last_sign_in: string | null;
  last_seen_at: string | null;
  created_at: string;
  allowedPages?: string[];
}

interface ApiPayload {
  pendingStaff: IncomingUser[];
  externalNew: IncomingUser[];
  guests: IncomingUser[];
  alumni: IncomingUser[];
}

type TabKey = 'pendingStaff' | 'external' | 'classified';

const SA_DOMAIN = '@sevenarrowsrecovery.com';

export default function IncomingUsersContent() {
  const { user, session } = useAuth();
  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<TabKey>('pendingStaff');
  const [classifyTarget, setClassifyTarget] = useState<IncomingUser | null>(null);
  const [pagesTarget, setPagesTarget] = useState<IncomingUser | null>(null);

  // Super-admin runtime gate. The page is also gated by adminOnly in
  // PagePermissions (regular admins see it but bounce on direct
  // navigation), and every /api/incoming-users/* route enforces
  // requireSuperAdmin server-side. This client check just renders a
  // friendly forbidden card instead of an empty page.
  useEffect(() => {
    if (!session?.access_token || !user?.id) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/incoming-users`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (cancelled) return;
      if (res.status === 401 || res.status === 403) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }
      setIsSuperAdmin(true);
      try {
        const json = (await res.json()) as ApiPayload;
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session?.access_token, user?.id]);

  async function refresh() {
    if (!session?.access_token) return;
    const res = await fetch(`/api/incoming-users`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) setData((await res.json()) as ApiPayload);
  }

  async function classify(target: IncomingUser, kind: 'staff' | 'guest' | 'alumni', status?: 'active' | 'denied') {
    if (!session?.access_token) return;
    const body: Record<string, unknown> = { kind };
    if (status) body.status = status;
    const res = await fetch(`/api/incoming-users/${target.id}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Couldn't update: ${json.error ?? res.status}`);
      return;
    }
    await refresh();
    setClassifyTarget(null);
  }

  if (!user) return null;

  if (isSuperAdmin === false) {
    return (
      <div className="p-8 max-w-xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-amber-700">Forbidden</p>
          <h1 className="mt-1 text-lg font-semibold text-foreground">Super admins only</h1>
          <p className="mt-2 text-sm text-foreground/70">
            The Incoming Users page is restricted to super admins.
          </p>
          <Link href="/app" className="mt-4 inline-block text-xs font-semibold text-primary hover:underline">Back to app</Link>
        </div>
      </div>
    );
  }

  const counts = data
    ? {
        pendingStaff: data.pendingStaff.length,
        external: data.externalNew.length,
        classified: data.guests.length + data.alumni.length,
      }
    : { pendingStaff: 0, external: 0, classified: 0 };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-primary/85">Super admin</p>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">Incoming Users</h1>
        <p className="text-sm text-foreground/55 mt-0.5">
          Triage every account that signs in — approve staff, classify
          outsiders as Guest or Alumni, and shape what guests can see.
        </p>
      </header>

      <div className="mb-5 inline-flex items-center rounded-lg border border-black/10 bg-white p-1 gap-1">
        <TabButton active={tab === 'pendingStaff'} onClick={() => setTab('pendingStaff')}>
          Pending staff
          <Count n={counts.pendingStaff} tone="amber" />
        </TabButton>
        <TabButton active={tab === 'external'} onClick={() => setTab('external')}>
          External sign-ins
          <Count n={counts.external} tone="blue" />
        </TabButton>
        <TabButton active={tab === 'classified'} onClick={() => setTab('classified')}>
          Classified
          <Count n={counts.classified} tone="muted" />
        </TabButton>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-foreground/45">Loading…</p>
      ) : !data ? null : tab === 'pendingStaff' ? (
        <PendingStaffPanel
          rows={data.pendingStaff}
          onApprove={(u) => classify(u, 'staff', 'active')}
          onDeny={(u) => classify(u, 'staff', 'denied')}
        />
      ) : tab === 'external' ? (
        <ExternalPanel
          rows={data.externalNew}
          onClassify={(u) => setClassifyTarget(u)}
          onAlumni={(u) => classify(u, 'alumni', 'active')}
        />
      ) : (
        <ClassifiedPanel
          guests={data.guests}
          alumni={data.alumni}
          onEditPages={(u) => setPagesTarget(u)}
          onMakeStaff={(u) => classify(u, 'staff', 'active')}
        />
      )}

      {classifyTarget && (
        <ClassifyExternalModal
          user={classifyTarget}
          onClose={() => setClassifyTarget(null)}
          onMarkAlumni={() => classify(classifyTarget, 'alumni', 'active')}
          onMarkGuest={() => {
            // Don't dismiss; the next modal handles page perms.
            // But we DO need to flip user_kind first so subsequent
            // refreshes have the correct classification.
            void (async () => {
              await classify(classifyTarget, 'guest', 'active');
              setPagesTarget(classifyTarget);
            })();
          }}
        />
      )}

      {pagesTarget && (
        <GuestPagesModal
          user={pagesTarget}
          onClose={async () => {
            setPagesTarget(null);
            await refresh();
          }}
          onSave={async (paths) => {
            if (!session?.access_token) return;
            await fetch(`/api/incoming-users/${pagesTarget.id}/pages`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ paths }),
            });
            setPagesTarget(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

// ─── Tab buttons + counts ─────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
        active ? 'bg-foreground text-white' : 'text-foreground/65 hover:text-foreground hover:bg-warm-bg/60'
      }`}
    >
      {children}
    </button>
  );
}

function Count({ n, tone }: { n: number; tone: 'amber' | 'blue' | 'muted' }) {
  if (n === 0) return null;
  const cls = tone === 'amber'
    ? 'bg-amber-100 text-amber-800'
    : tone === 'blue'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-foreground/10 text-foreground/60';
  return <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold tabular-nums ${cls}`}>{n}</span>;
}

// ─── Pending staff panel ──────────────────────────────────────

function PendingStaffPanel({
  rows,
  onApprove,
  onDeny,
}: {
  rows: IncomingUser[];
  onApprove: (u: IncomingUser) => void;
  onDeny: (u: IncomingUser) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState title="No pending staff" body="Every @sevenarrowsrecovery.com sign-in has been triaged." />;
  }
  return (
    <ul className="space-y-2">
      {rows.map((u) => (
        <li key={u.id} className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3">
          <UserAvatar user={u} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{u.full_name || u.email || 'Unnamed user'}</p>
            <p className="text-[12px] text-foreground/55 truncate">{u.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onApprove(u)} className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-emerald-700">
              Approve
            </button>
            <button onClick={() => onDeny(u)} className="px-3 py-1.5 rounded-md bg-white text-rose-700 border border-rose-200 text-[11px] font-semibold uppercase tracking-wider hover:bg-rose-50">
              Deny
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── External panel ────────────────────────────────────────────

function ExternalPanel({
  rows,
  onClassify,
  onAlumni,
}: {
  rows: IncomingUser[];
  onClassify: (u: IncomingUser) => void;
  onAlumni: (u: IncomingUser) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState title="No external sign-ins waiting" body="Anyone who signs in with a non-@sevenarrowsrecovery.com email will land here." />;
  }
  return (
    <ul className="space-y-2">
      {rows.map((u) => (
        <li key={u.id} className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3">
          <UserAvatar user={u} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{u.full_name || u.email || 'Unnamed user'}</p>
            <p className="text-[12px] text-foreground/55 truncate">
              {u.email}
              {u.last_sign_in && (
                <span className="ml-2 text-foreground/40">· last sign-in {new Date(u.last_sign_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onClassify(u)} className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-foreground/85">
              Classify
            </button>
            <button onClick={() => onAlumni(u)} className="px-3 py-1.5 rounded-md bg-white border border-black/10 text-foreground/70 text-[11px] font-semibold uppercase tracking-wider hover:bg-warm-bg/60">
              Mark alumni
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Classified panel ──────────────────────────────────────────

function ClassifiedPanel({
  guests,
  alumni,
  onEditPages,
  onMakeStaff,
}: {
  guests: IncomingUser[];
  alumni: IncomingUser[];
  onEditPages: (u: IncomingUser) => void;
  onMakeStaff: (u: IncomingUser) => void;
}) {
  if (guests.length === 0 && alumni.length === 0) {
    return <EmptyState title="No one classified yet" body="Guests + alumni will collect here once you classify them from the External tab." />;
  }
  return (
    <div className="space-y-6">
      {guests.length > 0 && (
        <section>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45 mb-2">Guests</p>
          <ul className="space-y-2">
            {guests.map((u) => (
              <li key={u.id} className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-3">
                <UserAvatar user={u} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{u.full_name || u.email || 'Unnamed user'}</p>
                  <p className="text-[12px] text-foreground/55 truncate">{u.email}</p>
                  <p className="mt-1 text-[11px] text-foreground/55">
                    {(u.allowedPages ?? []).length === 0
                      ? <span className="text-rose-700">No pages allowed</span>
                      : <>Allowed pages: <span className="font-semibold text-foreground/80">{(u.allowedPages ?? []).length}</span></>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onEditPages(u)} className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-foreground/85">
                    Edit pages
                  </button>
                  <button onClick={() => onMakeStaff(u)} className="px-3 py-1.5 rounded-md bg-white border border-black/10 text-foreground/70 text-[11px] font-semibold uppercase tracking-wider hover:bg-warm-bg/60">
                    Make staff
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {alumni.length > 0 && (
        <section>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45 mb-2">Alumni</p>
          <ul className="space-y-2">
            {alumni.map((u) => (
              <li key={u.id} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
                <UserAvatar user={u} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{u.full_name || u.email || 'Unnamed user'}</p>
                  <p className="text-[12px] text-foreground/55 truncate">{u.email}</p>
                </div>
                <button onClick={() => onMakeStaff(u)} className="px-3 py-1.5 rounded-md bg-white border border-black/10 text-foreground/70 text-[11px] font-semibold uppercase tracking-wider hover:bg-warm-bg/60">
                  Make staff
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ─── Avatar ────────────────────────────────────────────────────

function UserAvatar({ user }: { user: IncomingUser }) {
  if (user.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-black/10" />;
  }
  const letter = (user.full_name || user.email || '?').charAt(0).toUpperCase();
  return (
    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20">
      {letter}
    </span>
  );
}

// ─── Classify external modal ──────────────────────────────────

function ClassifyExternalModal({
  user,
  onClose,
  onMarkAlumni,
  onMarkGuest,
}: {
  user: IncomingUser;
  onClose: () => void;
  onMarkAlumni: () => void;
  onMarkGuest: () => void;
}) {
  const isSa = (user.email || '').toLowerCase().endsWith(SA_DOMAIN);
  return (
    <ModalShell title={user.full_name || user.email || 'Unnamed user'} eyebrow="Classify sign-in" onClose={onClose}>
      <div className="px-6 py-5 space-y-4">
        <p className="text-sm text-foreground/70 leading-relaxed">
          {user.email} {isSa
            ? <span className="text-amber-700">— this email is on the @sevenarrowsrecovery.com domain. Use the Pending staff tab to approve them as staff.</span>
            : <span>signed in with an external email. Pick how to classify them:</span>}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onMarkGuest}
            className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-left hover:bg-blue-50 transition-colors"
          >
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-blue-700">Guest</p>
            <p className="mt-1 text-sm font-semibold text-foreground">Limited access</p>
            <p className="mt-1 text-[12px] text-foreground/65 leading-snug">
              Mark them as a guest and choose exactly which /app pages they can view. Anything not on the list is denied.
            </p>
          </button>
          <button
            type="button"
            onClick={onMarkAlumni}
            className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-left hover:bg-emerald-50 transition-colors"
          >
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-emerald-700">Alumni</p>
            <p className="mt-1 text-sm font-semibold text-foreground">Just mark + log</p>
            <p className="mt-1 text-[12px] text-foreground/65 leading-snug">
              Mark them as alumni for the record. They keep no special access; the team page just stops surfacing them as staff.
            </p>
          </button>
        </div>
      </div>
      <footer className="px-6 py-4 border-t border-black/5 flex items-center justify-end gap-2">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-foreground/65 hover:bg-warm-bg/60">
          Cancel
        </button>
      </footer>
    </ModalShell>
  );
}

// ─── Guest pages modal ────────────────────────────────────────

function GuestPagesModal({
  user,
  onClose,
  onSave,
}: {
  user: IncomingUser;
  onClose: () => void;
  onSave: (paths: string[]) => Promise<void> | void;
}) {
  const { pages } = usePagePermissions();
  const { session } = useAuth();
  const [paths, setPaths] = useState<string[]>(user.allowedPages ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Always re-fetch from the server in case the cached row on the
  // user object lagged a write from another tab.
  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    fetch(`/api/incoming-users/${user.id}/pages`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (r) => (r.ok ? await r.json() : null))
      .then((json) => { if (!cancelled && json) setPaths(json.paths ?? []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.access_token, user.id]);

  const grouped = useMemo(() => {
    const navPages = pages.filter((p) => p.section === 'nav');
    const popupPages = pages.filter((p) => p.section === 'popup');
    return { navPages, popupPages };
  }, [pages]);

  function toggle(path: string) {
    setPaths((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));
  }

  function selectAll() { setPaths(pages.map((p) => p.path)); }
  function clearAll() { setPaths([]); }

  return (
    <ModalShell title={`Choose pages for ${user.full_name || user.email}`} eyebrow="Guest permissions" onClose={onClose}>
      <div className="px-6 py-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] text-foreground/65">
            Toggle the /app pages this guest can view. Anything not on the list is hidden + bounces them on direct nav.
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={selectAll} className="text-[11px] font-semibold text-primary hover:underline">Select all</button>
            <span className="text-foreground/20">·</span>
            <button type="button" onClick={clearAll} className="text-[11px] font-semibold text-rose-700 hover:underline">Clear</button>
          </div>
        </div>
        {loading ? (
          <p className="text-sm text-foreground/45">Loading…</p>
        ) : (
          <div className="space-y-5">
            <PageGroup label="Sidebar" pages={grouped.navPages} selected={paths} onToggle={toggle} />
            <PageGroup label="Popup menu" pages={grouped.popupPages} selected={paths} onToggle={toggle} />
          </div>
        )}
      </div>
      <footer className="px-6 py-4 border-t border-black/5 flex items-center justify-between gap-2 sticky bottom-0 bg-white">
        <p className="text-[11px] text-foreground/55">
          {paths.length} {paths.length === 1 ? 'page' : 'pages'} selected
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-foreground/65 hover:bg-warm-bg/60">
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={async () => { setSubmitting(true); try { await onSave(paths); } finally { setSubmitting(false); } }}
            className="px-4 py-2 rounded-lg bg-foreground text-white text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save permissions'}
          </button>
        </div>
      </footer>
    </ModalShell>
  );
}

function PageGroup({
  label,
  pages,
  selected,
  onToggle,
}: {
  label: string;
  pages: { path: string; label: string }[];
  selected: string[];
  onToggle: (path: string) => void;
}) {
  if (pages.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45 mb-2">{label}</p>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {pages.map((p) => {
          const checked = selected.includes(p.path);
          return (
            <li key={p.path}>
              <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-black/10 bg-white hover:bg-warm-bg/60 cursor-pointer text-[12.5px]">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(p.path)}
                  className="accent-primary"
                />
                <span className={checked ? 'text-foreground' : 'text-foreground/55'}>{p.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Modal shell ──────────────────────────────────────────────

function ModalShell({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3 sm:p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <header className="px-6 py-4 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">{eyebrow}</p>
            <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-foreground/50 hover:text-foreground" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-[12.5px] text-foreground/55 max-w-sm mx-auto leading-snug">{body}</p>
    </div>
  );
}
