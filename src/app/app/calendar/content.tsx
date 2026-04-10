'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

// ------------------------------------------------------------
// Calendar — Phase 2: drag groups/users onto the grid, persist.
// Phase 1 delivered the month/week/day chrome; this layer adds the
// left palette, HTML5 drag-and-drop, and the calendar_events table
// round-trip. Phase 3 handles edit/delete, drag-to-reschedule, and
// extra polish.
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

interface DragPayload {
  kind: SubjectKind;
  id: string;
  label: string;
  color: string;
}

const DRAG_MIME = 'application/x-cal-subject';

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
function formatHour(h: number) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
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
  const [loading, setLoading] = useState(true);

  // Initial data fetch
  useEffect(() => {
    if (!session?.access_token) return;
    let alive = true;
    (async () => {
      const [g, u, e] = await Promise.all([
        db({ action: 'select', table: 'groups', order: { column: 'name', ascending: true } }),
        db({ action: 'select', table: 'users', select: 'id,full_name,email,avatar_url', order: { column: 'full_name', ascending: true } }),
        db({ action: 'select', table: 'calendar_events', order: { column: 'event_date', ascending: true } }),
      ]);
      if (!alive) return;
      if (Array.isArray(g)) setGroups(g as GroupRow[]);
      if (Array.isArray(u)) setUsers(u as UserRow[]);
      if (Array.isArray(e)) setEvents(e as EventRow[]);
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

  // ---- Drop handler: create a calendar_events row ----
  const handleDrop = useCallback(
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
            Drag a group or a user onto a day to schedule it.
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

      <div className="mb-4">
        <h2
          key={title}
          className="text-xl font-semibold text-foreground animate-cal-fade"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {title}
        </h2>
      </div>

      {/* Body: palette + calendar surface */}
      <div className="flex-1 grid gap-4" style={{ gridTemplateColumns: 'minmax(220px, 260px) 1fr' }}>
        <Palette groups={groups} users={users} loading={loading} />

        <div
          key={bodyKey}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-cal-fade"
        >
          {view === 'month' && (
            <MonthView
              days={monthDays}
              current={current}
              today={today}
              eventsByDate={eventsByDate}
              onDrop={(date) => (payload) => handleDrop(payload, date, null)}
            />
          )}
          {view === 'week' && (
            <WeekView
              days={weekDays}
              today={today}
              eventsByDate={eventsByDate}
              onDrop={(date, hour) => (payload) => handleDrop(payload, date, hour)}
            />
          )}
          {view === 'day' && (
            <DayView
              day={current}
              today={today}
              eventsByDate={eventsByDate}
              onDrop={(date, hour) => (payload) => handleDrop(payload, date, hour)}
            />
          )}
        </div>
      </div>
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
  const [tab, setTab] = useState<'groups' | 'users'>('groups');
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
          {(['groups', 'users'] as const).map((t) => (
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
          <EmptyMsg text="No users found" />
        ) : (
          filteredUsers.map((u) => (
            <DraggableChip key={u.id} kind="user" id={u.id} label={userLabel(u)} avatar={u.avatar_url} />
          ))
        )}
      </div>

      <div className="p-3 border-t border-gray-100 text-[11px] text-foreground/40 leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
        Drag a chip onto a day (month view) or a time slot (week / day view) to schedule it.
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
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
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
        dragging ? 'opacity-40 scale-95' : 'hover:bg-warm-bg/40 hover:shadow-sm'
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
// Drop target — wraps any child in a dragover-aware surface
// ------------------------------------------------------------

function DropCell({
  onDropPayload,
  className = '',
  activeClassName = 'animate-cal-drop',
  children,
}: {
  onDropPayload: (p: DragPayload) => void;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
}) {
  const [over, setOver] = useState(false);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (Array.from(e.dataTransfer.types).includes(DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (!over) setOver(true);
    }
  };
  const onDragLeave = () => setOver(false);
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as DragPayload;
      onDropPayload(payload);
    } catch {
      /* malformed payload — ignore */
    }
  };

  return (
    <div
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
// Event chips
// ------------------------------------------------------------

function EventChip({ ev }: { ev: EventRow }) {
  const color = ev.color || colorFor(ev.subject_id);
  const hour = parseTime(ev.start_time);
  return (
    <div
      className="animate-cal-event px-2 py-0.5 rounded text-[11px] font-medium truncate cursor-default"
      style={{
        backgroundColor: color + '22',
        color,
        borderLeft: `2px solid ${color}`,
        fontFamily: 'var(--font-body)',
      }}
      title={ev.title + (hour != null ? ` · ${formatHour(hour)}` : '')}
    >
      {hour != null && <span className="opacity-70 mr-1">{formatHour(hour).replace(' ', '')}</span>}
      {ev.title}
    </div>
  );
}

function TimedEventBlock({ ev }: { ev: EventRow }) {
  const color = ev.color || colorFor(ev.subject_id);
  return (
    <div
      className="animate-cal-event mx-1 px-2 py-1 rounded text-[11px] font-semibold truncate cursor-default shadow-sm"
      style={{
        backgroundColor: color + '26',
        color,
        borderLeft: `3px solid ${color}`,
        fontFamily: 'var(--font-body)',
      }}
      title={ev.title}
    >
      {ev.title}
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
  onDrop,
}: {
  days: Date[];
  current: Date;
  today: Date;
  eventsByDate: Map<string, EventRow[]>;
  onDrop: (date: Date) => (payload: DragPayload) => void;
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
          const dayEvents = eventsByDate.get(toISODate(d)) || [];
          const shown = dayEvents.slice(0, 3);
          const extra = dayEvents.length - shown.length;

          return (
            <DropCell
              key={i}
              onDropPayload={onDrop(d)}
              className={`relative p-1.5 min-h-[96px] transition-colors hover:bg-warm-bg/40 ${
                isLastCol ? '' : 'border-r'
              } ${isLastRow ? '' : 'border-b'} border-gray-100`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex items-center justify-center text-xs font-semibold w-6 h-6 rounded-full transition-colors ${
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
                  <EventChip key={ev.id} ev={ev} />
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
  onDrop,
}: {
  days: Date[];
  today: Date;
  eventsByDate: Map<string, EventRow[]>;
  onDrop: (date: Date, hour: number) => (payload: DragPayload) => void;
}) {
  return (
    <div className="flex flex-col h-full overflow-auto">
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
              {days.map((d, di) => {
                const dayEvents = eventsByDate.get(toISODate(d)) || [];
                const slot = dayEvents.filter((ev) => parseTime(ev.start_time) === h);
                return (
                  <DropCell
                    key={di}
                    onDropPayload={onDrop(d, h)}
                    className="h-16 border-l border-t border-gray-100 hover:bg-warm-bg/30 transition-colors relative overflow-hidden"
                  >
                    <div className="flex flex-col gap-0.5 py-0.5">
                      {slot.map((ev) => (
                        <TimedEventBlock key={ev.id} ev={ev} />
                      ))}
                    </div>
                  </DropCell>
                );
              })}
            </React.Fragment>
          ))}
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
  onDrop,
}: {
  day: Date;
  today: Date;
  eventsByDate: Map<string, EventRow[]>;
  onDrop: (date: Date, hour: number) => (payload: DragPayload) => void;
}) {
  const isToday = isSameDay(day, today);
  const dayEvents = eventsByDate.get(toISODate(day)) || [];

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
          {HOURS.map((h) => {
            const slot = dayEvents.filter((ev) => parseTime(ev.start_time) === h);
            return (
              <React.Fragment key={h}>
                <div
                  className="text-xs font-semibold text-foreground/40 pr-3 text-right pt-1 -translate-y-1"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {formatHour(h)}
                </div>
                <DropCell
                  onDropPayload={onDrop(day, h)}
                  className="h-20 border-l border-t border-gray-100 hover:bg-warm-bg/30 transition-colors relative overflow-hidden"
                >
                  <div className="flex flex-col gap-1 p-1">
                    {slot.map((ev) => (
                      <TimedEventBlock key={ev.id} ev={ev} />
                    ))}
                  </div>
                </DropCell>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
