'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { REUNION_EVENT as EVENT } from './event';

// The Reunion at the Ranch — a Partiful-style event page for alumni.
// Hero (title / dates / location) → live countdown → RSVP buttons with
// a guest list → the planning surveys. RSVPs persist to reunion_rsvps
// via /api/alumni/reunion-rsvp. Event constants live in ./event so the
// home teaser stays in sync.

const SURVEYS = [
  {
    title: 'Pre-Planning Survey',
    blurb: 'Currently in circulation — helps inform the event schedule, lodging needs, and overall logistics planning.',
    href: 'https://forms.gle/xaKU5gFwE63nsVKMA',
    tone: 'live' as const,
  },
  {
    title: 'RSVP Survey',
    blurb: 'Last year’s version, for reference.',
    href: 'https://forms.gle/mUrVAp5Ehpp5qrEp7',
    tone: 'ref' as const,
  },
  {
    title: 'Post-Event Feedback Survey',
    blurb: 'Last year’s version, for reference.',
    href: 'https://forms.gle/wWmPNDhJ2UY44eWE6',
    tone: 'ref' as const,
  },
];

type RsvpStatus = 'going' | 'maybe' | 'not_going';
interface Guest { userId: string; name: string | null; avatarUrl: string | null; status: string }

const RSVP_OPTIONS: { key: RsvpStatus; label: string; emoji: string; activeClass: string }[] = [
  { key: 'going', label: "I'm in", emoji: '🎉', activeClass: 'bg-emerald-600 border-emerald-600 text-white' },
  { key: 'maybe', label: 'Maybe', emoji: '🤔', activeClass: 'bg-amber-500 border-amber-500 text-white' },
  { key: 'not_going', label: "I can't make it", emoji: '😔', activeClass: 'bg-foreground border-foreground text-white' },
];

export default function ReunionContent() {
  const { session } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ going: 0, maybe: 0, not_going: 0 });
  const [myStatus, setMyStatus] = useState<RsvpStatus | null>(null);
  const [saving, setSaving] = useState<RsvpStatus | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    const res = await fetch('/api/alumni/reunion-rsvp', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setGuests((json.guests ?? []) as Guest[]);
      setCounts((json.counts ?? {}) as Record<string, number>);
      setMyStatus((json.myStatus ?? null) as RsvpStatus | null);
    }
  }, [session?.access_token]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const rsvp = useCallback(async (status: RsvpStatus) => {
    if (!session?.access_token) return;
    setSaving(status);
    // Optimistic.
    setMyStatus(status);
    try {
      await fetch('/api/alumni/reunion-rsvp', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ status }),
      });
      await load();
    } finally {
      setSaving(null);
    }
  }, [session?.access_token, load]);

  const countdown = useMemo(() => {
    const diff = EVENT.startsAtMs - now;
    if (diff <= 0) return null; // event has started/passed
    const totalSec = Math.floor(diff / 1000);
    return {
      days: Math.floor(totalSec / 86400),
      hours: Math.floor((totalSec % 86400) / 3600),
      mins: Math.floor((totalSec % 3600) / 60),
      secs: totalSec % 60,
    };
  }, [now]);

  const going = guests.filter((g) => g.status === 'going');
  const maybe = guests.filter((g) => g.status === 'maybe');

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/feather/alumni" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Alumni hub</Link>

      {/* Hero */}
      <section className="mt-3 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/12 via-warm-bg/40 to-white p-6 sm:p-8 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-2">Next event</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          {EVENT.title}
        </h1>
        <p className="mt-2 text-[15px] text-foreground/70">
          <span className="font-semibold text-foreground">{EVENT.dateLabel}</span>
          <span className="mx-2 text-foreground/30">·</span>
          📍 {EVENT.location}
        </p>

        {/* Three-day chips */}
        <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
          {EVENT.days.map((d) => (
            <span key={d} className="px-3 py-1.5 rounded-full border border-primary/25 bg-white/70 text-[12px] font-semibold text-foreground/75">
              {d}
            </span>
          ))}
        </div>

        {/* Countdown */}
        <div className="mt-6">
          {countdown ? (
            <div className="inline-flex items-end gap-3 sm:gap-5">
              <CountUnit value={countdown.days} label="days" />
              <CountUnit value={countdown.hours} label="hrs" pad />
              <CountUnit value={countdown.mins} label="min" pad />
              <CountUnit value={countdown.secs} label="sec" pad />
            </div>
          ) : (
            <p className="text-lg font-bold text-emerald-700">🎉 It’s here — see you at the ranch!</p>
          )}
        </div>
      </section>

      {/* RSVP */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/50 mb-1">Are you coming?</p>
        <h2 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          {myStatus ? "You can change your answer anytime." : 'Let us know.'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {RSVP_OPTIONS.map((opt) => {
            const active = myStatus === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => rsvp(opt.key)}
                disabled={saving !== null}
                aria-pressed={active}
                className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-[13.5px] font-semibold transition-all disabled:opacity-60 ${
                  active ? opt.activeClass : 'border-black/12 bg-white text-foreground/75 hover:border-black/30'
                }`}
              >
                <span aria-hidden className="text-[16px]">{opt.emoji}</span>
                {saving === opt.key ? 'Saving…' : opt.label}
              </button>
            );
          })}
        </div>

        {/* Counts */}
        <div className="mt-4 flex items-center gap-4 text-[12.5px] text-foreground/60 flex-wrap">
          <span><strong className="text-emerald-700">{counts.going ?? 0}</strong> in</span>
          <span><strong className="text-amber-600">{counts.maybe ?? 0}</strong> maybe</span>
          <span><strong className="text-foreground/70">{counts.not_going ?? 0}</strong> can’t make it</span>
        </div>

        {/* Guest list — avatars of who's in + maybe. */}
        {(going.length > 0 || maybe.length > 0) && (
          <div className="mt-4 pt-4 border-t border-black/5 space-y-3">
            {going.length > 0 && <GuestRow label="Going" people={going} accent="text-emerald-700" />}
            {maybe.length > 0 && <GuestRow label="Maybe" people={maybe} accent="text-amber-600" />}
          </div>
        )}
      </section>

      {/* Surveys */}
      <section className="mt-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/50 mb-2">Surveys</p>
        <div className="space-y-2.5">
          {SURVEYS.map((s) => (
            <a
              key={s.href}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between gap-3 rounded-2xl border border-black/10 bg-white p-4 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-foreground flex items-center gap-2">
                  {s.title}
                  {s.tone === 'live' ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9.5px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> In circulation
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-full bg-foreground/[0.06] text-foreground/50 text-[9.5px] font-bold uppercase tracking-wider">Reference</span>
                  )}
                </p>
                <p className="mt-0.5 text-[12.5px] text-foreground/60">{s.blurb}</p>
              </div>
              <span aria-hidden className="shrink-0 mt-1 text-primary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H8M17 7v9" />
                </svg>
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function CountUnit({ value, label, pad }: { value: number; label: string; pad?: boolean }) {
  const text = pad ? String(value).padStart(2, '0') : String(value);
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl sm:text-5xl font-bold text-foreground tabular-nums leading-none" style={{ fontFamily: 'var(--font-display)' }}>
        {text}
      </span>
      <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/45">{label}</span>
    </div>
  );
}

function GuestRow({ label, people, accent }: { label: string; people: Guest[]; accent: string }) {
  return (
    <div>
      <p className={`text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5 ${accent}`}>
        {label} · {people.length}
      </p>
      <div className="flex flex-wrap gap-2">
        {people.map((g) => (
          // Pills navigate to the per-alumnus profile page. Discovery
          // for individual profiles flows through these chips, the
          // alumni "Online today" list, and (eventually) the map pin
          // popup — there's no top-level sidebar entry per alumnus.
          <Link
            key={g.userId}
            href={`/feather/alumni/u/${g.userId}`}
            className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-warm-bg/60 border border-black/5 hover:bg-warm-bg hover:border-primary/30 transition-colors"
          >
            {g.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <span aria-hidden className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold inline-flex items-center justify-center">
                {(g.name || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <span className="text-[12px] font-medium text-foreground/75 max-w-[140px] truncate">{g.name || 'Alum'}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
