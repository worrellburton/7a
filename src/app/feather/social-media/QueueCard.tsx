'use client';

// Posting queue — recurring weekly slots (Mon 09:00, Wed 09:00, …). Drag a
// Ready draft onto the card (or hit Queue on a tile) and it schedules into
// the next upcoming slot that isn't already taken, so the team doesn't pick
// a datetime every time. Slots are a shared app_flag; only super-admins edit
// them, but anyone can queue into them.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { usePostingEnabled } from './PostingStatus';
import type { ReadyDraft } from './ScheduleSlotsPanel';

interface Slot { weekday: number; time: string }

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Resolve the upcoming concrete datetimes for the configured slots over the
// next `weeks`, skipping any within a minute of an already-scheduled time.
function upcomingSlots(slots: Slot[], takenMs: number[], weeks = 6): Date[] {
  if (slots.length === 0) return [];
  const now = Date.now();
  const out: Date[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let day = 0; day <= weeks * 7; day++) {
    const d = new Date(base);
    d.setDate(base.getDate() + day);
    const wd = d.getDay();
    for (const s of slots.filter((x) => x.weekday === wd)) {
      const [h, m] = s.time.split(':').map(Number);
      const dt = new Date(d);
      dt.setHours(h, m, 0, 0);
      if (dt.getTime() <= now) continue;
      if (takenMs.some((t) => Math.abs(t - dt.getTime()) < 60_000)) continue;
      out.push(dt);
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}

export function QueueCard({
  connectedPlatforms,
  scheduledMs,
  onScheduled,
  injected,
}: {
  connectedPlatforms: string[];
  scheduledMs: number[];
  onScheduled: () => void;
  injected?: { draft: ReadyDraft; n: number } | null;
}) {
  const { session, isSuperAdmin } = useAuth();
  const postingEnabled = usePostingEnabled();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [newWeekday, setNewWeekday] = useState(1);
  const [newTime, setNewTime] = useState('09:00');

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/social-media/queue-slots', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j) { setSlots(Array.isArray(j.slots) ? j.slots : []); setLoaded(true); } })
      .catch(() => setLoaded(true));
    return () => { cancelled = true; };
  }, []);

  const saveSlots = useCallback(async (next: Slot[]) => {
    setSlots(next);
    try {
      await fetch('/api/social-media/queue-slots', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ slots: next }),
      });
    } catch { /* best-effort; UI already updated */ }
  }, [session?.access_token]);

  const upcoming = useMemo(() => upcomingSlots(slots, scheduledMs), [slots, scheduledMs]);

  const queueDraft = useCallback(async (draft: ReadyDraft) => {
    setMsg(null);
    if (postingEnabled === false) { setMsg({ kind: 'err', text: 'Posting is paused — switch it on first.' }); return; }
    const next = upcomingSlots(slots, scheduledMs)[0];
    if (!next) { setMsg({ kind: 'err', text: slots.length === 0 ? 'Add at least one queue slot first.' : 'No open slots in the next few weeks.' }); return; }
    const targets = (draft.platforms ?? []).filter((p) => connectedPlatforms.includes(p));
    const platforms = targets.length > 0 ? targets : connectedPlatforms;
    if (platforms.length === 0) { setMsg({ kind: 'err', text: 'No connected platforms for this draft.' }); return; }
    try {
      const body: Record<string, unknown> = { post: draft.caption, platforms, scheduleDate: next.toISOString() };
      if (draft.mediaUrls.length > 0) body.mediaUrls = draft.mediaUrls;
      const r = await fetch('/api/social-media/post', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ kind: 'err', text: (j as { error?: string }).error ?? `HTTP ${r.status}` }); return; }
      setMsg({ kind: 'ok', text: `Queued for ${next.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.` });
      onScheduled();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    }
  }, [slots, scheduledMs, connectedPlatforms, postingEnabled, session?.access_token, onScheduled]);

  // Touch / click path: a Queue button on a Ready tile injects the draft.
  useEffect(() => {
    if (!injected) return;
    void queueDraft(injected.draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injected?.n]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/x-ready-draft');
      if (!raw) return;
      void queueDraft(JSON.parse(raw) as ReadyDraft);
    } catch { /* malformed */ }
  };

  const addSlot = () => { void saveSlots([...slots, { weekday: newWeekday, time: newTime }]); };
  const removeSlot = (s: Slot) => { void saveSlots(slots.filter((x) => !(x.weekday === s.weekday && x.time === s.time))); };

  return (
    <section
      onDragOver={(e) => { if (e.dataTransfer.types.includes('application/x-ready-draft')) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`rounded-2xl border bg-white px-4 py-4 lg:px-5 lg:py-5 transition-colors ${dragOver ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.02]' : 'border-black/10'}`}
    >
      <div className="mb-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Posting queue</h2>
        <p className="text-[11px] text-foreground/45 mt-0.5">
          Drag a Ready draft here (or hit <strong>Queue</strong> on a tile) to schedule it into the next open slot.
        </p>
      </div>

      {msg && (
        <p className={`rounded-lg px-3 py-2 text-xs mb-3 ${msg.kind === 'ok' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {msg.text}
        </p>
      )}

      {/* Slot config — editable by super-admins, read-only chips otherwise. */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {slots.length === 0 && loaded && (
          <span className="text-[11.5px] text-foreground/45" style={{ fontFamily: 'var(--font-body)' }}>No slots yet.</span>
        )}
        {slots.map((s) => (
          <span key={`${s.weekday}|${s.time}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black/10 bg-warm-bg/30 text-[11px] font-semibold text-foreground/70">
            {WEEKDAYS[s.weekday]} {s.time}
            {isSuperAdmin && (
              <button type="button" onClick={() => removeSlot(s)} className="text-foreground/40 hover:text-rose-700" aria-label="Remove slot">✕</button>
            )}
          </span>
        ))}
      </div>

      {isSuperAdmin && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <select value={newWeekday} onChange={(e) => setNewWeekday(Number(e.target.value))} className="rounded-lg border border-black/10 bg-white px-2 py-1 text-[12px]" aria-label="Slot weekday">
            {WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}
          </select>
          <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="rounded-lg border border-black/10 bg-white px-2 py-1 text-[12px]" aria-label="Slot time" />
          <button type="button" onClick={addSlot} className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60">+ Add slot</button>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/40 mb-1">Next open slots</p>
          <div className="flex flex-wrap gap-1.5">
            {upcoming.slice(0, 5).map((d, i) => (
              <span key={d.toISOString()} className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${i === 0 ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-warm-bg/40 text-foreground/55 border border-black/5'}`}>
                {d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
