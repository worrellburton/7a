'use client';

// Schedule Posts → recurring schedule slots.
//
// Replaces the simple Ayrshare-scheduled-queue view with a richer
// surface:
//   - View toggle: List | Calendar.
//   - "Add schedule" button opens a modal that builds a recurring
//     slot (daily / every-other-day / weekly with day-picker /
//     biweekly with day-picker) plus a time of day.
//   - Drag a Ready-to-go draft (sidebar strip) onto a future slot
//     occurrence to fire-and-forget schedule it via the existing
//     /api/social-media/post Ayrshare endpoint with scheduleDate
//     pinned to that occurrence's UTC datetime.
//
// Slot definitions live in public.social_media_schedule_slots and
// are visible to every staff user (the team posts on a shared
// cadence); deletions are owner-only and enforced by RLS.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';

/* ── Types ───────────────────────────────────────────────────── */

export interface ScheduleSlot {
  id: string;
  created_by: string;
  name: string;
  rrule_kind: 'daily' | 'every-other-day' | 'weekly' | 'biweekly';
  days_of_week: number[] | null;
  hour: number;
  minute: number;
  anchor_date: string;
  created_at: string;
}

export interface ReadyDraft {
  id: string;
  caption: string;
  mediaUrls: string[];
  createdAt: string;
}

export interface ConnectedPlatform {
  id: string;
}

interface ScheduledPostLite {
  id: string;
  scheduleDate: string;
  post: string;
  platforms: string[];
}

interface ScheduleSlotsPanelProps {
  readyDrafts: ReadyDraft[];
  connectedPlatforms: string[];
  scheduledPosts: ScheduledPostLite[];
  onPostScheduled: () => void;
}

/* ── Recurrence math ─────────────────────────────────────────── */

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function occurrencesFor(
  slot: ScheduleSlot,
  from: Date,
  count: number,
): Date[] {
  const out: Date[] = [];
  const cursor = new Date(from);
  // Start scanning from the slot's local time today.
  cursor.setHours(slot.hour, slot.minute, 0, 0);
  // If today's instance has already passed, the first iteration
  // will skip it via the `> from` guard below.

  // Cap the scan so a pathological rule (no matching day-of-week)
  // can't loop forever.
  const ceiling = 366;
  let stepped = 0;
  while (out.length < count && stepped < ceiling) {
    const matches = matchesRule(slot, cursor);
    if (matches && cursor.getTime() > from.getTime()) out.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(slot.hour, slot.minute, 0, 0);
    stepped++;
  }
  return out;
}

function matchesRule(slot: ScheduleSlot, date: Date): boolean {
  const anchor = new Date(slot.anchor_date + 'T00:00:00');
  const daysSinceAnchor = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
      - Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()))
      / 86_400_000,
  );
  switch (slot.rrule_kind) {
    case 'daily':
      return true;
    case 'every-other-day':
      return daysSinceAnchor >= 0 && daysSinceAnchor % 2 === 0;
    case 'weekly':
      return !!slot.days_of_week?.includes(date.getDay());
    case 'biweekly': {
      if (!slot.days_of_week?.includes(date.getDay())) return false;
      // Two-week parity from the anchor.
      const weeks = Math.floor(daysSinceAnchor / 7);
      return weeks >= 0 && weeks % 2 === 0;
    }
  }
}

function describeRule(slot: ScheduleSlot): string {
  const time = formatTime(slot.hour, slot.minute);
  switch (slot.rrule_kind) {
    case 'daily':
      return `Every day at ${time}`;
    case 'every-other-day':
      return `Every other day at ${time}`;
    case 'weekly':
      return `Weekly · ${(slot.days_of_week ?? []).map((d) => DAY_LABELS[d]).join(' · ')} at ${time}`;
    case 'biweekly':
      return `Every other week · ${(slot.days_of_week ?? []).map((d) => DAY_LABELS[d]).join(' · ')} at ${time}`;
  }
}

function formatTime(hour: number, minute: number): string {
  const h12 = ((hour + 11) % 12) + 1;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
}

/* ── Main panel ──────────────────────────────────────────────── */

export default function ScheduleSlotsPanel({
  readyDrafts,
  connectedPlatforms,
  scheduledPosts,
  onPostScheduled,
}: ScheduleSlotsPanelProps) {
  const { session } = useAuth();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!session?.access_token) return;
    setError(null);
    const r = await fetch('/api/social-media/schedule-slots', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) { setError((json as { error?: string }).error ?? `HTTP ${r.status}`); setLoading(false); return; }
    setSlots(((json as { rows: ScheduleSlot[] }).rows) ?? []);
    setLoading(false);
  }, [session?.access_token]);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    const ch = supabase
      .channel('social-media-schedule-slots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_media_schedule_slots' }, () => void reload())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [reload]);

  const deleteSlot = useCallback(async (id: string) => {
    if (!session?.access_token) return;
    if (!confirm('Delete this schedule? Posts already queued on it will keep firing.')) return;
    await fetch(`/api/social-media/schedule-slots/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    await reload();
  }, [session?.access_token, reload]);

  // Drag-drop handler — fires a real Ayrshare-scheduled post.
  const scheduleDraftAt = useCallback(
    async (draft: ReadyDraft, at: Date) => {
      if (!session?.access_token) return;
      if (connectedPlatforms.length === 0) {
        setError('Connect at least one social account before scheduling.');
        return;
      }
      setError(null);
      const body: Record<string, unknown> = {
        post: draft.caption,
        platforms: connectedPlatforms,
        scheduleDate: at.toISOString(),
      };
      if (draft.mediaUrls.length > 0) body.mediaUrls = draft.mediaUrls;
      const r = await fetch('/api/social-media/post', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError((j as { error?: string; message?: string }).error ?? (j as { message?: string }).message ?? `HTTP ${r.status}`);
        return;
      }
      onPostScheduled();
    },
    [session?.access_token, connectedPlatforms, onPostScheduled],
  );

  return (
    <section className="rounded-2xl border border-black/10 bg-white px-4 py-4 lg:px-5 lg:py-5">
      <header className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Schedule slots</h2>
          <p className="text-[11px] text-foreground/45 mt-0.5">
            Drag a ready-to-go draft onto a future occurrence to queue it. Posts fire automatically via Ayrshare at that time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-black/10 bg-warm-bg/40 p-0.5">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold ${view === 'list' ? 'bg-white shadow-sm text-foreground' : 'text-foreground/55 hover:text-foreground'}`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold ${view === 'calendar' ? 'bg-white shadow-sm text-foreground' : 'text-foreground/55 hover:text-foreground'}`}
            >
              Calendar
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-foreground/85"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            + Add schedule
          </button>
        </div>
      </header>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800 mb-3" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="min-w-0">
          {loading ? (
            <p className="text-[12px] text-foreground/55 italic">Loading slots…</p>
          ) : slots.length === 0 ? (
            <EmptyState onAdd={() => setShowAdd(true)} />
          ) : view === 'list' ? (
            <SlotsList
              slots={slots}
              scheduledPosts={scheduledPosts}
              onDeleteSlot={deleteSlot}
              onDropDraft={scheduleDraftAt}
            />
          ) : (
            <CalendarView slots={slots} scheduledPosts={scheduledPosts} onDropDraft={scheduleDraftAt} />
          )}
        </div>
        <ReadyDraftsRail drafts={readyDrafts} />
      </div>

      {showAdd && (
        <AddScheduleModal
          accessToken={session?.access_token}
          onClose={() => setShowAdd(false)}
          onCreated={() => { void reload(); setShowAdd(false); }}
        />
      )}
    </section>
  );
}

/* ── Empty state ─────────────────────────────────────────────── */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-black/15 bg-warm-bg/30 px-6 py-10 text-center">
      <p className="text-sm text-foreground/70 max-w-md mx-auto mb-3" style={{ fontFamily: 'var(--font-body)' }}>
        No schedules yet. Add one — say, <em>Weekly · Mon · 9:00 AM</em> — then drag a ready draft onto its next occurrence to queue.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="px-3 py-1.5 rounded-md bg-primary text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-primary/90"
      >
        + Add schedule
      </button>
    </div>
  );
}

/* ── List view ───────────────────────────────────────────────── */

function SlotsList({
  slots,
  scheduledPosts,
  onDeleteSlot,
  onDropDraft,
}: {
  slots: ScheduleSlot[];
  scheduledPosts: ScheduledPostLite[];
  onDeleteSlot: (id: string) => void;
  onDropDraft: (draft: ReadyDraft, at: Date) => void;
}) {
  const now = new Date();
  return (
    <ul className="space-y-3">
      {slots.map((slot) => {
        const next = occurrencesFor(slot, now, 6);
        return (
          <li key={slot.id} className="rounded-xl border border-black/10 bg-white">
            <div className="px-4 py-3 flex items-baseline justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-foreground">{slot.name}</p>
                <p className="text-[11px] text-foreground/55 mt-0.5">{describeRule(slot)}</p>
              </div>
              <button
                type="button"
                onClick={() => onDeleteSlot(slot.id)}
                className="text-[10.5px] text-foreground/45 hover:text-red-700 uppercase tracking-wider"
              >
                Delete
              </button>
            </div>
            <div className="border-t border-black/5 px-4 py-2 flex gap-2 overflow-x-auto">
              {next.map((occ) => (
                <OccurrenceCell
                  key={occ.toISOString()}
                  at={occ}
                  scheduledPosts={scheduledPosts}
                  onDropDraft={onDropDraft}
                />
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ── Calendar view ───────────────────────────────────────────── */

function CalendarView({
  slots,
  scheduledPosts,
  onDropDraft,
}: {
  slots: ScheduleSlot[];
  scheduledPosts: ScheduledPostLite[];
  onDropDraft: (draft: ReadyDraft, at: Date) => void;
}) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const days = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);

  // For each day cell collect (slot, occurrenceDate) pairs that
  // fall on that day. Cheap — month grid is 42 days × N slots.
  const occByDay = useMemo(() => {
    const map = new Map<string, { slot: ScheduleSlot; at: Date }[]>();
    const start = new Date(monthCursor);
    start.setDate(1);
    const end = new Date(monthCursor);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
    for (const slot of slots) {
      const occs = occurrencesFor(slot, new Date(start.getTime() - 86_400_000), 70);
      for (const occ of occs) {
        if (occ < start || occ > end) continue;
        const key = ymd(occ);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({ slot, at: occ });
      }
    }
    return map;
  }, [slots, monthCursor]);

  const monthLabel = monthCursor.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12.5px] font-semibold text-foreground">{monthLabel}</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => { const d = new Date(monthCursor); d.setMonth(d.getMonth() - 1); setMonthCursor(d); }}
            className="px-2 py-1 rounded border border-black/10 text-[11px] hover:bg-warm-bg/60"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); setMonthCursor(d);
            }}
            className="px-2 py-1 rounded border border-black/10 text-[11px] hover:bg-warm-bg/60"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => { const d = new Date(monthCursor); d.setMonth(d.getMonth() + 1); setMonthCursor(d); }}
            className="px-2 py-1 rounded border border-black/10 text-[11px] hover:bg-warm-bg/60"
          >
            Next →
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-black/5 border border-black/10 rounded-lg overflow-hidden">
        {DAY_LABELS.map((d) => (
          <div key={d} className="bg-warm-bg/60 px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-foreground/55">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = day.getMonth() === monthCursor.getMonth();
          const items = occByDay.get(ymd(day)) ?? [];
          const isToday = ymd(day) === ymd(new Date());
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[88px] bg-white px-1.5 py-1 ${inMonth ? '' : 'bg-warm-bg/30 opacity-60'}`}
            >
              <p className={`text-[10.5px] tabular-nums ${isToday ? 'font-bold text-primary' : 'text-foreground/55'}`}>
                {day.getDate()}
              </p>
              <div className="mt-1 flex flex-col gap-1">
                {items.map((item, i) => (
                  <OccurrenceCell
                    key={i}
                    at={item.at}
                    scheduledPosts={scheduledPosts}
                    onDropDraft={onDropDraft}
                    label={`${item.slot.name} · ${formatTime(item.at.getHours(), item.at.getMinutes())}`}
                    compact
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildMonthGrid(monthStart: Date): Date[] {
  // 6 rows × 7 cols = 42 cells covering the month with leading /
  // trailing days for layout symmetry.
  const start = new Date(monthStart);
  start.setDate(1);
  start.setDate(1 - start.getDay());
  const out: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(d);
  }
  return out;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ── Single occurrence (drop target) ─────────────────────────── */

function OccurrenceCell({
  at,
  scheduledPosts,
  onDropDraft,
  label,
  compact = false,
}: {
  at: Date;
  scheduledPosts: ScheduledPostLite[];
  onDropDraft: (draft: ReadyDraft, at: Date) => void;
  label?: string;
  compact?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  // Match Ayrshare-scheduled posts to this occurrence's hour-minute
  // window (±5 min) so a slot occurrence visually picks up the
  // queued post once it lands.
  const matched = scheduledPosts.find((p) => {
    const t = Date.parse(p.scheduleDate);
    return Number.isFinite(t) && Math.abs(t - at.getTime()) < 5 * 60 * 1000;
  });

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-ready-draft')) {
      e.preventDefault();
      setDragOver(true);
    }
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/x-ready-draft');
      if (!raw) return;
      const draft = JSON.parse(raw) as ReadyDraft;
      onDropDraft(draft, at);
    } catch { /* ignore malformed payloads */ }
  };

  const display = label ?? `${at.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${formatTime(at.getHours(), at.getMinutes())}`;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`shrink-0 rounded-md border px-2 py-1.5 transition-all ${
        compact ? 'text-[9.5px]' : 'text-[11px]'
      } ${
        matched ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
        : dragOver ? 'bg-primary/10 border-primary/50 text-primary'
        : 'bg-white border-dashed border-black/15 text-foreground/55 hover:border-foreground/30'
      }`}
      title={matched ? 'Already queued for this slot' : 'Drop a ready-to-go draft here to schedule'}
    >
      <p className="font-semibold leading-tight">{display}</p>
      {matched && (
        <p className="text-[10px] leading-tight truncate mt-0.5">{(matched.post ?? '').slice(0, 32)}…</p>
      )}
    </div>
  );
}

/* ── Ready drafts rail ───────────────────────────────────────── */

function ReadyDraftsRail({ drafts }: { drafts: ReadyDraft[] }) {
  return (
    <aside className="lg:border-l lg:border-black/10 lg:pl-4">
      <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">
        Ready to go · {drafts.length}
      </p>
      {drafts.length === 0 ? (
        <p className="text-[11.5px] text-foreground/55 italic" style={{ fontFamily: 'var(--font-body)' }}>
          Mark drafts as Ready to go in Creative to drag them here.
        </p>
      ) : (
        // Thumbnail grid — the lead image is the post's primary
        // identifier when dragging onto a schedule cell. Caption
        // shows on hover so the rail stays scannable at a glance.
        <ul className="grid grid-cols-3 lg:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
          {drafts.map((d) => {
            const thumb = d.mediaUrls[0];
            return (
              <li
                key={d.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-ready-draft', JSON.stringify(d));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className="group relative rounded-lg overflow-hidden border border-emerald-200 bg-emerald-50/40 cursor-grab active:cursor-grabbing aspect-square"
                title={d.caption || '(no caption)'}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt={d.caption} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-warm-bg/40 text-[10px] text-foreground/45 px-1.5 text-center" style={{ fontFamily: 'var(--font-body)' }}>
                    No media
                  </div>
                )}
                <span className="absolute top-1 left-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white" aria-hidden />
                {/* Caption overlay revealed on hover. */}
                <div className="absolute inset-x-0 bottom-0 px-1.5 py-1 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] text-white leading-tight line-clamp-2" style={{ fontFamily: 'var(--font-body)' }}>
                    {d.caption || '(no caption)'}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

/* ── Add Schedule modal ──────────────────────────────────────── */

function AddScheduleModal({
  accessToken,
  onClose,
  onCreated,
}: {
  accessToken: string | undefined;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ScheduleSlot['rrule_kind']>('weekly');
  const [days, setDays] = useState<Set<number>>(new Set([1])); // Mon by default
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstFieldRef.current?.focus(); }, []);

  const toggleDay = (d: number) => {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  };

  const submit = async () => {
    if (!accessToken) return;
    if (!name.trim()) { setError('Give the schedule a name.'); return; }
    if ((kind === 'weekly' || kind === 'biweekly') && days.size === 0) {
      setError('Pick at least one day.'); return;
    }
    setSubmitting(true);
    setError(null);
    const r = await fetch('/api/social-media/schedule-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        name: name.trim(),
        rrule_kind: kind,
        days_of_week: kind === 'weekly' || kind === 'biweekly' ? Array.from(days).sort() : null,
        hour, minute,
      }),
    });
    setSubmitting(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setError((j as { error?: string }).error ?? `HTTP ${r.status}`);
      return;
    }
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden" role="dialog" aria-modal="true">
        <header className="px-5 py-4 border-b border-black/5">
          <h3 className="text-sm font-bold text-foreground">Add schedule</h3>
          <p className="text-[11.5px] text-foreground/55 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
            Recurring slot you can drop drafts onto.
          </p>
        </header>
        <div className="px-5 py-4 space-y-4">
          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">Name</span>
            <input
              ref={firstFieldRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monday Morning Inspiration"
              maxLength={80}
              className="mt-1 w-full px-3 py-2 rounded-md border border-black/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>

          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-1.5">Recurrence</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(['daily', 'every-other-day', 'weekly', 'biweekly'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`px-2.5 py-1.5 rounded-md border text-[11.5px] font-semibold transition-colors ${kind === k ? 'bg-foreground text-white border-foreground' : 'bg-white text-foreground/70 border-black/10 hover:bg-warm-bg/60'}`}
                >
                  {k === 'daily' && 'Daily'}
                  {k === 'every-other-day' && 'Every other day'}
                  {k === 'weekly' && 'Weekly'}
                  {k === 'biweekly' && 'Every other week'}
                </button>
              ))}
            </div>
          </div>

          {(kind === 'weekly' || kind === 'biweekly') && (
            <div>
              <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-1.5">Days</p>
              <div className="flex flex-wrap gap-1">
                {DAY_LABELS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`w-9 h-9 rounded-md border text-[11px] font-semibold ${days.has(i) ? 'bg-primary text-white border-primary' : 'bg-white text-foreground/65 border-black/10 hover:bg-warm-bg/60'}`}
                  >
                    {d.slice(0, 1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 items-center">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">Time</p>
            <select
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="px-2 py-1.5 rounded-md border border-black/10 text-[13px] tabular-nums"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
              ))}
            </select>
            <span className="text-foreground/50">:</span>
            <select
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
              className="px-2 py-1.5 rounded-md border border-black/10 text-[13px] tabular-nums"
            >
              {[0, 15, 30, 45].map((m) => (
                <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
              ))}
            </select>
            <span className="text-[11px] text-foreground/55">{formatTime(hour, minute)}</span>
          </div>

          {error && <p className="text-[11.5px] text-red-700" role="alert">{error}</p>}
        </div>
        <footer className="px-5 py-3 border-t border-black/5 bg-warm-bg/40 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-[11.5px] font-semibold hover:bg-warm-bg/60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="px-3 py-1.5 rounded-md bg-primary text-white text-[11.5px] font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? 'Adding…' : 'Add schedule'}
          </button>
        </footer>
      </div>
    </div>
  );
}
