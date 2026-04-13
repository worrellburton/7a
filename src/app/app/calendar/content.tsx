'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

// ------------------------------------------------------------
// Calendar — Phase 3: polish, edit, reschedule, delete.
//
// On top of Phase 1 (views) and Phase 2 (palette + drag-to-create):
//   * Events are clickable → edit modal with title / notes / time /
//     all-day toggle / delete.
//   * Existing events are draggable. Dropping on another day or time
//     slot re-writes their event_date / start_time.
//   * Drop targets pulse while a drag hovers; chips crossfade in;
//     modal fades + scales; the whole surface feels tactile.
//
// DropCell handles two mime types: SUBJECT_MIME from the palette
// (create a new event) and EVENT_MIME from an existing event
// (reschedule it).
// ------------------------------------------------------------

type View = 'month' | 'week' | 'day';
type SubjectKind = 'group' | 'user';

interface EventRow {
  id: string;
  title: string;
  event_date: string; // 'YYYY-MM-DD'
  start_time: string | null; // 'HH:MM:SS'
  end_time: string | null;
  subject_kind: SubjectKind;
  subject_id: string;
  color: string | null;
  notes: string | null;
  created_by: string | null;
}

interface GroupRow {
  id: string;
  name: string;
}

interface UserRow {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface AodRow {
  event_date: string; // 'YYYY-MM-DD'
  user_id: string;
}

interface DragPayload {
  kind: SubjectKind;
  id: string;
  label: string;
  color: string;
}

// Two subject mimes so the AOD slot can highlight only for team drags.
const USER_MIME = 'application/x-cal-user';
const GROUP_MIME = 'application/x-cal-group';
const EVENT_MIME = 'application/x-cal-event-ref';

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
function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function parseTime(s: string | null): number | null {
  if (!s) return null;
  const [h] = s.split(':').map(Number);
  return Number.isFinite(h) ? h : null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// 7am–9pm covers a therapy day comfortably.
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
const DAY_START_H = HOURS[0];
const DAY_END_H = HOURS[HOURS.length - 1] + 1; // exclusive upper bound
function formatHour(h: number) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}
function formatDecimalTime(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const norm = mm === 60 ? { h: hh + 1, m: 0 } : { h: hh, m: mm };
  const period = norm.h >= 12 ? 'PM' : 'AM';
  const displayH = norm.h === 0 ? 12 : norm.h > 12 ? norm.h - 12 : norm.h;
  return `${displayH}:${String(norm.m).padStart(2, '0')} ${period}`;
}

// ---- Sunrise / sunset approximation (NOAA General Solar Position).
// Defaults to Phoenix, AZ (no DST). Returns decimal local hours.
function sunTimes(date: Date, lat = 33.4484, lon = -112.074): { sunrise: number; sunset: number } {
  const rad = Math.PI / 180;
  const dayMs = 86400000;
  const jan0 = Date.UTC(date.getFullYear(), 0, 0);
  const n = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - jan0) / dayMs);

  const calc = (rising: boolean): number => {
    const lngHour = lon / 15;
    const t = n + (((rising ? 6 : 18) - lngHour) / 24);
    const M = 0.9856 * t - 3.289;
    let L = M + 1.916 * Math.sin(rad * M) + 0.020 * Math.sin(rad * 2 * M) + 282.634;
    L = ((L % 360) + 360) % 360;
    let RA = Math.atan(0.91764 * Math.tan(rad * L)) / rad;
    RA = ((RA % 360) + 360) % 360;
    const Lq = Math.floor(L / 90) * 90;
    const RAq = Math.floor(RA / 90) * 90;
    RA = (RA + (Lq - RAq)) / 15;
    const sinDec = 0.39782 * Math.sin(rad * L);
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(rad * 90.833) - sinDec * Math.sin(rad * lat)) / (cosDec * Math.cos(rad * lat));
    if (cosH > 1) return rising ? 6 : 18; // sun never rises
    if (cosH < -1) return rising ? 0 : 24; // sun never sets
    const H = (rising ? 360 - Math.acos(cosH) / rad : Math.acos(cosH) / rad) / 15;
    const T = H + RA - 0.06571 * t - 6.622;
    let UT = T - lngHour;
    UT = ((UT % 24) + 24) % 24;
    // Arizona (America/Phoenix) = UTC-7 year round.
    return ((UT - 7) + 24) % 24;
  };

  return { sunrise: calc(true), sunset: calc(false) };
}

// Deterministic warm palette keyed off the subject id. This way the same
// group/user keeps the same color across sessions without storing it per-row.
const PALETTE = [
  '#a0522d', '#c67a4a', '#8b6f47', '#6b8e5a',
  '#d4a574', '#b05d4c', '#7c6552', '#96764e',
];
function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0x7fffffff;
  return PALETTE[h % PALETTE.length];
}
function userLabel(u: UserRow) {
  return u.full_name || u.email.split('@')[0];
}

// ------------------------------------------------------------
// Root
// ------------------------------------------------------------

export default function CalendarContent() {
  const { user, session } = useAuth();
  const [view, setView] = useState<View>('month');
  const [current, setCurrent] = useState<Date>(() => new Date());

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [aodRows, setAodRows] = useState<AodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Initial data fetch
  useEffect(() => {
    if (!session?.access_token) return;
    let alive = true;
    (async () => {
      const [g, u, e, a] = await Promise.all([
        db({ action: 'select', table: 'groups', order: { column: 'name', ascending: true } }),
        db({ action: 'select', table: 'users', select: 'id,full_name,email,avatar_url', order: { column: 'full_name', ascending: true } }),
        db({ action: 'select', table: 'calendar_events', order: { column: 'event_date', ascending: true } }),
        db({ action: 'select', table: 'calendar_day_aod', select: 'event_date,user_id' }),
      ]);
      if (!alive) return;
      if (Array.isArray(g)) setGroups(g as GroupRow[]);
      if (Array.isArray(u)) setUsers(u as UserRow[]);
      if (Array.isArray(e)) setEvents(e as EventRow[]);
      if (Array.isArray(a)) setAodRows(a as AodRow[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [session]);

  // ---- Memoized derived data ----
  const monthDays = useMemo(() => {
    const first = startOfMonth(current);
    const startGrid = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(startGrid, i));
  }, [current]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(current);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [current]);

  // Group events by ISO date for O(1) lookup when rendering cells.
  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const ev of events) {
      if (!map.has(ev.event_date)) map.set(ev.event_date, []);
      map.get(ev.event_date)!.push(ev);
    }
    // Sort each day's events by time (all-day first, then by hour).
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        const at = parseTime(a.start_time);
        const bt = parseTime(b.start_time);
        if (at == null && bt == null) return 0;
        if (at == null) return -1;
        if (bt == null) return 1;
        return at - bt;
      });
    }
    return map;
  }, [events]);

  // Quick lookup from user id → UserRow for avatar rendering on chips.
  const usersById = useMemo(() => {
    const map = new Map<string, UserRow>();
    for (const u of users) map.set(u.id, u);
    return map;
  }, [users]);

  // Quick lookup from ISO date → AOD user id.
  const aodByDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of aodRows) map.set(a.event_date, a.user_id);
    return map;
  }, [aodRows]);

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

  // ---- Create a new event from a palette drop ----
  const handleCreate = useCallback(
    async (payload: DragPayload, date: Date, hour: number | null) => {
      if (!user) return;
      const optimistic: EventRow = {
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: payload.label,
        event_date: toISODate(date),
        start_time: hour == null ? null : `${String(hour).padStart(2, '0')}:00:00`,
        end_time: hour == null ? null : `${String(hour + 1).padStart(2, '0')}:00:00`,
        subject_kind: payload.kind,
        subject_id: payload.id,
        color: payload.color,
        notes: '',
        created_by: user.id,
      };
      setEvents((prev) => [...prev, optimistic]);

      const inserted = await db({
        action: 'insert',
        table: 'calendar_events',
        data: {
          title: optimistic.title,
          event_date: optimistic.event_date,
          start_time: optimistic.start_time,
          end_time: optimistic.end_time,
          subject_kind: optimistic.subject_kind,
          subject_id: optimistic.subject_id,
          color: optimistic.color,
          created_by: optimistic.created_by,
        },
      });
      if (inserted && (inserted as EventRow).id) {
        // Swap optimistic row for the server version (real id, timestamps, etc.)
        setEvents((prev) => prev.map((ev) => (ev.id === optimistic.id ? (inserted as EventRow) : ev)));
      } else {
        // Insert failed — roll back the optimistic row.
        setEvents((prev) => prev.filter((ev) => ev.id !== optimistic.id));
      }
    },
    [user]
  );

  // ---- Reschedule an existing event by dragging it ----
  const handleReschedule = useCallback(
    async (eventId: string, date: Date, hour: number | null) => {
      const existing = events.find((ev) => ev.id === eventId);
      if (!existing) return;
      const newDate = toISODate(date);
      const newStart = hour == null ? null : `${String(hour).padStart(2, '0')}:00:00`;
      const newEnd = hour == null ? null : `${String(hour + 1).padStart(2, '0')}:00:00`;
      if (
        existing.event_date === newDate &&
        existing.start_time === newStart &&
        existing.end_time === newEnd
      ) {
        return; // No-op drop on its own slot.
      }
      // Optimistic update
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId
            ? { ...ev, event_date: newDate, start_time: newStart, end_time: newEnd }
            : ev
        )
      );
      const result = await db({
        action: 'update',
        table: 'calendar_events',
        data: { event_date: newDate, start_time: newStart, end_time: newEnd },
        match: { id: eventId },
      });
      if (!result || !(result as { ok?: boolean }).ok) {
        // Roll back
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === eventId
              ? {
                  ...ev,
                  event_date: existing.event_date,
                  start_time: existing.start_time,
                  end_time: existing.end_time,
                }
              : ev
          )
        );
      }
    },
    [events]
  );

  // ---- Resize an event (change start_time or end_time) ----
  const handleResizeEvent = useCallback(
    async (eventId: string, newStartHour: number, newEndHour: number) => {
      const existing = events.find((ev) => ev.id === eventId);
      if (!existing) return;
      const clampedStart = Math.max(HOURS[0], Math.min(newStartHour, DAY_END_H - 1));
      const clampedEnd = Math.max(clampedStart + 1, Math.min(newEndHour, DAY_END_H));
      const newStart = `${String(clampedStart).padStart(2, '0')}:00:00`;
      const newEnd = `${String(clampedEnd).padStart(2, '0')}:00:00`;
      if (existing.start_time === newStart && existing.end_time === newEnd) return;
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId ? { ...ev, start_time: newStart, end_time: newEnd } : ev
        )
      );
      const result = await db({
        action: 'update',
        table: 'calendar_events',
        data: { start_time: newStart, end_time: newEnd },
        match: { id: eventId },
      });
      if (!result || !(result as { ok?: boolean }).ok) {
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === eventId
              ? { ...ev, start_time: existing.start_time, end_time: existing.end_time }
              : ev
          )
        );
      }
    },
    [events]
  );

  // ---- Save edits from the modal ----
  const handleSaveEdit = useCallback(
    async (id: string, patch: Partial<EventRow>) => {
      const existing = events.find((ev) => ev.id === id);
      if (!existing) return;
      setEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)));
      const result = await db({
        action: 'update',
        table: 'calendar_events',
        data: patch as Record<string, unknown>,
        match: { id },
      });
      if (!result || !(result as { ok?: boolean }).ok) {
        // Roll back on failure
        setEvents((prev) => prev.map((ev) => (ev.id === id ? existing : ev)));
      }
    },
    [events]
  );

  // ---- Delete ----
  const handleDelete = useCallback(
    async (id: string) => {
      const existing = events.find((ev) => ev.id === id);
      if (!existing) return;
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
      const result = await db({ action: 'delete', table: 'calendar_events', match: { id } });
      if (!result || !(result as { ok?: boolean }).ok) {
        setEvents((prev) => [...prev, existing]);
      }
    },
    [events]
  );

  // ---- Set AOD (Assistant on Duty) for a given day ----
  const handleSetAod = useCallback(
    async (date: Date, userId: string) => {
      if (!user) return;
      const iso = toISODate(date);
      const prev = aodRows;
      // Optimistic: replace or add.
      setAodRows((rows) => {
        const next = rows.filter((r) => r.event_date !== iso);
        next.push({ event_date: iso, user_id: userId });
        return next;
      });
      const result = await db({
        action: 'upsert',
        table: 'calendar_day_aod',
        data: [{ event_date: iso, user_id: userId, created_by: user.id }],
        onConflict: 'event_date',
      });
      if (!result || !(result as { ok?: boolean }).ok) {
        setAodRows(prev); // Roll back on failure.
      }
    },
    [user, aodRows]
  );

  // ---- Clear the AOD for a day ----
  const handleClearAod = useCallback(
    async (date: Date) => {
      const iso = toISODate(date);
      const prev = aodRows;
      setAodRows((rows) => rows.filter((r) => r.event_date !== iso));
      const result = await db({
        action: 'delete',
        table: 'calendar_day_aod',
        match: { event_date: iso },
      });
      if (!result || !(result as { ok?: boolean }).ok) {
        setAodRows(prev);
      }
    },
    [aodRows]
  );

  // ---- Navigate to day view for a specific date ----
  const handleDayClick = useCallback((date: Date) => {
    setCurrent(date);
    setView('day');
  }, []);

  const editingEvent = useMemo(
    () => (editingId ? events.find((ev) => ev.id === editingId) || null : null),
    [editingId, events]
  );

  // Escape closes the modal.
  useEffect(() => {
    if (!editingId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditingId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingId]);

  if (!user) return null;

  const today = new Date();
  const bodyKey = `${view}-${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`;

  return (
    <div className="p-4 lg:p-6 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-3 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-0.5">Calendar</h1>
          <p
            className="text-xs text-foreground/50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Drag a group or a team member onto a day to schedule it.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-warm-bg text-foreground/60 transition-colors"
              aria-label="Previous"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="mb-3 text-center">
        <h2
          key={title}
          className="text-lg font-semibold text-foreground animate-cal-fade inline-block"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {title}
        </h2>
      </div>

      {/* Body: palette + calendar surface */}
      <div className="flex-1 min-h-0 grid gap-3" style={{ gridTemplateColumns: 'minmax(220px, 260px) 1fr' }}>
        <Palette groups={groups} users={users} loading={loading} />

        <div
          key={bodyKey}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-cal-fade min-h-0 flex flex-col"
        >
          {view === 'month' && (
            <MonthView
              days={monthDays}
              current={current}
              today={today}
              eventsByDate={eventsByDate}
              usersById={usersById}
              aodByDate={aodByDate}
              onCreate={(date, payload) => handleCreate(payload, date, null)}
              onReschedule={(date, eventId) => handleReschedule(eventId, date, null)}
              onEventClick={setEditingId}
              onDayClick={handleDayClick}
              onSetAod={handleSetAod}
              onClearAod={handleClearAod}
            />
          )}
          {view === 'week' && (
            <WeekView
              days={weekDays}
              today={today}
              eventsByDate={eventsByDate}
              usersById={usersById}
              onCreate={(date, hour, payload) => handleCreate(payload, date, hour)}
              onReschedule={(date, hour, eventId) => handleReschedule(eventId, date, hour)}
              onResize={handleResizeEvent}
              onEventClick={setEditingId}
              onDayClick={handleDayClick}
            />
          )}
          {view === 'day' && (
            <DayView
              day={current}
              today={today}
              eventsByDate={eventsByDate}
              usersById={usersById}
              aodByDate={aodByDate}
              onCreate={(date, hour, payload) => handleCreate(payload, date, hour)}
              onReschedule={(date, hour, eventId) => handleReschedule(eventId, date, hour)}
              onResize={handleResizeEvent}
              onEventClick={setEditingId}
              onSetAod={handleSetAod}
              onClearAod={handleClearAod}
            />
          )}
        </div>
      </div>

      {editingEvent && (
        <EditModal
          event={editingEvent}
          onClose={() => setEditingId(null)}
          onSave={(patch) => handleSaveEdit(editingEvent.id, patch)}
          onDelete={() => {
            handleDelete(editingEvent.id);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Palette — draggable groups and users
// ------------------------------------------------------------

function Palette({
  groups,
  users,
  loading,
}: {
  groups: GroupRow[];
  users: UserRow[];
  loading: boolean;
}) {
  const [tab, setTab] = useState<'groups' | 'team'>('groups');
  const [q, setQ] = useState('');

  const filteredGroups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(needle));
  }, [groups, q]);

  const filteredUsers = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (u) =>
        (u.full_name || '').toLowerCase().includes(needle) ||
        u.email.toLowerCase().includes(needle)
    );
  }, [users, q]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center gap-1 bg-warm-bg rounded-lg p-1 mb-3">
          {(['groups', 'team'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${
                tab === t
                  ? 'bg-white shadow-sm text-foreground'
                  : 'text-foreground/50 hover:text-foreground/80'
              }`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${tab}...`}
            className="w-full text-sm pl-8 pr-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none bg-warm-bg/30"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <svg
            className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-1.5">
        {loading ? (
          <div className="text-xs text-foreground/40 text-center py-8">Loading…</div>
        ) : tab === 'groups' ? (
          filteredGroups.length === 0 ? (
            <EmptyMsg text="No groups found" />
          ) : (
            filteredGroups.map((g) => <DraggableChip key={g.id} kind="group" id={g.id} label={g.name} />)
          )
        ) : filteredUsers.length === 0 ? (
          <EmptyMsg text="No team members found" />
        ) : (
          filteredUsers.map((u) => (
            <DraggableChip key={u.id} kind="user" id={u.id} label={userLabel(u)} avatar={u.avatar_url} />
          ))
        )}
      </div>

      <div className="p-3 border-t border-gray-100 text-[11px] text-foreground/40 leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
        Drag a group onto a day for an event, or drop a team member on the upper-left AOC slot.
      </div>
    </div>
  );
}

function EmptyMsg({ text }: { text: string }) {
  return <div className="text-xs text-foreground/40 text-center py-8">{text}</div>;
}

function DraggableChip({
  kind,
  id,
  label,
  avatar,
}: {
  kind: SubjectKind;
  id: string;
  label: string;
  avatar?: string | null;
}) {
  const color = colorFor(id);
  const [dragging, setDragging] = useState(false);

  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const payload: DragPayload = { kind, id, label, color };
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(kind === 'user' ? USER_MIME : GROUP_MIME, JSON.stringify(payload));
    // Fallback mime so this still ~works if something strips the custom one.
    e.dataTransfer.setData('text/plain', label);
    setDragging(true);
  };
  const onDragEnd = () => setDragging(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all select-none ${
        dragging ? 'opacity-40 scale-95' : 'hover:bg-warm-bg/40 hover:shadow-sm hover:-translate-y-px'
      }`}
      style={{ borderLeft: `3px solid ${color}` }}
      title={`Drag ${label} onto the calendar`}
    >
      {kind === 'user' && avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
      ) : (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ backgroundColor: color }}
        >
          {label.charAt(0).toUpperCase()}
        </div>
      )}
      <span
        className="text-sm text-foreground/80 truncate"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {label}
      </span>
    </div>
  );
}

// ------------------------------------------------------------
// Drop target — accepts palette subjects (new event) and event
// references (reschedule). Pulses while a drag hovers.
// ------------------------------------------------------------

function DropCell({
  onCreate,
  onReschedule,
  onClick,
  className = '',
  activeClassName = 'animate-cal-drop',
  children,
}: {
  onCreate: (p: DragPayload) => void;
  onReschedule: (eventId: string) => void;
  onClick?: () => void;
  className?: string;
  activeClassName?: string;
  children?: React.ReactNode;
}) {
  const [over, setOver] = useState(false);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    const types = Array.from(e.dataTransfer.types);
    if (types.includes(USER_MIME) || types.includes(GROUP_MIME) || types.includes(EVENT_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = types.includes(EVENT_MIME) ? 'move' : 'copy';
      if (!over) setOver(true);
    }
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only clear if leaving the element entirely (not a child).
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setOver(false);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    const eventRef = e.dataTransfer.getData(EVENT_MIME);
    if (eventRef) {
      onReschedule(eventRef);
      return;
    }
    const raw =
      e.dataTransfer.getData(USER_MIME) || e.dataTransfer.getData(GROUP_MIME);
    if (raw) {
      try {
        const payload = JSON.parse(raw) as DragPayload;
        onCreate(payload);
      } catch {
        /* malformed payload — ignore */
      }
    }
  };

  return (
    <div
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`${className} ${over ? activeClassName : ''}`}
    >
      {children}
    </div>
  );
}

// ------------------------------------------------------------
// Event chips — draggable (reschedule) and clickable (edit)
// ------------------------------------------------------------

function useEventDrag(ev: EventRow) {
  const [dragging, setDragging] = useState(false);
  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(EVENT_MIME, ev.id);
    e.dataTransfer.setData('text/plain', ev.title);
    setDragging(true);
  };
  const onDragEnd = () => setDragging(false);
  return { dragging, onDragStart, onDragEnd };
}

function EventChip({
  ev,
  usersById,
  onClick,
}: {
  ev: EventRow;
  usersById: Map<string, UserRow>;
  onClick: (id: string) => void;
}) {
  const color = ev.color || colorFor(ev.subject_id);
  const hour = parseTime(ev.start_time);
  const { dragging, onDragStart, onDragEnd } = useEventDrag(ev);
  const isUser = ev.subject_kind === 'user';
  const u = isUser ? usersById.get(ev.subject_id) : undefined;
  const label = isUser ? (u ? userLabel(u) : ev.title) : ev.title;
  const title = label + (hour != null ? ` · ${formatHour(hour)}` : '');

  if (isUser) {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={(e) => {
          e.stopPropagation();
          onClick(ev.id);
        }}
        className={`animate-cal-event flex items-center gap-1.5 pl-0.5 pr-1.5 py-0.5 rounded-full cursor-pointer transition-all hover:-translate-y-px hover:shadow-sm ${
          dragging ? 'opacity-40' : ''
        }`}
        style={{
          backgroundColor: color + '1a',
          fontFamily: 'var(--font-body)',
        }}
        title={title}
      >
        {u?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={u.avatar_url}
            alt=""
            className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-white"
          />
        ) : (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
            style={{ backgroundColor: color }}
          >
            {label.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-[11px] font-medium truncate" style={{ color }}>
          {hour != null ? `${formatHour(hour).replace(' ', '')} ` : ''}
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onClick(ev.id);
      }}
      className={`animate-cal-event px-2 py-0.5 rounded text-[11px] font-medium truncate cursor-pointer transition-all hover:-translate-y-px hover:shadow-sm ${
        dragging ? 'opacity-40' : ''
      }`}
      style={{
        backgroundColor: color + '22',
        color,
        borderLeft: `2px solid ${color}`,
        fontFamily: 'var(--font-body)',
      }}
      title={title}
    >
      {hour != null && <span className="opacity-70 mr-1">{formatHour(hour).replace(' ', '')}</span>}
      {label}
    </div>
  );
}

function TimedEventBlock({
  ev,
  usersById,
  onClick,
}: {
  ev: EventRow;
  usersById: Map<string, UserRow>;
  onClick: (id: string) => void;
}) {
  const color = ev.color || colorFor(ev.subject_id);
  const { dragging, onDragStart, onDragEnd } = useEventDrag(ev);
  const isUser = ev.subject_kind === 'user';
  const u = isUser ? usersById.get(ev.subject_id) : undefined;
  const label = isUser ? (u ? userLabel(u) : ev.title) : ev.title;

  if (isUser) {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={(e) => {
          e.stopPropagation();
          onClick(ev.id);
        }}
        className={`animate-cal-event mx-1 px-1.5 py-1 rounded-full flex items-center gap-2 cursor-pointer transition-all shadow-sm hover:-translate-y-px hover:shadow-md ${
          dragging ? 'opacity-40' : ''
        }`}
        style={{
          backgroundColor: color + '1f',
          fontFamily: 'var(--font-body)',
        }}
        title={label}
      >
        {u?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={u.avatar_url}
            alt=""
            className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-white"
          />
        ) : (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ backgroundColor: color }}
          >
            {label.charAt(0).toUpperCase()}
          </div>
        )}
        <span
          className="text-[11px] font-semibold truncate"
          style={{ color }}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onClick(ev.id);
      }}
      className={`animate-cal-event mx-1 px-2 py-1 rounded text-[11px] font-semibold truncate cursor-pointer transition-all shadow-sm hover:-translate-y-px hover:shadow-md ${
        dragging ? 'opacity-40' : ''
      }`}
      style={{
        backgroundColor: color + '26',
        color,
        borderLeft: `3px solid ${color}`,
        fontFamily: 'var(--font-body)',
      }}
      title={label}
    >
      {label}
    </div>
  );
}

// ------------------------------------------------------------
// Resizable event overlay — positioned absolutely within a day
// column, spanning from start_time to end_time. Shows drag
// handles on top/bottom edges to resize.
// ------------------------------------------------------------

function ResizableEvent({
  ev,
  usersById,
  onClick,
  onResize,
  totalHours,
}: {
  ev: EventRow;
  usersById: Map<string, UserRow>;
  onClick: (id: string) => void;
  onResize: (eventId: string, newStart: number, newEnd: number) => void;
  totalHours: number;
}) {
  const startH = parseTime(ev.start_time) ?? HOURS[0];
  const endH = parseTime(ev.end_time) ?? startH + 1;
  const color = ev.color || colorFor(ev.subject_id);
  const isUser = ev.subject_kind === 'user';
  const u = isUser ? usersById.get(ev.subject_id) : undefined;
  const label = isUser ? (u ? userLabel(u) : ev.title) : ev.title;
  const { dragging, onDragStart, onDragEnd } = useEventDrag(ev);

  const topPct = ((startH - HOURS[0]) / totalHours) * 100;
  const heightPct = ((endH - startH) / totalHours) * 100;

  const handlePointerDown = useCallback(
    (edge: 'top' | 'bottom', e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const target = e.currentTarget as HTMLElement;
      const container = target.closest('[data-resize-container]') as HTMLElement;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const containerH = containerRect.height;
      target.setPointerCapture(e.pointerId);

      let curStart = startH;
      let curEnd = endH;

      const onMove = (me: PointerEvent) => {
        const y = me.clientY - containerRect.top;
        const hour = HOURS[0] + (y / containerH) * totalHours;
        const snapped = Math.round(hour);
        if (edge === 'bottom') {
          curEnd = Math.max(curStart + 1, Math.min(snapped, DAY_END_H));
        } else {
          curStart = Math.max(HOURS[0], Math.min(snapped, curEnd - 1));
        }
        // Live preview via DOM style mutation (avoids React re-render flood)
        const parent = target.closest('[data-event-block]') as HTMLElement;
        if (parent) {
          parent.style.top = `${((curStart - HOURS[0]) / totalHours) * 100}%`;
          parent.style.height = `${((curEnd - curStart) / totalHours) * 100}%`;
        }
      };
      const onUp = () => {
        target.releasePointerCapture(e.pointerId);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (curStart !== startH || curEnd !== endH) {
          onResize(ev.id, curStart, curEnd);
        }
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [ev.id, startH, endH, totalHours, onResize]
  );

  return (
    <div
      data-event-block
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(e) => { e.stopPropagation(); onClick(ev.id); }}
      className={`absolute left-0 right-0 mx-1 rounded-lg cursor-pointer transition-shadow shadow-sm hover:shadow-md z-10 overflow-hidden ${
        dragging ? 'opacity-40' : ''
      }`}
      style={{
        top: `${topPct}%`,
        height: `${heightPct}%`,
        minHeight: 20,
        backgroundColor: isUser ? color + '1f' : color + '26',
        borderLeft: isUser ? undefined : `3px solid ${color}`,
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Top resize handle */}
      <div
        onPointerDown={(e) => handlePointerDown('top', e)}
        className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-black/10 transition-colors z-20"
      />
      {/* Content */}
      <div className="flex items-center gap-1.5 px-1.5 py-1 min-h-0">
        {isUser && u?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-white" />
        ) : isUser ? (
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: color }}>
            {label.charAt(0).toUpperCase()}
          </div>
        ) : null}
        <span className="text-[11px] font-semibold truncate" style={{ color }}>
          {label}
        </span>
      </div>
      {/* Bottom resize handle */}
      <div
        onPointerDown={(e) => handlePointerDown('bottom', e)}
        className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-black/10 transition-colors z-20"
      />
    </div>
  );
}

// ------------------------------------------------------------
// AOD slot — per-day "Assistant on Duty" drop target in the
// upper-left of each day cell. Accepts team drags only.
// ------------------------------------------------------------

function AodSlot({
  user,
  onSet,
  onClear,
  compact = false,
}: {
  user: UserRow | undefined;
  onSet: (userId: string) => void;
  onClear: () => void;
  compact?: boolean;
}) {
  const [over, setOver] = useState(false);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes(USER_MIME)) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      if (!over) setOver(true);
    }
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setOver(false);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const raw = e.dataTransfer.getData(USER_MIME);
    if (!raw) return;
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    try {
      const payload = JSON.parse(raw) as DragPayload;
      onSet(payload.id);
    } catch {
      /* malformed — ignore */
    }
  };

  const color = user ? colorFor(user.id) : 'var(--color-primary)';
  const label = user ? (user.full_name?.split(' ')[0] || user.email.split('@')[0]) : 'AOC';

  const sizeCls = compact ? 'h-5 text-[9px]' : 'h-6 text-[10px]';
  const avatarCls = compact ? 'w-4 h-4' : 'w-5 h-5';

  if (!user) {
    return (
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={(e) => e.stopPropagation()}
        className={`${sizeCls} flex items-center gap-1 px-1.5 rounded border border-dashed transition-colors select-none ${
          over
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-gray-200 text-foreground/30 hover:border-gray-300'
        }`}
        style={{ fontFamily: 'var(--font-body)' }}
        title="Drop a team member here to set Assistant on Call"
      >
        <span className="font-bold tracking-wider">AOC</span>
      </div>
    );
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={(e) => {
        e.stopPropagation();
        onClear();
      }}
      className={`${sizeCls} flex items-center gap-1 px-0.5 pr-1.5 rounded-full cursor-pointer transition-all select-none group hover:-translate-y-px ${
        over ? 'ring-2 ring-primary shadow-sm' : ''
      }`}
      style={{
        backgroundColor: String(color) + '22',
        fontFamily: 'var(--font-body)',
      }}
      title={`AOC: ${user.full_name || user.email} — click to clear`}
    >
      {user.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatar_url}
          alt=""
          className={`${avatarCls} rounded-full object-cover shrink-0 ring-1 ring-white`}
        />
      ) : (
        <div
          className={`${avatarCls} rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0`}
          style={{ backgroundColor: String(color) }}
        >
          {label.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="font-semibold truncate max-w-[60px]" style={{ color: String(color) }}>
        {label}
      </span>
    </div>
  );
}

// ------------------------------------------------------------
// Month view
// ------------------------------------------------------------

function MonthView({
  days,
  current,
  today,
  eventsByDate,
  usersById,
  aodByDate,
  onCreate,
  onReschedule,
  onEventClick,
  onDayClick,
  onSetAod,
  onClearAod,
}: {
  days: Date[];
  current: Date;
  today: Date;
  eventsByDate: Map<string, EventRow[]>;
  usersById: Map<string, UserRow>;
  aodByDate: Map<string, string>;
  onCreate: (date: Date, payload: DragPayload) => void;
  onReschedule: (date: Date, eventId: string) => void;
  onEventClick: (id: string) => void;
  onDayClick: (date: Date) => void;
  onSetAod: (date: Date, userId: string) => void;
  onClearAod: (date: Date) => void;
}) {
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
          const iso = toISODate(d);
          const dayEvents = eventsByDate.get(iso) || [];
          const shown = dayEvents.slice(0, 3);
          const extra = dayEvents.length - shown.length;
          const aodUserId = aodByDate.get(iso);
          const aodUser = aodUserId ? usersById.get(aodUserId) : undefined;

          return (
            <DropCell
              key={i}
              onCreate={(payload) => onCreate(d, payload)}
              onReschedule={(eventId) => onReschedule(d, eventId)}
              onClick={() => onDayClick(d)}
              className={`relative p-1.5 min-h-0 cursor-pointer transition-colors hover:bg-warm-bg/40 overflow-hidden ${
                isLastCol ? '' : 'border-r'
              } ${isLastRow ? '' : 'border-b'} border-gray-100`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <AodSlot
                  user={aodUser}
                  onSet={(userId) => onSetAod(d, userId)}
                  onClear={() => onClearAod(d)}
                  compact
                />
                <span
                  className={`inline-flex items-center justify-center text-xs font-semibold w-6 h-6 rounded-full transition-colors shrink-0 ${
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
              <div className="space-y-0.5">
                {shown.map((ev) => (
                  <EventChip key={ev.id} ev={ev} usersById={usersById} onClick={onEventClick} />
                ))}
                {extra > 0 && (
                  <div
                    className="text-[10px] font-semibold text-foreground/40 px-1"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    +{extra} more
                  </div>
                )}
              </div>
            </DropCell>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Week view
// ------------------------------------------------------------

function WeekView({
  days,
  today,
  eventsByDate,
  usersById,
  onCreate,
  onReschedule,
  onResize,
  onEventClick,
  onDayClick,
}: {
  days: Date[];
  today: Date;
  eventsByDate: Map<string, EventRow[]>;
  usersById: Map<string, UserRow>;
  onCreate: (date: Date, hour: number, payload: DragPayload) => void;
  onReschedule: (date: Date, hour: number, eventId: string) => void;
  onResize: (eventId: string, newStart: number, newEnd: number) => void;
  onEventClick: (id: string) => void;
  onDayClick: (date: Date) => void;
}) {
  // Per-day sunrise/sunset so each column shows its own light band.
  const daySun = useMemo(
    () =>
      days.map((d) => {
        const { sunrise, sunset } = sunTimes(d);
        const span = DAY_END_H - DAY_START_H;
        const sunrisePct = Math.max(0, Math.min(100, ((sunrise - DAY_START_H) / span) * 100));
        const sunsetPct = Math.max(0, Math.min(100, ((sunset - DAY_START_H) / span) * 100));
        const gradient = `linear-gradient(to bottom,
          rgba(28, 32, 68, 0.20) 0%,
          rgba(255, 168, 96, 0.16) ${Math.max(0, sunrisePct - 4)}%,
          rgba(255, 220, 160, 0.04) ${Math.min(100, sunrisePct + 4)}%,
          rgba(255, 245, 220, 0.00) ${Math.max(0, (sunrisePct + sunsetPct) / 2)}%,
          rgba(255, 200, 130, 0.05) ${Math.max(0, sunsetPct - 6)}%,
          rgba(232, 110, 60, 0.20) ${sunsetPct}%,
          rgba(70, 45, 90, 0.25) ${Math.min(100, sunsetPct + 6)}%,
          rgba(18, 20, 55, 0.36) 100%)`;
        return { sunrise, sunset, sunrisePct, sunsetPct, gradient };
      }),
    [days]
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="grid border-b border-gray-100 bg-warm-bg/30 shrink-0"
        style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))' }}
      >
        <div />
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          const { sunrise, sunset } = daySun[i];
          return (
            <button
              key={i}
              type="button"
              onClick={() => onDayClick(d)}
              className="py-2 text-center border-l border-gray-100 hover:bg-warm-bg/60 transition-colors cursor-pointer group"
              title="Open day view"
            >
              <div
                className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {DAYS_SHORT[d.getDay()]}
              </div>
              <div
                className={`mt-0.5 inline-flex items-center justify-center text-sm font-semibold w-8 h-8 rounded-full transition-colors ${
                  isToday
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-foreground/70 group-hover:bg-warm-bg'
                }`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {d.getDate()}
              </div>
              <div
                className="mt-0.5 flex items-center justify-center gap-1 text-[9px] text-foreground/45"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <svg className="w-2.5 h-2.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v3" />
                  <path d="M3 18h18" />
                  <path d="M6 18a6 6 0 0 1 12 0" />
                </svg>
                {formatDecimalTime(sunrise)}
                <span className="text-foreground/25">·</span>
                <svg className="w-2.5 h-2.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 10V3" />
                  <path d="M3 18h18" />
                  <path d="M6 18a6 6 0 0 1 12 0" />
                  <path d="m8 6 4 4 4-4" />
                </svg>
                {formatDecimalTime(sunset)}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-h-0 relative">
        {/* Per-day gradient overlays sit behind the grid cells. */}
        <div
          key={days.map(toISODate).join('|')}
          className="pointer-events-none absolute inset-0 grid animate-cal-fade"
          style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))' }}
          aria-hidden="true"
        >
          <div />
          {daySun.map((s, i) => (
            <div key={i} style={{ background: s.gradient }} />
          ))}
        </div>
        <div
          className="grid h-full relative"
          style={{
            gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))',
            gridTemplateRows: `repeat(${HOURS.length}, minmax(0, 1fr))`,
          }}
        >
          {HOURS.map((h) => (
            <React.Fragment key={h}>
              <div
                className="text-[10px] font-semibold text-foreground/40 pr-2 text-right pt-1 -translate-y-1"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {formatHour(h)}
              </div>
              {days.map((d, di) => (
                <DropCell
                  key={di}
                  onCreate={(payload) => onCreate(d, h, payload)}
                  onReschedule={(eventId) => onReschedule(d, h, eventId)}
                  className="border-l border-t border-gray-100 hover:bg-warm-bg/20 transition-colors relative min-h-0"
                />
              ))}
            </React.Fragment>
          ))}
        </div>
        {/* Event overlay — positioned events spanning their full duration */}
        <div
          className="pointer-events-none absolute inset-0 grid"
          style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))' }}
        >
          <div />
          {days.map((d, di) => {
            const dayEvents = (eventsByDate.get(toISODate(d)) || []).filter(
              (ev) => parseTime(ev.start_time) != null
            );
            return (
              <div key={di} className="relative pointer-events-auto" data-resize-container>
                {dayEvents.map((ev) => (
                  <ResizableEvent
                    key={ev.id}
                    ev={ev}
                    usersById={usersById}
                    onClick={onEventClick}
                    onResize={onResize}
                    totalHours={HOURS.length}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Day view
// ------------------------------------------------------------

function DayView({
  day,
  today,
  eventsByDate,
  usersById,
  aodByDate,
  onCreate,
  onReschedule,
  onResize,
  onEventClick,
  onSetAod,
  onClearAod,
}: {
  day: Date;
  today: Date;
  eventsByDate: Map<string, EventRow[]>;
  usersById: Map<string, UserRow>;
  aodByDate: Map<string, string>;
  onCreate: (date: Date, hour: number, payload: DragPayload) => void;
  onReschedule: (date: Date, hour: number, eventId: string) => void;
  onResize: (eventId: string, newStart: number, newEnd: number) => void;
  onEventClick: (id: string) => void;
  onSetAod: (date: Date, userId: string) => void;
  onClearAod: (date: Date) => void;
}) {
  const isToday = isSameDay(day, today);
  const iso = toISODate(day);
  const dayEvents = eventsByDate.get(iso) || [];
  const timedEvents = dayEvents.filter((ev) => parseTime(ev.start_time) != null);
  const aodUserId = aodByDate.get(iso);
  const aodUser = aodUserId ? usersById.get(aodUserId) : undefined;

  const { sunrise, sunset } = useMemo(() => sunTimes(day), [day]);

  // Map a decimal hour to a vertical percentage within the visible hour band.
  const pctFor = (h: number) => {
    const span = DAY_END_H - DAY_START_H;
    return Math.max(0, Math.min(100, ((h - DAY_START_H) / span) * 100));
  };
  const sunrisePct = pctFor(sunrise);
  const sunsetPct = pctFor(sunset);

  // Gradient stops — dawn / day / dusk / night with soft transitions.
  const gradient = `linear-gradient(to bottom,
    rgba(28, 32, 68, 0.22) 0%,
    rgba(255, 168, 96, 0.18) ${Math.max(0, sunrisePct - 4)}%,
    rgba(255, 220, 160, 0.05) ${Math.min(100, sunrisePct + 4)}%,
    rgba(255, 245, 220, 0.00) ${Math.max(0, (sunrisePct + sunsetPct) / 2)}%,
    rgba(255, 200, 130, 0.06) ${Math.max(0, sunsetPct - 6)}%,
    rgba(232, 110, 60, 0.22) ${sunsetPct}%,
    rgba(70, 45, 90, 0.28) ${Math.min(100, sunsetPct + 6)}%,
    rgba(18, 20, 55, 0.40) 100%)`;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="py-3 px-5 border-b border-gray-100 bg-warm-bg/30 flex items-center justify-between gap-4 shrink-0">
        <div className="flex-1 flex items-center gap-2">
          <AodSlot
            user={aodUser}
            onSet={(userId) => onSetAod(day, userId)}
            onClear={() => onClearAod(day)}
          />
        </div>
        <div className="text-center">
          <div
            className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {DAYS_FULL[day.getDay()]}
          </div>
          <div
            className={`mt-0.5 inline-flex items-center justify-center text-lg font-bold w-10 h-10 rounded-full transition-colors ${
              isToday ? 'bg-primary text-white shadow-sm' : 'text-foreground'
            }`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {day.getDate()}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-end gap-3 text-[11px]" style={{ fontFamily: 'var(--font-body)' }}>
          <span className="inline-flex items-center gap-1 text-foreground/60" title="Sunrise">
            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v3" />
              <path d="m5.6 9.6 2 2" />
              <path d="m16.4 11.6 2-2" />
              <path d="M3 18h18" />
              <path d="M6 18a6 6 0 0 1 12 0" />
            </svg>
            {formatDecimalTime(sunrise)}
          </span>
          <span className="inline-flex items-center gap-1 text-foreground/60" title="Sunset">
            <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 10V3" />
              <path d="m5.6 9.6 2 2" />
              <path d="m16.4 11.6 2-2" />
              <path d="M3 18h18" />
              <path d="M6 18a6 6 0 0 1 12 0" />
              <path d="m8 6 4 4 4-4" />
            </svg>
            {formatDecimalTime(sunset)}
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">
        {/* Sunrise/sunset gradient overlay — sits behind cells, above bg */}
        <div
          key={iso}
          className="pointer-events-none absolute inset-0 animate-cal-fade"
          style={{ background: gradient, left: '80px' }}
          aria-hidden="true"
        />
        {/* Sunrise marker line */}
        {sunrise > DAY_START_H && sunrise < DAY_END_H && (
          <div
            className="pointer-events-none absolute left-[80px] right-0 border-t border-dashed border-amber-400/40 flex items-center"
            style={{ top: `${sunrisePct}%` }}
            aria-hidden="true"
          >
            <span className="ml-2 text-[9px] font-semibold uppercase tracking-wider text-amber-600/80 bg-white/60 px-1 rounded">
              Sunrise {formatDecimalTime(sunrise)}
            </span>
          </div>
        )}
        {/* Sunset marker line */}
        {sunset > DAY_START_H && sunset < DAY_END_H && (
          <div
            className="pointer-events-none absolute left-[80px] right-0 border-t border-dashed border-orange-500/40 flex items-center z-10"
            style={{ top: `${sunsetPct}%` }}
            aria-hidden="true"
          >
            <span className="ml-2 text-[9px] font-semibold uppercase tracking-wider text-orange-600/80 bg-white/60 px-1 rounded">
              Sunset {formatDecimalTime(sunset)}
            </span>
          </div>
        )}
        <div
          className="grid h-full relative"
          style={{
            gridTemplateColumns: '80px 1fr',
            gridTemplateRows: `repeat(${HOURS.length}, minmax(0, 1fr))`,
          }}
        >
          {HOURS.map((h) => (
            <React.Fragment key={h}>
              <div
                className="text-xs font-semibold text-foreground/40 pr-3 text-right pt-1 -translate-y-1"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {formatHour(h)}
              </div>
              <DropCell
                onCreate={(payload) => onCreate(day, h, payload)}
                onReschedule={(eventId) => onReschedule(day, h, eventId)}
                className="border-l border-t border-gray-100 hover:bg-warm-bg/20 transition-colors relative min-h-0"
              />
            </React.Fragment>
          ))}
        </div>
        {/* Event overlay */}
        <div
          className="pointer-events-none absolute inset-0 grid"
          style={{ gridTemplateColumns: '80px 1fr' }}
        >
          <div />
          <div className="relative pointer-events-auto" data-resize-container>
            {timedEvents.map((ev) => (
              <ResizableEvent
                key={ev.id}
                ev={ev}
                usersById={usersById}
                onClick={onEventClick}
                onResize={onResize}
                totalHours={HOURS.length}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Edit modal — click an event to open. Handles title, notes, time,
// all-day toggle, save, and delete with confirmation.
// ------------------------------------------------------------

function EditModal({
  event,
  onClose,
  onSave,
  onDelete,
}: {
  event: EventRow;
  onClose: () => void;
  onSave: (patch: Partial<EventRow>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(event.title);
  const [notes, setNotes] = useState(event.notes || '');
  const [allDay, setAllDay] = useState(event.start_time == null);
  const initialStart = parseTime(event.start_time) ?? 9;
  const initialEnd = parseTime(event.end_time) ?? initialStart + 1;
  const [startHour, setStartHour] = useState(initialStart);
  const [endHour, setEndHour] = useState(initialEnd);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const color = event.color || colorFor(event.subject_id);

  const dirty =
    title !== event.title ||
    (notes || '') !== (event.notes || '') ||
    allDay !== (event.start_time == null) ||
    (!allDay && parseTime(event.start_time) !== startHour) ||
    (!allDay && parseTime(event.end_time) !== endHour);

  function handleSave() {
    if (!title.trim()) return;
    const patch: Partial<EventRow> = {
      title: title.trim(),
      notes,
      start_time: allDay ? null : `${String(startHour).padStart(2, '0')}:00:00`,
      end_time: allDay ? null : `${String(endHour).padStart(2, '0')}:00:00`,
    };
    onSave(patch);
    onClose();
  }

  const dateLabel = (() => {
    const [y, m, d] = event.event_date.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return `${DAYS_FULL[dt.getDay()]}, ${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-cal-fade"
      onMouseDown={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-cal-event"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Accent bar */}
        <div className="h-1" style={{ backgroundColor: color }} />

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span
                className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {event.subject_kind === 'group' ? 'Group' : 'Team member'} event
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-warm-bg text-foreground/40 hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && dirty) handleSave();
            }}
            placeholder="Event title"
            className="w-full text-lg font-semibold text-foreground px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          />

          <div
            className="text-xs text-foreground/50 mb-4 flex items-center gap-2"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {dateLabel}
          </div>

          <label
            className="flex items-center gap-2 mb-4 cursor-pointer select-none"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30"
            />
            <span className="text-sm text-foreground/70">All day</span>
          </label>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label
                  className="block text-[11px] font-semibold text-foreground/50 uppercase tracking-wider mb-1"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Starts
                </label>
                <select
                  value={startHour}
                  onChange={(e) => {
                    const h = Number(e.target.value);
                    setStartHour(h);
                    if (endHour <= h) setEndHour(Math.min(h + 1, 23));
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none text-sm bg-white"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {formatHour(h)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="block text-[11px] font-semibold text-foreground/50 uppercase tracking-wider mb-1"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Ends
                </label>
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none text-sm bg-white"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {HOURS.filter((h) => h > startHour).map((h) => (
                    <option key={h} value={h}>
                      {formatHour(h)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="mb-5">
            <label
              className="block text-[11px] font-semibold text-foreground/50 uppercase tracking-wider mb-1"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add details..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none text-sm resize-none"
              style={{ fontFamily: 'var(--font-body)' }}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600" style={{ fontFamily: 'var(--font-body)' }}>
                  Delete this event?
                </span>
                <button
                  onClick={onDelete}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold text-foreground/50 hover:text-foreground transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                </svg>
                Delete
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-foreground/60 hover:bg-warm-bg transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty || !title.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
