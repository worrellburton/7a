'use client';

import { useAuth } from '@/lib/AuthProvider';
import React, { useMemo, useState } from 'react';

// ------------------------------------------------------------
// Calendar — Phase 1: views only (month / week / day).
// No events, no drag-and-drop yet. Phase 2 wires up groups/users,
// Phase 3 adds editing + drag-to-reschedule + polish.
// ------------------------------------------------------------

type View = 'month' | 'week' | 'day';

// ---- Date helpers (local time, no library) ----
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfWeek(d: Date) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// 7am–9pm covers a therapy day comfortably.
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
function formatHour(h: number) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

export default function CalendarContent() {
  const { user } = useAuth();
  const [view, setView] = useState<View>('month');
  const [current, setCurrent] = useState<Date>(() => new Date());

  const monthDays = useMemo(() => {
    const first = startOfMonth(current);
    const startGrid = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(startGrid, i));
  }, [current]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(current);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [current]);

  const title = useMemo(() => {
    if (view === 'month') {
      return `${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
    }
    if (view === 'week') {
      const s = startOfWeek(current);
      const e = endOfWeek(current);
      if (s.getMonth() === e.getMonth()) {
        return `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
      }
      return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
    }
    return `${DAYS_FULL[current.getDay()]}, ${MONTHS[current.getMonth()]} ${current.getDate()}, ${current.getFullYear()}`;
  }, [view, current]);

  function navigate(dir: -1 | 0 | 1) {
    if (dir === 0) {
      setCurrent(new Date());
      return;
    }
    if (view === 'month') {
      setCurrent(new Date(current.getFullYear(), current.getMonth() + dir, 1));
    } else if (view === 'week') {
      setCurrent(addDays(current, dir * 7));
    } else {
      setCurrent(addDays(current, dir));
    }
  }

  if (!user) return null;

  const today = new Date();
  const bodyKey = `${view}-${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`;

  return (
    <div className="p-6 lg:p-10 min-h-screen flex flex-col">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Calendar</h1>
          <p
            className="text-sm text-foreground/50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Schedule groups, users, and events across your facility.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* View switcher */}
          <div className="flex items-center gap-1 bg-warm-bg rounded-lg p-1">
            {(['month', 'week', 'day'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${
                  view === v
                    ? 'bg-white shadow-sm text-foreground'
                    : 'text-foreground/50 hover:text-foreground/80'
                }`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {v}
              </button>
            ))}
          </div>
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-warm-bg text-foreground/60 transition-colors"
              aria-label="Previous"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={() => navigate(0)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:border-primary/40 hover:text-primary text-foreground/70 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Today
            </button>
            <button
              onClick={() => navigate(1)}
              className="p-2 rounded-lg hover:bg-warm-bg text-foreground/60 transition-colors"
              aria-label="Next"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Current-period title */}
      <div className="mb-4">
        <h2
          key={title}
          className="text-xl font-semibold text-foreground animate-cal-fade"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {title}
        </h2>
      </div>

      {/* Body */}
      <div
        key={bodyKey}
        className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-cal-fade"
      >
        {view === 'month' && <MonthView days={monthDays} current={current} today={today} />}
        {view === 'week' && <WeekView days={weekDays} today={today} />}
        {view === 'day' && <DayView day={current} today={today} />}
      </div>
    </div>
  );
}

/* ── Month view ───────────────────────────────────────────────── */

function MonthView({ days, current, today }: { days: Date[]; current: Date; today: Date }) {
  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-7 border-b border-gray-100 bg-warm-bg/30">
        {DAYS_SHORT.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[10px] font-semibold text-foreground/50 uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {d}
          </div>
        ))}
      </div>
      <div
        className="grid grid-cols-7 flex-1"
        style={{ gridTemplateRows: 'repeat(6, minmax(0, 1fr))' }}
      >
        {days.map((d, i) => {
          const inMonth = isSameMonth(d, current);
          const isToday = isSameDay(d, today);
          const isLastCol = (i + 1) % 7 === 0;
          const isLastRow = i >= 35;
          return (
            <div
              key={i}
              className={`group relative p-2 min-h-[96px] transition-colors hover:bg-warm-bg/40 ${
                isLastCol ? '' : 'border-r'
              } ${isLastRow ? '' : 'border-b'} border-gray-100`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center justify-center text-sm font-semibold w-7 h-7 rounded-full transition-colors ${
                    isToday
                      ? 'bg-primary text-white shadow-sm'
                      : inMonth
                      ? 'text-foreground/70'
                      : 'text-foreground/20'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {d.getDate()}
                </span>
              </div>
              {/* Events land here in Phase 2 */}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Week view ───────────────────────────────────────────────── */

function WeekView({ days, today }: { days: Date[]; today: Date }) {
  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Day headers */}
      <div
        className="grid border-b border-gray-100 bg-warm-bg/30 sticky top-0 z-10"
        style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))' }}
      >
        <div />
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <div key={i} className="py-3 text-center border-l border-gray-100">
              <div
                className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {DAYS_SHORT[d.getDay()]}
              </div>
              <div
                className={`mt-1 inline-flex items-center justify-center text-sm font-semibold w-8 h-8 rounded-full transition-colors ${
                  isToday ? 'bg-primary text-white shadow-sm' : 'text-foreground/70'
                }`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>
      {/* Hour grid */}
      <div className="flex-1">
        <div
          className="grid"
          style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))' }}
        >
          {HOURS.map((h) => (
            <React.Fragment key={h}>
              <div
                className="text-[10px] font-semibold text-foreground/40 pr-2 text-right pt-1 -translate-y-1"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {formatHour(h)}
              </div>
              {days.map((_, di) => (
                <div
                  key={di}
                  className="h-16 border-l border-t border-gray-100 hover:bg-warm-bg/30 transition-colors"
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Day view ───────────────────────────────────────────────── */

function DayView({ day, today }: { day: Date; today: Date }) {
  const isToday = isSameDay(day, today);
  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="py-5 text-center border-b border-gray-100 bg-warm-bg/30 sticky top-0 z-10">
        <div
          className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {DAYS_FULL[day.getDay()]}
        </div>
        <div
          className={`mt-1 inline-flex items-center justify-center text-xl font-bold w-11 h-11 rounded-full transition-colors ${
            isToday ? 'bg-primary text-white shadow-sm' : 'text-foreground'
          }`}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {day.getDate()}
        </div>
      </div>
      <div className="flex-1">
        <div className="grid" style={{ gridTemplateColumns: '80px 1fr' }}>
          {HOURS.map((h) => (
            <React.Fragment key={h}>
              <div
                className="text-xs font-semibold text-foreground/40 pr-3 text-right pt-1 -translate-y-1"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {formatHour(h)}
              </div>
              <div className="h-20 border-l border-t border-gray-100 hover:bg-warm-bg/30 transition-colors" />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
