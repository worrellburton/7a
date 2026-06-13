'use client';

// Company page — every distinct contacts.company gets one. Pulls the
// cluster of contacts at that company into a single view: who's there,
// the unified log history across all of them, company-level notes, a
// relationship owner + follow-up, an at-a-glance roll-up, and a
// promote-to-partner action. Backed by /api/contacts/company/[slug];
// company identity is the normalized name (see lib/company.ts).

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { usePagePermissions } from '@/lib/PagePermissions';
import { supabase } from '@/lib/supabase';
import { toAvatarThumb } from '@/lib/avatarThumb';
import { METHOD_TONES, type ContactMethod } from '@/lib/contact-methods';

// Marketing & Admissions — the department that gates Outreach. Mirrors
// the constant in content-server.ts / api-gates.ts; the company page
// inherits the same access as its parent /feather/contacts.
const MARKETING_DEPT_ID = 'dfde0b96-c605-40dd-84e5-281af2f6d8e9';
const PARTNER_TYPES = ['Detox', 'RTC', 'Outpatient', 'Extended Care', 'Interventionist', 'Therapist'] as const;

interface CompanyContact {
  id: string;
  name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  phone_cell: string | null;
  phone_office: string | null;
  location: string | null;
  rating: string | null;
  type: string[] | null;
  specialty: string | null;
  lat: number | null;
  lng: number | null;
  is_partner: boolean;
  last_contact_at: string | null;
  last_contact_by_name: string | null;
  unsubscribed_at: string | null;
}

interface CompanyLog {
  id: string;
  contact_id: string;
  method: ContactMethod | null;
  comments: string | null;
  contacted_at: string | null;
  duration_seconds: number | null;
  contacted_by_name: string | null;
  contacted_by_avatar_url: string | null;
}

interface CompanyProfile {
  id: string;
  notes: string | null;
  owner_id: string | null;
  follow_up_at: string | null;
  promoted_partner_id: string | null;
  promoted_at: string | null;
}

interface CompanyPayload {
  company: {
    key: string;
    displayName: string;
    slug: string;
    website: string | null;
    contactCount: number;
    lastContactAt: string | null;
    logCount: number;
    partnerCount: number;
  };
  profile: CompanyProfile | null;
  owner: { id: string; full_name: string | null; avatar_url: string | null } | null;
  contacts: CompanyContact[];
  logs: CompanyLog[];
}

// ─── helpers ────────────────────────────────────────────────────

function fmtAgo(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtExact(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

type Staleness = 'fresh' | 'cooling' | 'stale' | 'never';
function staleness(iso: string | null): Staleness {
  if (!iso) return 'never';
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (days < 7) return 'fresh';
  if (days < 21) return 'cooling';
  return 'stale';
}
const STALE_TONE: Record<Staleness, string> = {
  fresh: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cooling: 'bg-amber-50 text-amber-800 border-amber-200',
  stale: 'bg-rose-50 text-rose-700 border-rose-200',
  never: 'bg-foreground/5 text-foreground/50 border-foreground/15',
};
const STALE_LABEL: Record<Staleness, string> = { fresh: 'Active', cooling: 'Cooling', stale: 'Going cold', never: 'Never contacted' };
const RATING_TONE: Record<string, string> = {
  'Tier 1': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Tier 2': 'bg-amber-50 text-amber-700 border-amber-200',
  'Tier 3': 'bg-foreground/5 text-foreground/60 border-foreground/15',
};

function Avatar({ url, name, size = 7 }: { url: string | null; name: string | null; size?: 6 | 7 | 9 }) {
  const cls = size === 9 ? 'w-9 h-9' : size === 6 ? 'w-6 h-6' : 'w-7 h-7';
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={toAvatarThumb(url, 80) ?? url} alt="" referrerPolicy="no-referrer" className={`${cls} rounded-full object-cover bg-warm-bg ring-1 ring-black/5 shrink-0`} />;
  }
  return (
    <span aria-hidden className={`${cls} inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold shrink-0`}>
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

// ─── page ───────────────────────────────────────────────────────

export default function CompanyContent({ slug }: { slug: string }) {
  const { user, session, isAdmin, isSuperAdmin, departmentId } = useAuth();
  const { userOverrides, userExtraDepartmentIds } = usePagePermissions();
  const router = useRouter();
  const token = session?.access_token ?? null;

  // Same access as /feather/contacts: admins, Marketing & Admissions
  // (primary or extra dept), or a per-user Outreach grant.
  const hasAccess =
    isAdmin || isSuperAdmin ||
    departmentId === MARKETING_DEPT_ID ||
    userExtraDepartmentIds.includes(MARKETING_DEPT_ID) ||
    userOverrides['/feather/contacts'] === true;

  const [data, setData] = useState<CompanyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/contacts/company/${encodeURIComponent(slug)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json as CompanyPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [token, slug]);

  useEffect(() => { void load(); }, [load]);

  // Realtime: a teammate logging a touch (contact_logs) or editing the
  // profile (owner/notes/promotion) refreshes the page live.
  useEffect(() => {
    if (!data) return;
    const ch = supabase
      .channel(`company-${slug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_logs' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_profiles' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [data, slug, load]);

  if (!user) return null;
  if (!hasAccess) {
    return (
      <div className="p-6 sm:p-10 max-w-2xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
        <div className="rounded-2xl border border-black/10 bg-white px-6 py-12 text-center text-sm text-foreground/55">
          Outreach access required to view company pages.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
        <div className="h-5 w-40 rounded bg-foreground/8 animate-pulse mb-3" />
        <div className="h-8 w-72 rounded bg-foreground/8 animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64 rounded-2xl bg-foreground/5 animate-pulse" />
          <div className="h-64 rounded-2xl bg-foreground/5 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 sm:p-10 max-w-2xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
        <Link href="/feather/contacts" className="text-[12px] font-semibold text-primary hover:underline">← Outreach</Link>
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center text-sm text-rose-700">
          {error ?? 'Company not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]" style={{ fontFamily: 'var(--font-body)' }}>
      <Header
        data={data}
        token={token}
        onPromote={() => setPromoteOpen(true)}
        onChange={() => void load()}
      />

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ContactsCard contacts={data.contacts} />
          <ActivityCard logs={data.logs} contacts={data.contacts} />
        </div>
        <div className="space-y-4">
          <NotesCard slug={slug} initialNotes={data.profile?.notes ?? ''} token={token} />
          <RollupCard contacts={data.contacts} />
        </div>
      </div>

      {promoteOpen && (
        <PromoteModal
          slug={slug}
          contacts={data.contacts}
          token={token}
          onClose={() => setPromoteOpen(false)}
          onDone={(partnerId) => { setPromoteOpen(false); void load(); if (partnerId) router.push('/feather/partnerships'); }}
        />
      )}
    </div>
  );
}

// ─── header ─────────────────────────────────────────────────────

function Header({ data, token, onPromote, onChange }: {
  data: CompanyPayload;
  token: string | null;
  onPromote: () => void;
  onChange: () => void;
}) {
  const { company, profile, owner } = data;
  const s = staleness(company.lastContactAt);
  const promoted = !!profile?.promoted_partner_id;

  const emailable = data.contacts.filter((c) => c.email && !c.unsubscribed_at);
  const mailto = emailable.length > 0
    ? `mailto:?bcc=${encodeURIComponent(emailable.map((c) => c.email).join(','))}`
    : null;

  async function patch(body: Record<string, unknown>) {
    if (!token) return;
    await fetch(`/api/contacts/company/${encodeURIComponent(company.slug)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    onChange();
  }

  return (
    <header>
      <Link href="/feather/contacts" className="text-[12px] font-semibold text-primary hover:underline">← Outreach</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              {company.displayName}
            </h1>
            {promoted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                ★ Partner
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STALE_TONE[s]}`}>
              {STALE_LABEL[s]}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-foreground/55 flex items-center gap-2 flex-wrap">
            <span>{company.contactCount} {company.contactCount === 1 ? 'contact' : 'contacts'}</span>
            <span aria-hidden className="text-foreground/25">·</span>
            <span>{company.logCount} {company.logCount === 1 ? 'touch' : 'touches'} logged</span>
            <span aria-hidden className="text-foreground/25">·</span>
            <span>last touch {fmtAgo(company.lastContactAt)}</span>
            {company.website && (
              <>
                <span aria-hidden className="text-foreground/25">·</span>
                <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {company.website.replace(/^https?:\/\//, '')}
                </a>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {mailto && (
            <a href={mailto} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black/10 bg-white text-[12px] font-semibold text-foreground/70 hover:bg-warm-bg/60 transition-colors">
              ✉ Email everyone ({emailable.length})
            </a>
          )}
          {promoted ? (
            <Link href="/feather/partnerships" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[12px] font-semibold hover:bg-primary/15 transition-colors">
              View partner →
            </Link>
          ) : (
            <button type="button" onClick={onPromote} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-white text-[12px] font-semibold hover:bg-foreground/85 transition-colors">
              ★ Promote to partner
            </button>
          )}
        </div>
      </div>

      {/* Owner + follow-up rail */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-black/10 bg-white px-4 py-3">
        <label className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/45">Owner</span>
          <OwnerSelect currentId={profile?.owner_id ?? null} owner={owner} onPick={(id) => void patch({ owner_id: id })} />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/45">Follow up</span>
          <input
            type="date"
            defaultValue={profile?.follow_up_at ? new Date(profile.follow_up_at).toISOString().slice(0, 10) : ''}
            onChange={(e) => void patch({ follow_up_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="rounded-md border border-black/10 bg-white px-2 py-1 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
    </header>
  );
}

function OwnerSelect({ currentId, owner, onPick }: {
  currentId: string | null;
  owner: { id: string; full_name: string | null; avatar_url: string | null } | null;
  onPick: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState<Array<{ id: string; full_name: string | null; avatar_url: string | null }>>([]);
  useEffect(() => {
    if (!open || staff.length > 0) return;
    void supabase.from('users').select('id, full_name, avatar_url').eq('user_kind', 'staff').order('full_name').then(({ data }) => {
      setStaff((data ?? []) as Array<{ id: string; full_name: string | null; avatar_url: string | null }>);
    });
  }, [open, staff.length]);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-2 py-1 text-[12.5px] hover:bg-warm-bg/60">
        {owner ? (
          <>
            <Avatar url={owner.avatar_url} name={owner.full_name} size={6} />
            <span className="font-semibold text-foreground">{owner.full_name ?? 'Unknown'}</span>
          </>
        ) : (
          <span className="text-foreground/45">Unassigned</span>
        )}
        <svg className="w-3 h-3 text-foreground/40" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6l4 4 4-4" /></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 w-56 max-h-72 overflow-y-auto rounded-lg border border-black/10 bg-white shadow-lg py-1">
            <button type="button" onClick={() => { onPick(null); setOpen(false); }} className="w-full px-3 py-1.5 text-left text-[12.5px] text-foreground/55 hover:bg-warm-bg/60">Unassigned</button>
            {staff.map((u) => (
              <button key={u.id} type="button" onClick={() => { onPick(u.id); setOpen(false); }} className={`w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-warm-bg/60 ${u.id === currentId ? 'bg-warm-bg/40' : ''}`}>
                <Avatar url={u.avatar_url} name={u.full_name} size={6} />
                <span className="text-[12.5px] font-semibold text-foreground truncate">{u.full_name ?? 'Unnamed'}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── contacts card ──────────────────────────────────────────────

function ContactsCard({ contacts }: { contacts: CompanyContact[] }) {
  const sorted = useMemo(
    () => contacts.slice().sort((a, b) => {
      const at = a.last_contact_at ? Date.parse(a.last_contact_at) : 0;
      const bt = b.last_contact_at ? Date.parse(b.last_contact_at) : 0;
      return bt - at;
    }),
    [contacts],
  );
  return (
    <section className="rounded-2xl border border-black/10 bg-white">
      <header className="px-4 py-3 border-b border-black/5">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">Contacts · {contacts.length}</p>
      </header>
      <ul className="divide-y divide-black/5">
        {sorted.map((c) => (
          <li key={c.id} className="px-4 py-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-foreground truncate flex items-center gap-2">
                {c.name || 'Unnamed'}
                {c.is_partner && <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">Partner</span>}
                {c.unsubscribed_at && <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200">Unsub</span>}
              </p>
              <p className="text-[11.5px] text-foreground/55 truncate">
                {[c.role, c.email, c.phone || c.phone_cell || c.phone_office].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            {c.rating && (
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${RATING_TONE[c.rating] ?? RATING_TONE['Tier 3']}`}>{c.rating}</span>
            )}
            <span className="shrink-0 w-20 text-right text-[11px] text-foreground/45">{fmtAgo(c.last_contact_at)}</span>
          </li>
        ))}
        {contacts.length === 0 && (
          <li className="px-4 py-8 text-center text-[12.5px] text-foreground/45">No contacts at this company.</li>
        )}
      </ul>
    </section>
  );
}

// ─── activity card ──────────────────────────────────────────────

function ActivityCard({ logs, contacts }: { logs: CompanyLog[]; contacts: CompanyContact[] }) {
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of contacts) m.set(c.id, c.name || 'Unknown contact');
    return m;
  }, [contacts]);
  return (
    <section className="rounded-2xl border border-black/10 bg-white">
      <header className="px-4 py-3 border-b border-black/5">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">Activity · {logs.length}</p>
      </header>
      {logs.length === 0 ? (
        <p className="px-4 py-8 text-center text-[12.5px] text-foreground/45">No touches logged yet. Logs from any contact here roll up into this timeline.</p>
      ) : (
        <ul className="divide-y divide-black/5 max-h-[520px] overflow-y-auto overscroll-contain">
          {logs.map((l) => (
            <li key={l.id} className="px-4 py-3 flex items-start gap-3">
              <Avatar url={l.contacted_by_avatar_url} name={l.contacted_by_name} />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] leading-snug">
                  <span className="font-semibold text-foreground">{l.contacted_by_name ?? 'Someone'}</span>
                  <span className="text-foreground/55"> · {nameById.get(l.contact_id) ?? 'a contact'}</span>
                </p>
                {l.comments && <p className="mt-0.5 text-[12.5px] text-foreground/75 whitespace-pre-wrap break-words">{l.comments}</p>}
                <p className="mt-1 flex items-center gap-1.5 text-[10.5px]" title={fmtExact(l.contacted_at)}>
                  {l.method && <span className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${METHOD_TONES[l.method]}`}>{l.method}</span>}
                  <span className="text-foreground/45">{fmtAgo(l.contacted_at)}</span>
                  {typeof l.duration_seconds === 'number' && l.duration_seconds > 0 && (
                    <span className="text-foreground/40">· {Math.round(l.duration_seconds / 60)}m</span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── notes card ─────────────────────────────────────────────────

function NotesCard({ slug, initialNotes, token }: { slug: string; initialNotes: string; token: string | null }) {
  const [draft, setDraft] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const lastSaved = useMemo(() => ({ v: initialNotes }), [initialNotes]);
  useEffect(() => { setDraft(initialNotes); lastSaved.v = initialNotes; }, [initialNotes, lastSaved]);

  async function save() {
    if (draft === lastSaved.v || !token) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/company/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: draft }),
      });
      if (res.ok) { lastSaved.v = draft; setSavedAt(Date.now()); }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white">
      <header className="px-4 py-3 border-b border-black/5">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">Company notes</p>
      </header>
      <div className="p-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void save()}
          rows={8}
          placeholder="Notes about the whole relationship — who the decision-makers are, history, what they refer, anything the team should know."
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-[13px] leading-relaxed bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
        />
        <p className="mt-1 text-[11px] text-foreground/45">
          {saving ? 'Saving…' : savedAt ? 'Saved.' : 'Auto-saves when you click away.'}
        </p>
      </div>
    </section>
  );
}

// ─── roll-up card ───────────────────────────────────────────────

function RollupCard({ contacts }: { contacts: CompanyContact[] }) {
  const { types, specialties, ratings, geocoded } = useMemo(() => {
    const types = new Map<string, number>();
    const specialties = new Map<string, number>();
    const ratings = new Map<string, number>();
    let geocoded = 0;
    for (const c of contacts) {
      for (const t of c.type ?? []) types.set(t, (types.get(t) ?? 0) + 1);
      if (c.specialty) specialties.set(c.specialty, (specialties.get(c.specialty) ?? 0) + 1);
      if (c.rating) ratings.set(c.rating, (ratings.get(c.rating) ?? 0) + 1);
      if (typeof c.lat === 'number' && typeof c.lng === 'number') geocoded += 1;
    }
    return { types, specialties, ratings, geocoded };
  }, [contacts]);

  const chips = (m: Map<string, number>) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]);

  function Group({ label, entries }: { label: string; entries: [string, number][] }) {
    if (entries.length === 0) return null;
    return (
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/45 mb-1.5">{label}</p>
        <div className="flex flex-wrap gap-1.5">
          {entries.map(([k, n]) => (
            <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-warm-bg/60 text-foreground/70 border border-black/10">
              {k}<span className="text-foreground/40">{n}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white">
      <header className="px-4 py-3 border-b border-black/5">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">At a glance</p>
      </header>
      <div className="p-4 space-y-3.5">
        <Group label="Types" entries={chips(types)} />
        <Group label="Specialties" entries={chips(specialties)} />
        <Group label="Ratings" entries={chips(ratings)} />
        <p className="text-[11.5px] text-foreground/50">
          📍 {geocoded} of {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} geocoded on the map.
        </p>
      </div>
    </section>
  );
}

// ─── promote modal ──────────────────────────────────────────────

function PromoteModal({ slug, contacts, token, onClose, onDone }: {
  slug: string;
  contacts: CompanyContact[];
  token: string | null;
  onClose: () => void;
  onDone: (partnerId: string | null) => void;
}) {
  const candidates = contacts.filter((c) => !c.is_partner);
  const [contactId, setContactId] = useState(candidates[0]?.id ?? '');
  const [type, setType] = useState<typeof PARTNER_TYPES[number]>('Detox');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function promote() {
    if (!token || !contactId || busy) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/contacts/company/${encodeURIComponent(slug)}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contact_id: contactId, type }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setErr((json as { error?: string }).error ?? `HTTP ${res.status}`); return; }
      onDone((json as { partner_id?: string }).partner_id ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-0 sm:p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 pb-[env(safe-area-inset-bottom)]">
        <header className="px-5 py-4 border-b border-black/5">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">Promote</p>
          <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Promote company to partner</h2>
        </header>
        <div className="px-5 py-5 space-y-4">
          <p className="text-[12.5px] text-foreground/60 leading-relaxed">
            The company becomes a partner on the partnerships board, anchored to one point of contact. Their log history stays unified.
          </p>
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/50 mb-1.5">Point of contact</span>
            {candidates.length === 0 ? (
              <p className="text-[12.5px] text-rose-600">Every contact here is already a partner.</p>
            ) : (
              <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30">
                {candidates.map((c) => <option key={c.id} value={c.id}>{c.name || 'Unnamed'}{c.role ? ` — ${c.role}` : ''}</option>)}
              </select>
            )}
          </label>
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/50 mb-1.5">Partner type</span>
            <select value={type} onChange={(e) => setType(e.target.value as typeof PARTNER_TYPES[number])} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30">
              {PARTNER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          {err && <p className="text-[12px] text-rose-700">{err}</p>}
          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={promote} disabled={busy || candidates.length === 0} className="flex-1 px-4 py-2.5 rounded-lg bg-foreground text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-foreground/85 disabled:opacity-40 transition-colors">
              {busy ? 'Promoting…' : 'Promote to partner'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg border border-black/10 bg-white text-[12px] font-semibold text-foreground/60 hover:bg-warm-bg/60">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
