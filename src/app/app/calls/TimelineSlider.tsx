'use client';

import { useMemo, useRef, useState } from 'react';

// Elegant date-range slider with draggable start + end handles, a highlighted
// selection band, and tiny activity-density bars overlaid above the track so
// you can see where the calls are. Drag the handles, or grab the band to pan
// the whole selection. Snaps to days. Keyboard-friendly (handles are focusable
// and arrow keys nudge by ±1 day).
export function TimelineSlider({
  min,
  max,
  start,
  end,
  activityByDay,
  onChange,
}: {
  min: Date;
  max: Date;
  start: Date;
  end: Date;
  activityByDay: Map<string, number>;
  onChange: (start: Date, end: Date) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<null | { kind: 'start' | 'end' | 'band'; startX: number; startMs: number; endMs: number }>(null);

  const totalMs = Math.max(1, max.getTime() - min.getTime());
  const dayMs = 24 * 60 * 60 * 1000;
  const startPct = (start.getTime() - min.getTime()) / totalMs;
  const endPct = (end.getTime() - min.getTime()) / totalMs;

  // Month ticks across the range.
  const months = useMemo(() => {
    const out: { date: Date; pct: number; label: string; isYearStart: boolean }[] = [];
    const cursor = new Date(min.getFullYear(), min.getMonth(), 1);
    if (cursor.getTime() < min.getTime()) cursor.setMonth(cursor.getMonth() + 1);
    while (cursor.getTime() <= max.getTime()) {
      const pct = (cursor.getTime() - min.getTime()) / totalMs;
      out.push({
        date: new Date(cursor),
        pct,
        label: cursor.toLocaleDateString('en-US', { month: 'short' }),
        isYearStart: cursor.getMonth() === 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }, [min, max, totalMs]);

  // Day-by-day activity bars (one per day across the full range).
  // Each bar carries its own start/end so click handlers can snap
  // the timeline to exactly that day without recomputing from a
  // pixel position.
  const activityBars = useMemo(() => {
    const bars: {
      pct: number;
      widthPct: number;
      count: number;
      dateStr: string;
      startMs: number;
      endMs: number;
    }[] = [];
    let peak = 1;
    activityByDay.forEach(v => { if (v > peak) peak = v; });
    const startDay = new Date(min); startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(max); endDay.setHours(0, 0, 0, 0);
    const cursor = new Date(startDay);
    while (cursor.getTime() <= endDay.getTime()) {
      const dateStr = cursor.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
      const count = activityByDay.get(dateStr) || 0;
      if (count > 0) {
        const t = cursor.getTime();
        const dayStart = new Date(t); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(t); dayEnd.setHours(23, 59, 59, 999);
        bars.push({
          pct: (t - min.getTime()) / totalMs,
          widthPct: (dayMs / totalMs) * 100,
          count: count / peak,
          dateStr,
          startMs: dayStart.getTime(),
          endMs: dayEnd.getTime(),
        });
      }
      cursor.setTime(cursor.getTime() + dayMs);
    }
    return bars;
  }, [activityByDay, min, max, totalMs, dayMs]);

  const snapToDay = (ms: number, side: 'start' | 'end') => {
    const d = new Date(ms);
    if (side === 'start') d.setHours(0, 0, 0, 0);
    else d.setHours(23, 59, 59, 999);
    return d;
  };

  const pctToMs = (pct: number) => min.getTime() + Math.max(0, Math.min(1, pct)) * totalMs;

  const onPointerDown = (kind: 'start' | 'end' | 'band') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDragging({ kind, startX: e.clientX, startMs: start.getTime(), endMs: end.getTime() });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const deltaMs = ((e.clientX - dragging.startX) / rect.width) * totalMs;
    if (dragging.kind === 'start') {
      const next = Math.min(dragging.startMs + deltaMs, dragging.endMs - dayMs);
      onChange(snapToDay(Math.max(min.getTime(), next), 'start'), end);
    } else if (dragging.kind === 'end') {
      const next = Math.max(dragging.endMs + deltaMs, dragging.startMs + dayMs);
      onChange(start, snapToDay(Math.min(max.getTime(), next), 'end'));
    } else {
      // Band: pan both, clamped.
      let newStart = dragging.startMs + deltaMs;
      let newEnd = dragging.endMs + deltaMs;
      const span = dragging.endMs - dragging.startMs;
      if (newStart < min.getTime()) { newStart = min.getTime(); newEnd = newStart + span; }
      if (newEnd > max.getTime()) { newEnd = max.getTime(); newStart = newEnd - span; }
      onChange(snapToDay(newStart, 'start'), snapToDay(newEnd, 'end'));
    }
  };

  const onPointerUp = () => setDragging(null);

  const onTrackClick = (e: React.MouseEvent) => {
    if (!trackRef.current || dragging) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const clickedMs = pctToMs(pct);
    // Keep the current span; center it near the click point.
    const span = end.getTime() - start.getTime();
    let newStart = clickedMs - span / 2;
    let newEnd = clickedMs + span / 2;
    if (newStart < min.getTime()) { newStart = min.getTime(); newEnd = newStart + span; }
    if (newEnd > max.getTime()) { newEnd = max.getTime(); newStart = newEnd - span; }
    onChange(snapToDay(newStart, 'start'), snapToDay(newEnd, 'end'));
  };

  const nudgeStart = (days: number) => {
    const next = new Date(start.getTime() + days * dayMs);
    if (next.getTime() >= min.getTime() && next.getTime() < end.getTime()) onChange(snapToDay(next.getTime(), 'start'), end);
  };
  const nudgeEnd = (days: number) => {
    const next = new Date(end.getTime() + days * dayMs);
    if (next.getTime() > start.getTime() && next.getTime() <= max.getTime()) onChange(start, snapToDay(next.getTime(), 'end'));
  };

  const azParts = (d: Date) => {
    const parts = d.toLocaleDateString('en-US', { timeZone: 'America/Phoenix', month: 'short', day: 'numeric', year: 'numeric' }).split(' ');
    return { month: parts[0], day: parts[1]?.replace(',', '') ?? '', year: parts[2] ?? '' };
  };
  const rangeLabel = (() => {
    const s = azParts(start);
    const e = azParts(end);
    if (s.month === e.month && s.year === e.year) {
      return `${s.month} ${s.day} – ${e.day}, ${e.year}`;
    }
    return `${s.month} ${s.day} – ${e.month} ${e.day}, ${e.year}`;
  })();

  const spanDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs));

  // Phoenix is MST year round (UTC-7, no DST) so a given Phoenix calendar day
  // is always the UTC range [date 07:00, nextDate 07:00). Build Today /
  // Yesterday / preset ranges in that frame so the rest of the page (which
  // buckets calls by Phoenix date) lines up regardless of the user's tz.
  const phoenixDayBounds = (offsetDays: number) => {
    const nowAz = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
    const [yy, mo, dd] = nowAz.split('-').map(Number);
    const startMs = Date.UTC(yy, mo - 1, dd + offsetDays, 7, 0, 0, 0);
    const endMs = startMs + dayMs - 1;
    return [startMs, endMs] as const;
  };

  const setPreset = (days: number) => {
    const [, todayEnd] = phoenixDayBounds(0);
    const newEnd = new Date(Math.min(max.getTime(), todayEnd));
    const newStart = new Date(Math.max(min.getTime(), newEnd.getTime() - (days - 1) * dayMs - (dayMs - 1)));
    onChange(newStart, newEnd);
  };
  const setToday = () => {
    const [s, e] = phoenixDayBounds(0);
    const clampedStart = new Date(Math.max(min.getTime(), s));
    const clampedEnd = new Date(Math.min(max.getTime(), e));
    onChange(clampedStart, clampedEnd);
  };
  const setYesterday = () => {
    const [s, e] = phoenixDayBounds(-1);
    const clampedStart = new Date(Math.max(min.getTime(), s));
    const clampedEnd = new Date(Math.min(max.getTime(), e));
    onChange(clampedStart, clampedEnd);
  };
  const setAllTime = () => {
    const s = new Date(min); s.setHours(0, 0, 0, 0);
    const e = new Date(max); e.setHours(23, 59, 59, 999);
    onChange(s, e);
  };
  const isAllTime = Math.abs(start.getTime() - min.getTime()) < dayMs && Math.abs(end.getTime() - max.getTime()) < dayMs;

  // Match today/yesterday by comparing Phoenix-tz date strings, since the
  // preset buttons build their ranges in Phoenix time.
  const azDate = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
  const todayStr = azDate(new Date());
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return azDate(d); })();
  const startStr = azDate(start);
  const endStr = azDate(end);
  const isToday = startStr === todayStr && endStr === todayStr;
  const isYesterday = startStr === yesterdayStr && endStr === yesterdayStr;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mb-6 select-none" style={{ overflow: 'visible' }}>
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <div>
          <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Viewing</p>
          <p className="text-base sm:text-lg font-bold text-foreground tracking-tight">{rangeLabel}</p>
          <p className="text-[11px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{spanDays} day{spanDays === 1 ? '' : 's'}</p>
        </div>
        <div className="flex items-center gap-1 bg-warm-bg rounded-xl p-1 overflow-x-auto max-w-full no-scrollbar">
          {(() => {
            const presetActive = !isAllTime && !isToday && !isYesterday;
            const items: { key: string; label: string; active: boolean; onClick: () => void }[] = [
              { key: 'today', label: 'Today', active: isToday, onClick: setToday },
              { key: 'yesterday', label: 'Yesterday', active: isYesterday, onClick: setYesterday },
              { key: '7D', label: '7D', active: presetActive && spanDays === 7, onClick: () => setPreset(7) },
              { key: '14D', label: '14D', active: presetActive && spanDays === 14, onClick: () => setPreset(14) },
              { key: '30D', label: '30D', active: presetActive && spanDays === 30, onClick: () => setPreset(30) },
              { key: '90D', label: '90D', active: presetActive && spanDays === 90, onClick: () => setPreset(90) },
              { key: 'all', label: 'All', active: isAllTime, onClick: setAllTime },
            ];
            return items.map(it => (
              <button
                key={it.key}
                onClick={it.onClick}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${it.active ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {it.label}
              </button>
            ));
          })()}
        </div>
      </div>

      <div
        ref={trackRef}
        className="relative h-28 mt-2 cursor-pointer"
        style={{ overflow: 'visible' }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onTrackClick}
      >
        {/* Bar chart area (unselected = muted, selected = full).
            Each bar is a button — clicking it snaps the timeline to
            exactly that one day. Bars expand the hit target to the
            full vertical strip via a transparent overlay so users
            don't have to aim for the short bar itself. */}
        <div className="absolute inset-x-0 top-0 bottom-8 overflow-hidden">
          {activityBars.map((b, i) => {
            const barRightPct = b.pct + b.widthPct / 100;
            const inRange = barRightPct > startPct && b.pct < endPct;
            // Snap the visible date string ("2026-04-21") into a
            // friendly tooltip so hover tells the user what they're
            // about to click.
            const tooltip = `${new Date(b.startMs).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })} — click to view this day`;
            return (
              <button
                type="button"
                key={i}
                title={tooltip}
                aria-label={tooltip}
                onClick={(e) => {
                  // Stop the parent track click from firing too — we
                  // want this single click to mean "select this day",
                  // not "center the current span on this day".
                  e.stopPropagation();
                  onChange(new Date(b.startMs), new Date(b.endMs));
                }}
                onPointerDown={(e) => {
                  // Same protection against the parent's drag-band
                  // pointer-down handler.
                  e.stopPropagation();
                }}
                className={`absolute inset-y-0 cursor-pointer group focus:outline-none ${
                  inRange ? '' : 'hover:brightness-110'
                }`}
                style={{
                  left: `${b.pct * 100}%`,
                  width: `${b.widthPct}%`,
                }}
              >
                {/* The visible bar. */}
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0 left-0 right-0 rounded-sm transition-all ${
                    inRange
                      ? 'bg-primary group-hover:bg-primary-dark'
                      : 'bg-primary/25 group-hover:bg-primary/55'
                  }`}
                  style={{
                    height: `${Math.max(8, b.count * 100)}%`,
                    minHeight: 3,
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* Baseline */}
        <div className="absolute inset-x-0 bottom-7 h-px bg-foreground/15" />

        {/* Month tick marks on baseline */}
        <div className="absolute inset-x-0 bottom-7 h-1.5 pointer-events-none">
          {months.map((m, i) => (
            <div
              key={i}
              className={`absolute top-0 w-px ${m.isYearStart ? 'h-2 bg-foreground/50' : 'h-1.5 bg-foreground/20'}`}
              style={{ left: `${m.pct * 100}%` }}
            />
          ))}
        </div>

        {/* Selection band (overlays the bars) */}
        <div
          className="absolute top-0 bottom-8 bg-primary/10 border-x-2 border-primary cursor-grab active:cursor-grabbing"
          style={{ left: `${startPct * 100}%`, width: `${Math.max(0, (endPct - startPct) * 100)}%` }}
          onPointerDown={onPointerDown('band')}
        >
          <div className="absolute top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-primary text-white text-[10px] font-semibold whitespace-nowrap pointer-events-none shadow-sm" style={{ fontFamily: 'var(--font-body)' }}>
            {rangeLabel}
          </div>
        </div>

        {/* Start handle */}
        <button
          type="button"
          aria-label="Start date"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'ArrowLeft') nudgeStart(-1); if (e.key === 'ArrowRight') nudgeStart(1); }}
          onPointerDown={onPointerDown('start')}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-1/2 -translate-y-1/2 w-3 h-8 rounded-sm bg-white border-2 border-primary cursor-ew-resize shadow-md hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-transform"
          style={{ left: `max(0px, calc(${startPct * 100}% - 6px))` }}
        />

        {/* End handle */}
        <button
          type="button"
          aria-label="End date"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'ArrowLeft') nudgeEnd(-1); if (e.key === 'ArrowRight') nudgeEnd(1); }}
          onPointerDown={onPointerDown('end')}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-1/2 -translate-y-1/2 w-3 h-8 rounded-sm bg-white border-2 border-primary cursor-ew-resize shadow-md hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-transform"
          style={{ left: `min(calc(100% - 12px), calc(${endPct * 100}% - 6px))` }}
        />

        {/* Month labels */}
        <div className="absolute inset-x-0 bottom-0 h-5 pointer-events-none">
          {months.map((m, i) => (
            <div
              key={i}
              className={`absolute text-[10px] whitespace-nowrap select-none ${m.isYearStart ? 'text-foreground/70 font-semibold' : 'text-foreground/40'}`}
              style={{ left: `${m.pct * 100}%`, transform: 'translateX(-50%)', fontFamily: 'var(--font-body)' }}
            >
              {m.isYearStart ? `${m.label} ${m.date.getFullYear()}` : m.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
