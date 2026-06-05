'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { toAvatarThumb } from '@/lib/avatarThumb';

// Staff-facing alumni roster. Lists every users.user_kind='alumni'
// row with the joined alumni_profiles fields. Each row links to the
// per-alumnus detail page at /app/alumni/u/[id] (read-only viewer
// that respects alum-side opt-ins). Privacy here is staff-elevated —
// admins managing the roster see all fields raw so they can spot
// incomplete profiles, stale sobriety dates, and missing opt-ins.

interface RosterRow {
  id: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  status: 'active' | 'on_hold' | 'denied' | null;
  createdAt: string;
  lastSignIn: string | null;
  lastSeenAt: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  interests: string[];
  availableFor: string[];
  phone: string | null;
  emailForAlumni: string | null;
  sobrietyDate: string | null;
  sobrietyPublic: boolean;
  trackSobriety: boolean;
  onMap: boolean;
  onPhoneList: boolean;
  phoneVisible: boolean;
  emailVisible: boolean;
  textOk: boolean;
  checkInStreak: number;
  lastCheckInAt: string | null;
  profileUpdatedAt: string | null;
}

type SortKey = 'name' | 'sobriety' | 'lastSignIn' | 'created' | 'streak';
type SortDir = 'asc' | 'desc';

const STATUS_TONE: Record<NonNullable<RosterRow['status']>, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  on_hold: 'bg-amber-50 text-amber-800 border-amber-200',
  denied: 'bg-rose-50 text-rose-700 border-rose-200',
};

function soberMilestone(iso: string | null): { label: string; days: number } | null {
  if (!iso) return null;
  // Phoenix is the canonical app timezone (no DST). Anchor sobriety
  // to midnight Phoenix on the start date so a checkin at 11pm in
  // Phoenix doesn't drift the day count by one across midnight UTC.
  const start = Date.parse(`${iso}T00:00:00-07:00`);
  if (!Number.isFinite(start)) return null;
  const days = Math.floor((Date.now() - start) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return { label: 'Day 1', days };
  if (days < 30) return { label: `${days}d`, days };
  if (days < 365) {
    const months = Math.floor(days / 30);
    return { label: `${months}mo`, days };
  }
  const years = Math.floor(days / 365);
  return { label: `${years}y`, days };
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '—';
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return 'never';
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  if (diff < 2_629_800_000) return `${Math.floor(diff / 604_800_000)}w ago`;
  return formatDate(iso);
}

export default function AlumniRosterContent() {
  const { session, user, isAdmin, isSuperAdmin, isAlumniAdmin, userKind, profileLoading } = useAuth();
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [mode, setMode] = useState<'admin' | 'alumni'>('admin');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Alumni see a privacy-filtered version of the same page. Admin
  // columns (status, last sign-in, last seen) are dropped; per-row
  // contact fields are already pre-filtered by the API.
  const canSee = isSuperAdmin || isAdmin || isAlumniAdmin || userKind === 'alumni';
  const isAlumniViewer = userKind === 'alumni' && !(isSuperAdmin || isAdmin || isAlumniAdmin);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/alumni-roster', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setRows((json.rows ?? []) as RosterRow[]);
      setMode((json.mode === 'alumni' ? 'alumni' : 'admin') as 'admin' | 'alumni');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { void load(); }, [load]);

  // Sort + filter happens client-side. The list is small (tens of
  // rows), so any incremental work on a search keystroke is trivial
  // and we avoid round-trips on every filter change.
  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => {
          const hay = [
            r.fullName,
            r.email,
            r.city,
            r.state,
            r.jobTitle,
            r.bio,
            ...r.interests,
            ...r.availableFor,
          ].filter(Boolean).join(' ').toLowerCase();
          return hay.includes(q);
        })
      : rows;
    const out = filtered.slice();
    out.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'name': {
          const av = (a.fullName || '').toLowerCase();
          const bv = (b.fullName || '').toLowerCase();
          return av.localeCompare(bv) * mul;
        }
        case 'sobriety': {
          const ad = a.sobrietyDate ? Date.parse(`${a.sobrietyDate}T00:00:00-07:00`) : Number.NaN;
          const bd = b.sobrietyDate ? Date.parse(`${b.sobrietyDate}T00:00:00-07:00`) : Number.NaN;
          // Missing dates sort last regardless of direction so an
          // empty cell never floats above a real one.
          const aMissing = !Number.isFinite(ad);
          const bMissing = !Number.isFinite(bd);
          if (aMissing && bMissing) return 0;
          if (aMissing) return 1;
          if (bMissing) return -1;
          return (ad - bd) * mul;
        }
        case 'lastSignIn': {
          const at = a.lastSignIn ? Date.parse(a.lastSignIn) : Number.NaN;
          const bt = b.lastSignIn ? Date.parse(b.lastSignIn) : Number.NaN;
          const aMissing = !Number.isFinite(at);
          const bMissing = !Number.isFinite(bt);
          if (aMissing && bMissing) return 0;
          if (aMissing) return 1;
          if (bMissing) return -1;
          return (at - bt) * mul;
        }
        case 'created':
          return (Date.parse(a.createdAt) - Date.parse(b.createdAt)) * mul;
        case 'streak':
          return (a.checkInStreak - b.checkInStreak) * mul;
        default:
          return 0;
      }
    });
    return out;
  }, [rows, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : '';

  if (!user) return null;
  if (profileLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
        Loading…
      </div>
    );
  }
  if (!canSee) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center" style={{ fontFamily: 'var(--font-body)' }}>
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/45 mb-2">Alumni</p>
        <h1 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-display)' }}>Alumni roster</h1>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-900 leading-relaxed">
          <p className="font-semibold mb-1">Not available for your account.</p>
          <p>The alumni roster is for alumni community members and the staff who support them.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">
          {isAlumniViewer ? 'Community' : 'Roster'}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Alumni
        </h1>
        <p className="mt-1 text-[13.5px] text-foreground/55">
          {isAlumniViewer
            ? 'Find other alumni in the community. Tap a name for their profile.'
            : 'Every user marked alumni. Click a row to open their profile.'}
        </p>
      </header>

      {/* Toolbar — search + total. Sort lives on the column headers. */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 text-sm">🔍</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAlumniViewer ? 'Search by name, city, interest…' : 'Search by name, email, city, interest…'}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-black/10 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
          />
        </div>
        <p className="text-[11.5px] text-foreground/50">
          {loading ? 'Loading…' : `${visibleRows.length} of ${rows.length}`}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-800">
          Couldn&apos;t load roster: {error}
        </div>
      )}

      {/* Desktop / tablet: table. Mobile: stacked cards. */}
      <div className="hidden md:block rounded-2xl border border-black/10 bg-white overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-warm-bg/40 text-[10.5px] uppercase tracking-[0.18em] text-foreground/55">
            <tr>
              <th className="text-left font-semibold px-4 py-3">
                <button type="button" onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-foreground">
                  Alum {sortArrow('name')}
                </button>
              </th>
              <th className="text-left font-semibold px-4 py-3">Location</th>
              <th className="text-left font-semibold px-4 py-3">
                <button type="button" onClick={() => toggleSort('sobriety')} className="inline-flex items-center gap-1 hover:text-foreground">
                  Sobriety {sortArrow('sobriety')}
                </button>
              </th>
              <th className="text-left font-semibold px-4 py-3">
                <button type="button" onClick={() => toggleSort('streak')} className="inline-flex items-center gap-1 hover:text-foreground">
                  Streak {sortArrow('streak')}
                </button>
              </th>
              <th className="text-left font-semibold px-4 py-3">Visibility</th>
              <th className="text-left font-semibold px-4 py-3">Contact</th>
              <th className="text-left font-semibold px-4 py-3">Interests</th>
              {mode === 'admin' && (
                <>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  <th className="text-left font-semibold px-4 py-3">
                    <button type="button" onClick={() => toggleSort('lastSignIn')} className="inline-flex items-center gap-1 hover:text-foreground">
                      Last sign-in {sortArrow('lastSignIn')}
                    </button>
                  </th>
                </>
              )}
              <th className="text-left font-semibold px-4 py-3">
                <button type="button" onClick={() => toggleSort('created')} className="inline-flex items-center gap-1 hover:text-foreground">
                  Joined {sortArrow('created')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {loading ? (
              <tr>
                <td colSpan={mode === 'admin' ? 10 : 8} className="px-4 py-12 text-center italic text-foreground/55">Loading…</td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td colSpan={mode === 'admin' ? 10 : 8} className="px-4 py-12 text-center italic text-foreground/55">
                  {rows.length === 0 ? 'No alumni yet.' : 'No matches.'}
                </td>
              </tr>
            ) : (
              visibleRows.map((r) => <RosterTableRow key={r.id} r={r} mode={mode} />)
            )}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden space-y-3">
        {loading ? (
          <li className="px-4 py-10 text-center italic text-foreground/55 rounded-2xl border border-black/10 bg-white">Loading…</li>
        ) : visibleRows.length === 0 ? (
          <li className="px-4 py-10 text-center italic text-foreground/55 rounded-2xl border border-black/10 bg-white">
            {rows.length === 0 ? 'No alumni yet.' : 'No matches.'}
          </li>
        ) : (
          visibleRows.map((r) => <RosterCard key={r.id} r={r} mode={mode} />)
        )}
      </ul>
    </div>
  );
}

function RosterTableRow({ r, mode }: { r: RosterRow; mode: 'admin' | 'alumni' }) {
  const initial = (r.fullName || r.email || '?').charAt(0).toUpperCase();
  const milestone = soberMilestone(r.sobrietyDate);
  const location = [r.city, r.state].filter(Boolean).join(', ') || '—';
  return (
    <tr className="hover:bg-warm-bg/30 transition-colors">
      <td className="px-4 py-3 align-top">
        <Link href={`/app/alumni/u/${r.id}`} className="inline-flex items-center gap-3 group">
          {r.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={toAvatarThumb(r.avatarUrl, 200) ?? r.avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover bg-warm-bg shrink-0"
            />
          ) : (
            <span aria-hidden className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary text-[12px] font-bold shrink-0">
              {initial}
            </span>
          )}
          <span className="min-w-0">
            <span className="block text-[13.5px] font-semibold text-foreground truncate group-hover:text-primary">
              {r.fullName || '(no name)'}
            </span>
            {r.email && (
              <span className="block text-[11.5px] text-foreground/55 truncate">{r.email}</span>
            )}
            {r.jobTitle && (
              <span className="block text-[11px] text-foreground/45 truncate">{r.jobTitle}</span>
            )}
          </span>
        </Link>
      </td>
      <td className="px-4 py-3 align-top text-foreground/75 whitespace-nowrap">{location}</td>
      <td className="px-4 py-3 align-top">
        {milestone ? (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11.5px] font-semibold">
              🌱 {milestone.label}
            </span>
            <span className="text-[10.5px] text-foreground/45">
              from {formatDate(r.sobrietyDate)}
              {!r.sobrietyPublic && <span className="ml-1 text-amber-700">· private</span>}
            </span>
          </div>
        ) : r.trackSobriety ? (
          <span className="text-[11.5px] italic text-foreground/45">tracking, no date</span>
        ) : (
          <span className="text-[11.5px] italic text-foreground/40">—</span>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        {r.checkInStreak > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-[11.5px] font-semibold">
            🔥 {r.checkInStreak}d
          </span>
        ) : (
          <span className="text-[11.5px] italic text-foreground/40">—</span>
        )}
        {r.lastCheckInAt && (
          <span className="block text-[10.5px] text-foreground/45 mt-0.5">last {formatRelative(r.lastCheckInAt)}</span>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-wrap gap-1">
          <VisibilityChip on={r.onMap} label="Map" />
          <VisibilityChip on={r.onPhoneList} label="Phones" />
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-col gap-0.5">
          {r.phone ? (
            <span className="inline-flex items-center gap-1 text-[12px] text-foreground/80">
              📞 {r.phone}
              {!r.phoneVisible && <span className="text-amber-700 text-[10.5px]">(hidden)</span>}
              {r.textOk && <span className="text-foreground/45 text-[10.5px]">· txt</span>}
            </span>
          ) : (
            <span className="text-[11.5px] italic text-foreground/40">no phone</span>
          )}
          {r.emailForAlumni ? (
            <span className="inline-flex items-center gap-1 text-[12px] text-foreground/80">
              ✉️ {r.emailForAlumni}
              {!r.emailVisible && <span className="text-amber-700 text-[10.5px]">(hidden)</span>}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        {r.interests.length === 0 ? (
          <span className="text-[11.5px] italic text-foreground/40">—</span>
        ) : (
          <div className="flex flex-wrap gap-1 max-w-[220px]">
            {r.interests.slice(0, 4).map((it) => (
              <span key={it} className="px-1.5 py-0.5 rounded border border-black/10 bg-warm-bg/50 text-[10.5px] text-foreground/70">{it}</span>
            ))}
            {r.interests.length > 4 && (
              <span className="text-[10.5px] text-foreground/45">+{r.interests.length - 4}</span>
            )}
          </div>
        )}
      </td>
      {mode === 'admin' && (
        <>
          <td className="px-4 py-3 align-top">
            <StatusBadge status={r.status} />
          </td>
          <td className="px-4 py-3 align-top text-foreground/65 whitespace-nowrap">
            <span className="block text-[12px]">{formatRelative(r.lastSignIn)}</span>
            <span className="block text-[10.5px] text-foreground/45">{formatDate(r.lastSignIn)}</span>
          </td>
        </>
      )}
      <td className="px-4 py-3 align-top text-foreground/65 whitespace-nowrap text-[12px]">
        {formatDate(r.createdAt)}
      </td>
    </tr>
  );
}

function RosterCard({ r, mode }: { r: RosterRow; mode: 'admin' | 'alumni' }) {
  const initial = (r.fullName || r.email || '?').charAt(0).toUpperCase();
  const milestone = soberMilestone(r.sobrietyDate);
  const location = [r.city, r.state].filter(Boolean).join(', ');
  return (
    <li className="rounded-2xl border border-black/10 bg-white p-4">
      <Link href={`/app/alumni/u/${r.id}`} className="flex items-start gap-3">
        {r.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={toAvatarThumb(r.avatarUrl, 200) ?? r.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-full object-cover bg-warm-bg shrink-0"
          />
        ) : (
          <span aria-hidden className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary text-base font-bold shrink-0">
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-foreground truncate">{r.fullName || '(no name)'}</span>
            {mode === 'admin' && <StatusBadge status={r.status} />}
          </div>
          {r.email && <p className="text-[12px] text-foreground/55 truncate">{r.email}</p>}
          {location && <p className="text-[12px] text-foreground/65 mt-0.5">📍 {location}</p>}
          {milestone && (
            <p className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11.5px] font-semibold">
              🌱 {milestone.label}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            <VisibilityChip on={r.onMap} label="Map" />
            <VisibilityChip on={r.onPhoneList} label="Phones" />
            {r.checkInStreak > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-orange-200 bg-orange-50 text-orange-800 text-[10.5px] font-semibold">
                🔥 {r.checkInStreak}d
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-foreground/45">
            {mode === 'admin'
              ? <>Last sign-in {formatRelative(r.lastSignIn)} · joined {formatDate(r.createdAt)}</>
              : <>Joined {formatDate(r.createdAt)}</>}
          </p>
        </div>
      </Link>
    </li>
  );
}

function StatusBadge({ status }: { status: RosterRow['status'] }) {
  if (!status) return <span className="text-[11px] italic text-foreground/40">—</span>;
  const label = status === 'on_hold' ? 'On hold' : status[0].toUpperCase() + status.slice(1);
  return (
    <span className={`px-2 py-0.5 rounded-full border text-[10.5px] font-semibold uppercase tracking-wider whitespace-nowrap ${STATUS_TONE[status]}`}>
      {label}
    </span>
  );
}

function VisibilityChip({ on, label }: { on: boolean; label: string }) {
  if (on) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10.5px] font-semibold">
        ✓ {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-black/10 bg-warm-bg/40 text-foreground/45 text-[10.5px]">
      − {label}
    </span>
  );
}
