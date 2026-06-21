'use client';

// Super-admin home warning: fires when the phones calendar has no one
// scheduled for the rest of this week and/or next week, so calls don't
// go unanswered. Reads calendar_events (category='phones'), expanding
// recurring shifts the same way the Calls page's operator widget does.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const PHOENIX_TZ = 'America/Phoenix';
const VIEWMODE_STORAGE_KEY = 'sa-calendar-viewmode-v1';

type Rule = 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
interface Ev { event_date: string; repeat_rule: Rule | null }

function phoenixToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: PHOENIX_TZ });
}
function parseISO(s: string): Date { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function isoOf(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

function step(c: Date, rule: Rule): Date {
  switch (rule) {
    case 'daily': return addDays(c, 1);
    case 'weekdays': { let n = addDays(c, 1); while (n.getDay() === 0 || n.getDay() === 6) n = addDays(n, 1); return n; }
    case 'weekly': return addDays(c, 7);
    case 'biweekly': return addDays(c, 14);
    case 'monthly': { const x = new Date(c); x.setMonth(x.getMonth() + 1); return x; }
    case 'yearly': { const x = new Date(c); x.setFullYear(x.getFullYear() + 1); return x; }
  }
}

function coveredDays(events: Ev[], startISO: string, endISO: string): Set<string> {
  const out = new Set<string>();
  const end = parseISO(endISO);
  for (const ev of events) {
    if (!ev.repeat_rule) {
      if (ev.event_date >= startISO && ev.event_date <= endISO) out.add(ev.event_date);
      continue;
    }
    let cursor = parseISO(ev.event_date);
    let safety = 0;
    while (isoOf(cursor) < startISO && safety++ < 5000) cursor = step(cursor, ev.repeat_rule);
    safety = 0;
    while (cursor <= end && safety++ < 800) { out.add(isoOf(cursor)); cursor = step(cursor, ev.repeat_rule); }
  }
  return out;
}

export default function PhoneCoverageWarning() {
  const router = useRouter();
  const [gap, setGap] = useState<{ thisWeek: boolean; nextWeek: boolean } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const todayISO = phoenixToday();
      const today = parseISO(todayISO);
      // Weeks run Sun–Sat (matching the calendar's Phones view).
      const startOfThisWeek = addDays(today, -today.getDay());
      const endOfThisWeek = addDays(startOfThisWeek, 6);
      const startOfNextWeek = addDays(endOfThisWeek, 1);
      const endOfNextWeek = addDays(startOfNextWeek, 6);
      const rangeEnd = isoOf(endOfNextWeek);

      const { data, error } = await supabase
        .from('calendar_events')
        .select('event_date, repeat_rule')
        .eq('category', 'phones')
        .or(`repeat_rule.not.is.null,and(event_date.gte.${isoOf(startOfThisWeek)},event_date.lte.${rangeEnd})`);
      if (cancelled || error) return;

      const covered = coveredDays((data ?? []) as Ev[], isoOf(startOfThisWeek), rangeEnd);
      // This week = today through Saturday (don't nag about days already past).
      const thisWeekHas = Array.from({ length: 7 }).some((_, i) => {
        const d = isoOf(addDays(startOfThisWeek, i));
        return d >= todayISO && covered.has(d);
      });
      const nextWeekHas = Array.from({ length: 7 }).some((_, i) => covered.has(isoOf(addDays(startOfNextWeek, i))));
      setGap({ thisWeek: !thisWeekHas, nextWeek: !nextWeekHas });
    })();
    return () => { cancelled = true; };
  }, []);

  if (dismissed || !gap || (!gap.thisWeek && !gap.nextWeek)) return null;
  const which = gap.thisWeek && gap.nextWeek ? 'the rest of this week or next week' : gap.thisWeek ? 'the rest of this week' : 'next week';

  const openCalendar = () => {
    try { window.localStorage.setItem(VIEWMODE_STORAGE_KEY, 'phones'); } catch { /* ignore */ }
    router.push('/feather/calendar');
  };

  return (
    <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50/90 supports-[backdrop-filter]:bg-amber-50/80 backdrop-blur px-4 py-3 flex items-start gap-3 shadow-sm" role="alert">
      <span className="shrink-0 mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-8.48 14.7A2 2 0 003.53 21h16.94a2 2 0 001.72-3.04l-8.48-14.7a2 2 0 00-3.42 0z" /></svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-amber-900">No one is on the phones for {which}.</p>
        <p className="text-[12px] text-amber-800/80 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
          The phones calendar has no operators scheduled — assign coverage so incoming calls get answered.
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={openCalendar}
          className="rounded-lg bg-amber-600 text-white px-3 py-1.5 text-[12px] font-semibold hover:bg-amber-700"
        >
          Open phones calendar
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-amber-700/70 hover:bg-amber-500/10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
}
