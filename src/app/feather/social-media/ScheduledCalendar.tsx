'use client';

// Month-grid overview of scheduled posts. Read-focused situational
// awareness — "what's going out this month, and are there gaps?" — paired
// with the list view (which owns cancel + countdown). Posts land on their
// scheduled day; clicking one selects it and shows a detail strip below.

import { useMemo, useState } from 'react';
import { PlatformIcon, type PlatformId } from './PlatformIcon';

export interface CalendarItem {
  key: string;
  scheduleDate: string;
  caption: string;
  platforms: string[];
  mediaUrls: string[];
  createdByName: string | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ScheduledCalendar({ items, onCancel }: { items: CalendarItem[]; onCancel?: (key: string) => void }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of items) {
      const t = Date.parse(it.scheduleDate);
      if (!Number.isFinite(t)) continue;
      const k = ymd(new Date(t));
      const list = map.get(k) ?? [];
      list.push(it);
      map.set(k, list);
    }
    for (const list of map.values()) list.sort((a, b) => Date.parse(a.scheduleDate) - Date.parse(b.scheduleDate));
    return map;
  }, [items]);

  // Build the 6-week grid starting on the Sunday on/before the 1st.
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const todayKey = ymd(new Date());
  const monthLabel = cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const selected = selectedKey ? items.find((i) => i.key === selectedKey) ?? null : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))} className="px-2 py-1 rounded-md border border-black/10 bg-white text-[12px] font-semibold text-foreground/70 hover:bg-warm-bg/60" aria-label="Previous month">←</button>
        <p className="text-[13px] font-bold text-foreground">{monthLabel}</p>
        <button type="button" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))} className="px-2 py-1 rounded-md border border-black/10 bg-white text-[12px] font-semibold text-foreground/70 hover:bg-warm-bg/60" aria-label="Next month">→</button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-black/5 rounded-lg overflow-hidden border border-black/5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-warm-bg/40 text-center text-[9.5px] font-bold uppercase tracking-wider text-foreground/45 py-1">{w}</div>
        ))}
        {cells.map((d) => {
          const k = ymd(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const dayItems = byDay.get(k) ?? [];
          const isToday = k === todayKey;
          return (
            <div key={k} className={`min-h-[64px] sm:min-h-[84px] p-1 ${inMonth ? 'bg-white' : 'bg-warm-bg/20'} align-top`}>
              <div className={`text-[10px] font-semibold mb-0.5 ${isToday ? 'text-primary' : inMonth ? 'text-foreground/55' : 'text-foreground/25'}`}>
                {isToday ? <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white">{d.getDate()}</span> : d.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map((it) => {
                  const time = new Date(it.scheduleDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  const on = selectedKey === it.key;
                  return (
                    <button
                      key={it.key}
                      type="button"
                      onClick={() => setSelectedKey((cur) => (cur === it.key ? null : it.key))}
                      className={`w-full text-left rounded px-1 py-0.5 text-[9px] font-semibold leading-tight truncate transition-colors ${on ? 'bg-primary text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
                      title={`${time} · ${it.caption || '(no caption)'}`}
                    >
                      {time} {it.caption ? it.caption.slice(0, 18) : '(no caption)'}
                    </button>
                  );
                })}
                {dayItems.length > 3 && (
                  <p className="text-[9px] text-foreground/45 pl-1">+{dayItems.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="mt-3 rounded-xl border border-black/10 bg-warm-bg/30 p-3 flex items-start gap-3">
          {selected.mediaUrls[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.mediaUrls[0]} alt="" className="w-12 h-12 rounded object-cover border border-black/10 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-amber-800 mb-0.5">
              {new Date(selected.scheduleDate).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
            <p className="text-[12.5px] text-foreground/80 line-clamp-3">{selected.caption || '(no caption)'}</p>
            <div className="flex items-center gap-2 mt-1">
              {selected.platforms.map((p) => (
                <span key={p} className="inline-flex items-center justify-center w-3.5 h-3.5 text-foreground/55" title={p}><PlatformIcon platform={p as PlatformId} size={13} /></span>
              ))}
              {selected.createdByName && <span className="text-[10.5px] text-foreground/45">by {selected.createdByName}</span>}
            </div>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={() => { onCancel(selected.key); setSelectedKey(null); }}
              className="shrink-0 rounded-lg border border-black/10 px-2.5 py-1 text-[11px] font-semibold text-foreground/65 hover:text-red-700 hover:border-red-300"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
