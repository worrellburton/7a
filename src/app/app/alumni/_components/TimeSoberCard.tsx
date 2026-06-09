'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { useModal } from '@/lib/ModalProvider';

// Time-sober card. Self-contained: reads + writes the viewer's own
// alumni_profiles row. A master toggle turns the feature on/off; when
// on, the alum picks a start date and gets a live counter, milestone
// chips, and a daily "Check in" button that builds a check-in streak
// (the days-sober counter itself stays anchored to the start date —
// check-in never resets it). A gently-worded "Reset my date" link
// handles restarts. An opt-in sub-toggle shares the milestone on the
// alum's profile + map pin.
//
// Phoenix (UTC-7, no DST) is the day boundary everywhere so the
// counter + streak line up with the rest of the app.

interface SoberProfile {
  track_sobriety: boolean;
  sobriety_date: string | null;
  last_check_in_at: string | null;
  check_in_streak: number;
  sobriety_public: boolean;
}

const PHX_OFFSET_MS = 7 * 60 * 60 * 1000;

function phoenixDayIndex(ms: number): number {
  return Math.floor((ms - PHX_OFFSET_MS) / 86_400_000);
}

// Anchor instant = Phoenix midnight of the sobriety start date.
function anchorMs(date: string): number | null {
  const t = Date.parse(`${date}T00:00:00-07:00`);
  return Number.isFinite(t) ? t : null;
}

// Calendar Y/M/D between two instants, in Phoenix-local civil terms.
function ymd(fromMs: number, toMs: number) {
  const f = new Date(fromMs - PHX_OFFSET_MS);
  const t = new Date(toMs - PHX_OFFSET_MS);
  let years = t.getUTCFullYear() - f.getUTCFullYear();
  let months = t.getUTCMonth() - f.getUTCMonth();
  let days = t.getUTCDate() - f.getUTCDate();
  if (days < 0) {
    months -= 1;
    const prevMonthLen = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 0)).getUTCDate();
    days += prevMonthLen;
  }
  if (months < 0) { years -= 1; months += 12; }
  return { years, months, days };
}

const BASE_MILESTONES: { days: number; label: string }[] = [
  { days: 1, label: '24 hours' },
  { days: 7, label: '1 week' },
  { days: 30, label: '30 days' },
  { days: 60, label: '60 days' },
  { days: 90, label: '90 days' },
  { days: 180, label: '6 months' },
  { days: 270, label: '9 months' },
  { days: 365, label: '1 year' },
];

function milestoneInfo(totalDays: number) {
  const list = [...BASE_MILESTONES];
  const maxYears = Math.floor(totalDays / 365) + 2;
  for (let y = 2; y <= maxYears; y += 1) list.push({ days: 365 * y, label: `${y} years` });
  list.sort((a, b) => a.days - b.days);
  let current: { days: number; label: string } | null = null;
  let next: { days: number; label: string } | null = null;
  for (const m of list) {
    if (m.days <= totalDays) current = m;
    else { next = m; break; }
  }
  return { current, next };
}

// Public milestone label for the share line ("2 years sober" / "94 days
// sober"). Coarser than the live counter on purpose.
export function soberMilestoneLabel(sobrietyDate: string | null, nowMs = Date.now()): string | null {
  if (!sobrietyDate) return null;
  const anchor = anchorMs(sobrietyDate);
  if (anchor == null || anchor > nowMs) return null;
  const totalDays = Math.floor((nowMs - anchor) / 86_400_000);
  const { years, months } = ymd(anchor, nowMs);
  if (years >= 1) return `${years} year${years === 1 ? '' : 's'} sober`;
  if (months >= 1) return `${months} month${months === 1 ? '' : 's'} sober`;
  return `${totalDays} day${totalDays === 1 ? '' : 's'} sober`;
}

export default function TimeSoberCard() {
  const { user, session } = useAuth();
  const modal = useModal();
  const [profile, setProfile] = useState<SoberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dateDraft, setDateDraft] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('alumni_profiles')
      .select('track_sobriety, sobriety_date, last_check_in_at, check_in_streak, sobriety_public')
      .eq('user_id', user.id)
      .maybeSingle();
    setProfile(
      data
        ? {
            track_sobriety: !!data.track_sobriety,
            sobriety_date: (data.sobriety_date as string | null) ?? null,
            last_check_in_at: (data.last_check_in_at as string | null) ?? null,
            check_in_streak: (data.check_in_streak as number | null) ?? 0,
            sobriety_public: !!data.sobriety_public,
          }
        : { track_sobriety: false, sobriety_date: null, last_check_in_at: null, check_in_streak: 0, sobriety_public: false },
    );
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  // Tick once a second so the HH:MM:SS clock + counter stay live.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const upsert = useCallback(async (patch: Partial<SoberProfile> & Record<string, unknown>) => {
    if (!user?.id) return;
    setBusy(true);
    setProfile((p) => (p ? { ...p, ...patch } as SoberProfile : p));
    await supabase.from('alumni_profiles').upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' });
    setBusy(false);
    void load();
  }, [user?.id, load]);

  const checkIn = useCallback(async (reset: boolean) => {
    if (!session?.access_token) return;
    if (reset) {
      const ok = await modal.confirm('Reset your sober date to today?', {
        message: 'Recovery isn’t linear — a reset is a fresh start, not a failure. Your check-in streak keeps going.',
        confirmLabel: 'Reset to today',
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/alumni/check-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ reset }),
      });
      if (res.ok) await load();
    } finally {
      setBusy(false);
    }
  }, [session?.access_token, load, modal]);

  const anchor = profile?.sobriety_date ? anchorMs(profile.sobriety_date) : null;
  const counter = useMemo(() => {
    if (anchor == null || anchor > now) return null;
    const totalMs = now - anchor;
    const totalDays = Math.floor(totalMs / 86_400_000);
    const remMs = totalMs % 86_400_000;
    const hh = Math.floor(remMs / 3_600_000);
    const mm = Math.floor((remMs % 3_600_000) / 60_000);
    const ss = Math.floor((remMs % 60_000) / 1000);
    const breakdown = ymd(anchor, now);
    const { current, next } = milestoneInfo(totalDays);
    const nextProgress = next && current
      ? Math.min(100, Math.round(((totalDays - current.days) / (next.days - current.days)) * 100))
      : next ? Math.min(100, Math.round((totalDays / next.days) * 100)) : 100;
    const daysToNext = next ? next.days - totalDays : 0;
    return { totalDays, hh, mm, ss, breakdown, current, next, nextProgress, daysToNext };
  }, [anchor, now]);

  const checkedInToday = useMemo(() => {
    if (!profile?.last_check_in_at) return false;
    const t = Date.parse(profile.last_check_in_at);
    return Number.isFinite(t) && phoenixDayIndex(t) === phoenixDayIndex(now);
  }, [profile?.last_check_in_at, now]);

  if (loading || !profile) {
    return <div className="mb-8 h-[120px] rounded-2xl border border-emerald-100 bg-white/60 animate-pulse" aria-hidden />;
  }

  // ── OFF state ────────────────────────────────────────────────────
  if (!profile.track_sobriety) {
    return (
      <section className="mb-8 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-white p-5 sm:p-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-700 mb-1">Time sober</p>
          <h2 className="text-lg sm:text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Track your sober time.
          </h2>
          <p className="mt-1 text-sm text-foreground/65 max-w-md">
            Turn it on, set the day you got clean, and watch it grow. Check in daily to keep a streak. Private unless you choose to share.
          </p>
        </div>
        <button
          type="button"
          onClick={() => upsert({ track_sobriety: true })}
          disabled={busy}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-emerald-600 text-white text-[12.5px] font-semibold uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50"
        >
          Turn on
        </button>
      </section>
    );
  }

  // ── ON, no date yet ──────────────────────────────────────────────
  if (!profile.sobriety_date) {
    return (
      <section className="mb-8 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-700 mb-1">Time sober</p>
            <h2 className="text-lg sm:text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              When did you get clean?
            </h2>
            <p className="mt-1 text-sm text-foreground/65">Pick your start date — you can change it anytime.</p>
          </div>
          <FeatureToggle on onChange={(v) => upsert({ track_sobriety: v })} disabled={busy} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={dateDraft}
            onChange={(e) => setDateDraft(e.target.value)}
            className="rounded-md border border-black/15 bg-white px-3 py-2 text-[13px]"
          />
          <button
            type="button"
            onClick={() => dateDraft && upsert({ sobriety_date: dateDraft })}
            disabled={busy || !dateDraft}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white text-[12.5px] font-semibold uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50"
          >
            Start counting
          </button>
        </div>
      </section>
    );
  }

  // ── ON, counting ─────────────────────────────────────────────────
  const pad = (n: number) => String(n).padStart(2, '0');
  const b = counter?.breakdown;
  return (
    <section className="mb-8 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-white p-5 sm:p-6 overflow-hidden">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-700 mb-1">Time sober</p>
          {counter ? (
            <>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-none tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
                {counter.totalDays.toLocaleString()} <span className="text-xl sm:text-2xl font-semibold text-foreground/60">days</span>
              </h2>
              {b && (
                <p className="mt-1.5 text-[13px] text-foreground/70">
                  {b.years > 0 && <strong>{b.years} year{b.years === 1 ? '' : 's'} </strong>}
                  {(b.years > 0 || b.months > 0) && <strong>{b.months} month{b.months === 1 ? '' : 's'} </strong>}
                  <strong>{b.days} day{b.days === 1 ? '' : 's'}</strong>
                  <span className="mx-2 text-foreground/30">·</span>
                  <span className="tabular-nums text-emerald-700 font-semibold">{pad(counter.hh)}:{pad(counter.mm)}:{pad(counter.ss)}</span>
                </p>
              )}
            </>
          ) : (
            <h2 className="text-lg font-bold text-foreground">Start date is in the future — adjust it below.</h2>
          )}
        </div>
        <FeatureToggle on onChange={(v) => upsert({ track_sobriety: v })} disabled={busy} />
      </div>

      {/* Milestone + next-milestone progress. */}
      {counter?.current && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
            🏅 {counter.current.label}
          </span>
          {counter.next && (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="relative h-1.5 flex-1 min-w-[80px] max-w-[260px] rounded-full bg-emerald-100 overflow-hidden">
                <span className="absolute inset-y-0 left-0 rounded-full bg-emerald-500" style={{ width: `${counter.nextProgress}%` }} />
              </div>
              <span className="text-[11px] text-foreground/55 whitespace-nowrap">
                {counter.daysToNext} day{counter.daysToNext === 1 ? '' : 's'} to {counter.next.label}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Check-in row. */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => checkIn(false)}
          disabled={busy || checkedInToday}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-[12.5px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-60 ${
            checkedInToday
              ? 'bg-emerald-100 text-emerald-800 cursor-default'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {checkedInToday ? '✓ Checked in today' : 'Check in'}
        </button>
        {profile.check_in_streak > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-700">
            🔥 {profile.check_in_streak}-day check-in streak
          </span>
        )}
        <button
          type="button"
          onClick={() => checkIn(true)}
          disabled={busy}
          className="ml-auto text-[11.5px] text-foreground/45 hover:text-foreground/70 underline decoration-dotted disabled:opacity-50"
          title="Recovery isn't linear — reset your date to today."
        >
          Reset my date
        </button>
      </div>

      {/* Share opt-in. */}
      <label className="mt-4 pt-3 border-t border-emerald-100 flex items-center gap-2.5 cursor-pointer select-none">
        <span className="relative inline-block w-9 h-5 shrink-0">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={profile.sobriety_public}
            disabled={busy}
            onChange={(e) => upsert({ sobriety_public: e.target.checked })}
          />
          <span className="absolute inset-0 rounded-full bg-gray-200 peer-checked:bg-emerald-500 transition-colors" />
          <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
        </span>
        <span className="text-[12px] text-foreground/65">
          Show my milestone {soberMilestoneLabel(profile.sobriety_date) ? <>(<strong className="text-emerald-700">{soberMilestoneLabel(profile.sobriety_date)}</strong>)</> : null} on my profile + map pin so other alumni can celebrate with me.
        </span>
      </label>
    </section>
  );
}

// Small reusable on/off switch for the feature master toggle.
function FeatureToggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/45">{on ? 'On' : 'Off'}</span>
      <span className="relative inline-block w-9 h-5">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={on}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="absolute inset-0 rounded-full bg-gray-200 peer-checked:bg-emerald-500 transition-colors" />
        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}
