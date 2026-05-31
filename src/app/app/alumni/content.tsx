'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import HomeOnlineOrbit, { type OrbitHorse, type OrbitUser } from '../HomeOnlineOrbit';
import { supabase } from '@/lib/supabase';
import AlumniProfileEditor from './_components/AlumniProfileEditor';
import TimeSoberCard, { soberMilestoneLabel } from './_components/TimeSoberCard';

// Alumni hub. The 6-tile shortcut grid was removed — alumni
// reach the sub-routes (map, meetups, peer support, etc.) from
// the sidebar nav, where each entry has a glyph. The hub itself
// is now the "who's around today" surface: alumni + staff + the
// horse roster orbiting at the center of the page, mirroring
// the dashboard /app shows to staff. Gives alumni an immediate
// sense of community presence the moment they sign in.

interface DbUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  last_sign_in: string | null;
  last_seen_at: string | null;
  last_path: string | null;
  job_title: string | null;
  user_kind: 'staff' | 'alumni' | 'guest' | null;
  status: 'active' | 'on_hold' | 'denied' | null;
}

interface DbHorse {
  id: string;
  name: string;
  image_url: string | null;
  works_in?: string | null;
}

export default function AlumniHubContent() {
  const { user, session } = useAuth();
  const [staff, setStaff] = useState<OrbitUser[]>([]);
  const [alumni, setAlumni] = useState<OrbitUser[]>([]);
  const [horses, setHorses] = useState<OrbitHorse[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    const data = await db({
      action: 'select',
      table: 'users',
      select: 'id, full_name, avatar_url, last_sign_in, last_seen_at, last_path, job_title, status, user_kind',
      order: { column: 'last_sign_in', ascending: false },
    }).catch(() => []);
    if (!Array.isArray(data)) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filtered = (data as DbUser[]).filter(
      (u) => (u.status == null || u.status === 'active') && u.last_sign_in && new Date(u.last_sign_in) >= today,
    );
    const toOrbit = (u: DbUser): OrbitUser => ({
      id: u.id,
      full_name: u.full_name,
      avatar_url: u.avatar_url,
      last_sign_in: u.last_sign_in,
      last_seen_at: u.last_seen_at,
      last_path: u.last_path,
      job_title: u.job_title,
    });
    setStaff(filtered.filter((u) => u.user_kind !== 'alumni').map(toOrbit));

    // Alumni list, enriched with a sobriety milestone for anyone who
    // turned on time-sober tracking AND opted to share it (the viewer
    // always sees their own, shared or not). Shows in the orbit hover
    // tooltip + the online-today list.
    const alumniList = filtered.filter((u) => u.user_kind === 'alumni').map(toOrbit);
    const alumniIds = alumniList.map((u) => u.id);
    if (alumniIds.length > 0) {
      const { data: profs } = await supabase
        .from('alumni_profiles')
        .select('user_id, track_sobriety, sobriety_public, sobriety_date')
        .in('user_id', alumniIds);
      const labelById = new Map<string, string>();
      for (const p of (profs ?? []) as Array<{ user_id: string; track_sobriety: boolean; sobriety_public: boolean; sobriety_date: string | null }>) {
        if (!p.track_sobriety || !p.sobriety_date) continue;
        const sharable = p.sobriety_public || p.user_id === user?.id;
        if (!sharable) continue;
        const label = soberMilestoneLabel(p.sobriety_date);
        if (label) labelById.set(p.user_id, label);
      }
      setAlumni(alumniList.map((o) => ({ ...o, sobriety_label: labelById.get(o.id) ?? null })));
    } else {
      setAlumni(alumniList);
    }

    const horseRows = await db({
      action: 'select',
      table: 'horses',
      select: 'id, name, image_url, works_in',
      order: { column: 'name', ascending: true },
    }).catch(() => []);
    if (Array.isArray(horseRows)) setHorses(horseRows as DbHorse[]);
  }, [session?.access_token, user?.id]);
  useEffect(() => { void load(); }, [load]);

  const pathLabel = useCallback(() => null, []);
  const firstName = (user?.email ? user.email.split('@')[0] : '').replace(/\.|_/g, ' ');

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-5xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-8 lg:mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Alumni portal</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Welcome back{firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="mt-1 text-sm text-foreground/65 max-w-2xl">
          The folks orbiting below are everyone who signed into Seven Arrows today — alumni on the outer ring,
          staff in the middle, the herd in the center. Use the sidebar to jump to the map, peer-support list,
          meetups, and the rest of the portal.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90"
          >
            ✎ Edit my alumni profile
          </button>
        </div>
      </header>

      {/* Personal time-sober tracker — toggle on, set a start date,
          watch it climb, and check in daily. Private unless the alum
          opts to share their milestone. */}
      <TimeSoberCard />

      {/* Weekly alumni meeting · the recurring Zoom that drives the
          peer-support list updates. Recurring, so it doesn't live in
          /meetups (those are one-off events). Join link, meeting id,
          and passcode are surfaced inline so an alum can tap-to-join
          from a phone without bouncing through a calendar invite. */}
      <AlumniMeetingCard />

      {/* Today's orbit · alumni outer ring + staff middle + horses
          inner. Reuses the same HomeOnlineOrbit component the staff
          dashboard mounts on /app, so behavior + animations stay in
          lockstep across the two surfaces. */}
      <div className="flex justify-center px-2">
        <div className="w-full max-w-2xl">
          <HomeOnlineOrbit
            users={staff}
            alumni={alumni}
            horses={horses}
            pathLabelFor={pathLabel}
            highlightUserId={null}
          />
        </div>
      </div>

      {/* List view of who's online today — alumni first (peers), then
          the 7A team. Mirrors the orbit's data but reads as a roster
          you can scan, which the circular layout can't. */}
      <OnlineList alumni={alumni} staff={staff} currentUserId={user?.id ?? null} />

      {editorOpen && (
        <AlumniProfileEditor onClose={() => setEditorOpen(false)} />
      )}
    </div>
  );
}

// Two-section online-today roster. Alumni on top (these are the
// viewer's peers), then the Seven Arrows team. Each section hides
// itself when empty so a quiet day doesn't show two empty headers.
function OnlineList({
  alumni,
  staff,
  currentUserId,
}: {
  alumni: OrbitUser[];
  staff: OrbitUser[];
  currentUserId: string | null;
}) {
  if (alumni.length === 0 && staff.length === 0) return null;
  return (
    <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <OnlineSection
        label="Alumni online today"
        emptyHint="No other alumni have signed in yet today."
        people={alumni}
        currentUserId={currentUserId}
        accent="primary"
      />
      <OnlineSection
        label="Team online today"
        emptyHint="No Seven Arrows staff have signed in yet today."
        people={staff}
        currentUserId={currentUserId}
        accent="emerald"
      />
    </div>
  );
}

function OnlineSection({
  label,
  emptyHint,
  people,
  currentUserId,
  accent,
}: {
  label: string;
  emptyHint: string;
  people: OrbitUser[];
  currentUserId: string | null;
  accent: 'primary' | 'emerald';
}) {
  // "Online now" = seen in the last 5 minutes; otherwise they signed
  // in earlier today. Sort online-first, then most-recently-seen.
  const ONLINE_MS = 5 * 60 * 1000;
  const now = Date.now();
  const isOnline = (u: OrbitUser) => {
    const t = u.last_seen_at ? Date.parse(u.last_seen_at) : NaN;
    return Number.isFinite(t) && now - t <= ONLINE_MS;
  };
  const sorted = [...people].sort((a, b) => {
    const ao = isOnline(a) ? 1 : 0;
    const bo = isOnline(b) ? 1 : 0;
    if (ao !== bo) return bo - ao;
    const at = a.last_seen_at ? Date.parse(a.last_seen_at) : 0;
    const bt = b.last_seen_at ? Date.parse(b.last_seen_at) : 0;
    return bt - at;
  });
  const dotOn = accent === 'primary' ? 'bg-primary' : 'bg-emerald-500';
  const ring = accent === 'primary' ? 'ring-primary/30' : 'ring-emerald-500/30';

  return (
    <section className="rounded-2xl border border-black/10 bg-white overflow-hidden">
      <header className="px-4 py-3 border-b border-black/5 flex items-baseline justify-between">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">{label}</p>
        <span className="text-[11px] text-foreground/45 tabular-nums">{people.length}</span>
      </header>
      {sorted.length === 0 ? (
        <p className="px-4 py-6 text-[12.5px] text-foreground/45 italic text-center">{emptyHint}</p>
      ) : (
        <ul className="divide-y divide-black/5 max-h-[420px] overflow-y-auto">
          {sorted.map((p) => {
            const online = isOnline(p);
            const initial = (p.full_name || '?').charAt(0).toUpperCase();
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="relative shrink-0">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt="" referrerPolicy="no-referrer" className={`w-9 h-9 rounded-full object-cover ring-1 ${online ? ring : 'ring-black/10'}`} />
                  ) : (
                    <span aria-hidden className={`w-9 h-9 rounded-full bg-warm-bg text-foreground/60 text-[12px] font-bold inline-flex items-center justify-center ring-1 ${online ? ring : 'ring-black/10'}`}>{initial}</span>
                  )}
                  {online && (
                    <span aria-hidden className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${dotOn} ring-2 ring-white animate-pulse`} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-foreground truncate">
                    {p.full_name || 'Member'}
                    {p.id === currentUserId && <span className="ml-1.5 text-[10.5px] font-normal text-foreground/40">(you)</span>}
                  </p>
                  {p.job_title && <p className="text-[11px] text-foreground/50 truncate">{p.job_title}</p>}
                </div>
                <span className={`shrink-0 text-[11px] font-medium ${online ? (accent === 'primary' ? 'text-primary' : 'text-emerald-600') : 'text-foreground/40'}`}>
                  {online ? 'Online now' : signedInLabel(p.last_sign_in)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// Short "Xh/Xm ago" label for someone who's signed in today but isn't
// currently online.
function signedInLabel(iso: string | null): string {
  if (!iso) return 'today';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 'today';
  const m = Math.round((Date.now() - t) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

// Weekly alumni meeting card. Standing Zoom (recurring, so it doesn't
// belong on /meetups which is for one-off events). Tap the join
// button to open Zoom — falls back to the web client if the native
// app isn't installed. The meeting ID + passcode are shown plaintext
// so an alum can dial in by hand if the deep-link bounces.
//
// Values are hard-coded today; if the meeting moves we'll lift them
// into an app_settings row keyed by 'alumni.weekly_meeting' so an
// admin can edit without a code deploy.
const ALUMNI_MEETING = {
  meetingId: '291-295-6173',
  passcode: '1234',
  // zoom.us deep-link. Numeric id with hyphens stripped is the
  // canonical /j/ format; the pwd param uses the plain passcode
  // (Zoom accepts both the plain string and the encoded hash).
  joinUrl: 'https://us02web.zoom.us/j/2912956173?pwd=1234',
};

function AlumniMeetingCard() {
  const idCompact = ALUMNI_MEETING.meetingId.replace(/-/g, '');
  return (
    <section
      className="mb-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-warm-bg/40 to-white p-5 sm:p-6"
      aria-label="Weekly alumni meeting"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">
            Weekly alumni meeting · recurring
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Join us on Zoom.
          </h2>
          <p className="mt-1 text-sm text-foreground/65 max-w-xl">
            <span className="font-semibold text-foreground/80">Mondays · 6:00 PM MST (Arizona).</span> Pop in for fellowship, updates, and the live update to the peer-support list.
          </p>
        </div>
        <a
          href={ALUMNI_MEETING.joinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-primary text-white text-[12.5px] font-semibold uppercase tracking-wider hover:bg-primary/90 shadow-[0_8px_22px_-12px_rgba(188,107,74,0.6)]"
          title="Open the Zoom join link in a new tab"
        >
          <span aria-hidden>🎥</span> Join Zoom
        </a>
      </div>

      <MeetingCountdown />

      <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px]">
        <CopyableField label="Meeting ID" value={ALUMNI_MEETING.meetingId} copyValue={idCompact} />
        <CopyableField label="Passcode" value={ALUMNI_MEETING.passcode} copyValue={ALUMNI_MEETING.passcode} />
      </dl>
    </section>
  );
}

// Next-Monday-6pm-MST instant. Phoenix is UTC−7 year-round (no DST),
// so we shift into a "fake UTC = Phoenix wall-clock" space, do the
// weekday/hour arithmetic there, then shift back by the fixed 7h.
// Recomputed on every tick, so the moment the meeting time passes the
// countdown automatically rolls to next week — no manual reset.
function nextMeetingInstant(nowMs: number): number {
  const PHX_OFFSET_MS = 7 * 60 * 60 * 1000;
  // Treat the shifted Date's UTC fields as Phoenix wall-clock fields.
  const phx = new Date(nowMs - PHX_OFFSET_MS);
  const target = new Date(phx);
  const daysUntilMon = (1 - target.getUTCDay() + 7) % 7; // 0=Sun,1=Mon
  target.setUTCDate(target.getUTCDate() + daysUntilMon);
  target.setUTCHours(18, 0, 0, 0); // 6:00 PM Phoenix wall-clock
  // If we've already passed this week's slot, jump to next Monday.
  if (target.getTime() <= phx.getTime()) target.setUTCDate(target.getUTCDate() + 7);
  // Shift the Phoenix wall-clock instant back to a real UTC timestamp.
  return target.getTime() + PHX_OFFSET_MS;
}

// Live countdown to the weekly meeting. Mounts client-side only
// (remaining starts null) to avoid a hydration mismatch, then ticks
// every second.
function MeetingCountdown() {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const target = nextMeetingInstant(now);
      const diff = target - now;
      // The meeting runs ~60 min; show a "happening now" state for the
      // first hour after the start instead of immediately counting to
      // next week.
      const justStarted = nextMeetingInstant(now - 60 * 60 * 1000) !== target;
      setIsLive(justStarted);
      setRemainingMs(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (remainingMs == null) {
    // Pre-hydration placeholder — same height so the card doesn't jump.
    return <div className="mt-4 h-[58px] rounded-xl bg-white/50 border border-primary/15 animate-pulse" aria-hidden />;
  }

  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="mt-4 rounded-xl border border-primary/25 bg-white/70 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.24em] text-primary/70">
          {isLive ? 'Happening now' : 'Next meeting in'}
        </p>
        {isLive ? (
          <p className="mt-0.5 text-[15px] font-bold text-emerald-700" style={{ fontFamily: 'var(--font-display)' }}>
            🟢 Live now — jump in
          </p>
        ) : (
          <p className="mt-0.5 flex items-baseline gap-1.5 tabular-nums text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            {days > 0 && (
              <span className="text-[22px] font-bold">{days}<span className="text-[12px] font-semibold text-foreground/55 ml-0.5">d</span></span>
            )}
            <span className="text-[22px] font-bold">{pad(hours)}<span className="text-[12px] font-semibold text-foreground/55 ml-0.5">h</span></span>
            <span className="text-[22px] font-bold">{pad(mins)}<span className="text-[12px] font-semibold text-foreground/55 ml-0.5">m</span></span>
            <span className="text-[22px] font-bold">{pad(secs)}<span className="text-[12px] font-semibold text-foreground/55 ml-0.5">s</span></span>
          </p>
        )}
      </div>
      <p className="text-[11px] text-foreground/50 shrink-0">Mondays · 6:00 PM MST</p>
    </div>
  );
}

// Small inline component for the meeting ID + passcode rows so each
// has its own copy button. Copies the digits-only version of the
// value so paste-into-Zoom works without the hyphens.
function CopyableField({ label, value, copyValue }: { label: string; value: string; copyValue: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-black/10 bg-white/80 px-3 py-2.5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-foreground/45">{label}</p>
        <p className="mt-0.5 text-[14px] font-semibold text-foreground tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(copyValue).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          });
        }}
        className="shrink-0 text-[10.5px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/5"
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}
