'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  PHOENIX_TZ,
  type PhoneShiftEvent,
  type AircallAgent,
  availabilityStyle,
  formatShiftTime,
  phoenixToday,
  phoenixMinutesNow,
  hhmmToMinutes,
  shiftContainsMinute,
} from './_shared';

// Phone-operator schedule header. Reads the "phones" rota straight from
// calendar_events (the same source the Calendar page's Phones view
// writes) and overlays each operator's *live* Aircall availability,
// matched by email. Answers, at a glance: who's on the phones right now,
// who's up next, and today's full rotation.

interface UserLite { id: string; email: string | null; avatar_url: string | null; full_name: string | null; }

const DAYS_AHEAD = 6;

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

function dayLabel(dateStr: string): string {
  // dateStr is YYYY-MM-DD (Phoenix-local calendar day).
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function OperatorSchedule({ token }: { token: string | null }) {
  const [events, setEvents] = useState<PhoneShiftEvent[]>([]);
  const [users, setUsers] = useState<Record<string, UserLite>>({});
  const [agents, setAgents] = useState<AircallAgent[]>([]);
  const [aircallConfigured, setAircallConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  // Recomputed on a timer so "now" / "up next" stay honest as time passes.
  const [nowMin, setNowMin] = useState<number>(() => phoenixMinutesNow());
  const today = phoenixToday();

  // Load the phones rota for today + the next several days.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const end = (() => {
        const [y, m, d] = today.split('-').map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d + DAYS_AHEAD, 12));
        return dt.toISOString().slice(0, 10);
      })();
      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, event_date, start_time, end_time, subject_id, title, color')
        .eq('category', 'phones')
        .gte('event_date', today)
        .lte('event_date', end)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (cancelled) return;
      if (error) {
        // Degrade gracefully — the rest of the Calls page still works.
        console.warn('[OperatorSchedule] calendar_events read failed:', error.message);
        setEvents([]);
      } else {
        setEvents((data ?? []) as PhoneShiftEvent[]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [today]);

  // Resolve operator emails (for availability matching) + avatars.
  useEffect(() => {
    const ids = Array.from(new Set(events.map((e) => e.subject_id).filter(Boolean))) as string[];
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('id, email, avatar_url, full_name')
        .in('id', ids);
      if (cancelled || !data) return;
      const map: Record<string, UserLite> = {};
      for (const u of data as UserLite[]) map[u.id] = u;
      setUsers(map);
    })();
    return () => { cancelled = true; };
  }, [events]);

  // Live Aircall availability, refreshed periodically.
  const loadAvailability = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/aircall/availability', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setAircallConfigured(json.configured !== false);
      setAgents(Array.isArray(json.users) ? json.users : []);
    } catch {
      /* leave previous state; schedule still renders without badges */
    }
  }, [token]);

  useEffect(() => { loadAvailability(); }, [loadAvailability]);
  useEffect(() => {
    const id = setInterval(() => {
      setNowMin(phoenixMinutesNow());
      loadAvailability();
    }, 30_000);
    return () => clearInterval(id);
  }, [loadAvailability]);

  const agentByEmail = useMemo(() => {
    const m: Record<string, AircallAgent> = {};
    for (const a of agents) if (a.email) m[a.email.toLowerCase()] = a;
    return m;
  }, [agents]);

  const todaysEvents = useMemo(
    () => events.filter((e) => e.event_date === today),
    [events, today],
  );

  const onNow = useMemo(
    () => todaysEvents.filter((e) => shiftContainsMinute(e.start_time, e.end_time, nowMin)),
    [todaysEvents, nowMin],
  );

  // Up next: the soonest shift starting later today, else the first shift
  // on the next day that has any.
  const upNext = useMemo(() => {
    const laterToday = todaysEvents
      .filter((e) => (hhmmToMinutes(e.start_time) ?? -1) > nowMin)
      .sort((a, b) => (hhmmToMinutes(a.start_time) ?? 0) - (hhmmToMinutes(b.start_time) ?? 0));
    if (laterToday.length) return { event: laterToday[0], day: today };
    const futureDays = events.filter((e) => e.event_date > today);
    if (futureDays.length) return { event: futureDays[0], day: futureDays[0].event_date };
    return null;
  }, [todaysEvents, events, today, nowMin]);

  const renderAvatar = (ev: PhoneShiftEvent, size = 'h-9 w-9') => {
    const u = ev.subject_id ? users[ev.subject_id] : undefined;
    const color = ev.color ?? '#6b7280';
    if (u?.avatar_url) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={u.avatar_url} alt={ev.title ?? ''} className={`${size} rounded-full object-cover ring-2 ring-white shadow-sm`} />;
    }
    return (
      <div className={`${size} rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm`} style={{ backgroundColor: color }}>
        {initials(ev.title)}
      </div>
    );
  };

  const availabilityFor = (ev: PhoneShiftEvent): AircallAgent | undefined => {
    const u = ev.subject_id ? users[ev.subject_id] : undefined;
    const email = u?.email?.toLowerCase();
    return email ? agentByEmail[email] : undefined;
  };

  const asOf = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: PHOENIX_TZ });

  return (
    <section className="relative rounded-3xl border border-white/70 bg-white/55 supports-[backdrop-filter]:bg-white/40 backdrop-blur-2xl shadow-[0_18px_48px_-22px_rgba(60,48,42,0.32)] mb-5 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
      <div className="px-5 sm:px-7 py-4 sm:py-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Phone operators
            </h2>
          </div>
          <span className="text-[11px] font-medium text-foreground/45 tabular-nums">as of {asOf} MST</span>
        </div>

        {loading ? (
          <div className="h-16 rounded-2xl bg-foreground/5 animate-pulse" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            {/* On the phones now */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40 mb-2">On the phones now</p>
              {onNow.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-foreground/15 px-4 py-3 text-sm text-foreground/55">
                  No operator scheduled right now.
                  {upNext && (
                    <> Next up: <span className="font-semibold text-foreground/80">{upNext.event.title}</span> at {formatShiftTime(upNext.event.start_time)}{upNext.day !== today ? ` (${dayLabel(upNext.day)})` : ''}.</>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {onNow.map((ev) => {
                    const av = availabilityFor(ev);
                    const style = availabilityStyle(av?.availability_status);
                    return (
                      <div key={ev.id} className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 px-3 py-2 shadow-sm">
                        {renderAvatar(ev)}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-tight truncate">{ev.title}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-foreground/55">
                            <span className="tabular-nums">{formatShiftTime(ev.start_time)}–{formatShiftTime(ev.end_time)}</span>
                            {aircallConfigured && (
                              <>
                                <span className="text-foreground/25">·</span>
                                <span className={`inline-flex items-center gap-1 font-medium ${style.text}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                                  {style.label}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Up next + today's rota */}
            <div className="lg:border-l lg:border-foreground/10 lg:pl-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40 mb-2">
                {todaysEvents.length > 1 ? "Today's rotation" : 'Up next'}
              </p>
              {todaysEvents.length === 0 ? (
                <p className="text-sm text-foreground/50">Nothing on the phones calendar today.</p>
              ) : (
                <ol className="space-y-1.5">
                  {todaysEvents.map((ev) => {
                    const isNow = shiftContainsMinute(ev.start_time, ev.end_time, nowMin);
                    const isPast = (hhmmToMinutes(ev.end_time) ?? 24 * 60) <= nowMin && !isNow;
                    return (
                      <li key={ev.id} className={`flex items-center gap-2 text-sm ${isPast ? 'opacity-45' : ''}`}>
                        <span className="tabular-nums text-[11px] font-semibold text-foreground/50 w-20 shrink-0">
                          {formatShiftTime(ev.start_time)}–{formatShiftTime(ev.end_time)}
                        </span>
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: ev.color ?? '#9ca3af' }} />
                        <span className={`truncate ${isNow ? 'font-semibold text-foreground' : 'text-foreground/70'}`}>{ev.title}</span>
                        {isNow && <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-emerald-600">Now</span>}
                      </li>
                    );
                  })}
                </ol>
              )}
              {upNext && upNext.day !== today && (
                <p className="mt-2 text-[11px] text-foreground/45">
                  Next day on phones: <span className="font-semibold text-foreground/70">{upNext.event.title}</span>, {dayLabel(upNext.day)} at {formatShiftTime(upNext.event.start_time)}.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
