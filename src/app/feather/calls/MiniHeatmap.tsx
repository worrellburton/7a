'use client';

import { useMemo } from 'react';
import { Call, parseDate } from './_shared';

export function MiniHeatmap({
  calls,
  selectedDate,
  onDayClick,
}: {
  calls: Call[];
  selectedDate: string;
  onDayClick: (date: string) => void;
}) {
  const WEEKS = 14;
  const todayAz = useMemo(() => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' }), []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of calls) {
      const p = parseDate(c.called_at);
      if (!p) continue;
      const k = p.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [calls]);

  const dateGrid = useMemo(() => {
    const [y, mo, d] = todayAz.split('-').map(Number);
    const end = new Date(Date.UTC(y, mo - 1, d, 12));
    const endDay = end.getUTCDay();
    const daysToSaturday = (6 - endDay + 7) % 7;
    const gridEnd = new Date(end);
    gridEnd.setUTCDate(gridEnd.getUTCDate() + daysToSaturday);
    const totalDays = WEEKS * 7;
    const start = new Date(gridEnd);
    start.setUTCDate(start.getUTCDate() - (totalDays - 1));
    const out: string[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d2 = new Date(start);
      d2.setUTCDate(d2.getUTCDate() + i);
      out.push(d2.toISOString().slice(0, 10));
    }
    return out;
  }, [todayAz]);

  const maxCount = useMemo(() => {
    let m = 0;
    counts.forEach(v => { if (v > m) m = v; });
    return m;
  }, [counts]);

  const cellClass = (count: number): string => {
    if (count === 0) return 'bg-warm-bg border border-foreground/5';
    if (maxCount === 0) return 'bg-warm-bg border border-foreground/5';
    const ratio = count / maxCount;
    if (ratio > 0.75) return 'bg-primary-dark';
    if (ratio > 0.5) return 'bg-primary';
    if (ratio > 0.25) return 'bg-primary/60';
    return 'bg-primary/30';
  };

  const monthLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let col = 0; col < WEEKS; col++) {
      const firstDayOfWeek = dateGrid[col * 7];
      if (!firstDayOfWeek) continue;
      const mo = Number(firstDayOfWeek.slice(5, 7)) - 1;
      if (mo !== lastMonth) {
        const dt = new Date(Date.UTC(Number(firstDayOfWeek.slice(0, 4)), mo, 1));
        labels.push({ col, label: dt.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }) });
        lastMonth = mo;
      }
    }
    return labels;
  }, [dateGrid]);

  const weekdayLabels = ['Mon', '', 'Wed', '', 'Fri', '', ''];

  return (
    <div className="inline-flex flex-col gap-2 w-full">
      <div className="flex items-end gap-[3px] pl-7 h-4">
        {Array.from({ length: WEEKS }).map((_, col) => {
          const lbl = monthLabels.find((m) => m.col === col);
          return (
            <div key={col} className="w-[14px] text-[9px] text-foreground/40 font-medium truncate" style={{ fontFamily: 'var(--font-body)' }}>
              {lbl?.label || ''}
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        <div className="flex flex-col gap-[3px]">
          {weekdayLabels.map((d, i) => (
            <div key={i} className="h-[14px] text-[9px] text-foreground/40 font-medium leading-[14px] w-5 text-right pr-1" style={{ fontFamily: 'var(--font-body)' }}>
              {d}
            </div>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {Array.from({ length: WEEKS }).map((_, col) => (
            <div key={col} className="flex flex-col gap-[3px]">
              {Array.from({ length: 7 }).map((_, row) => {
                const date = dateGrid[col * 7 + row];
                if (!date) return <div key={row} className="w-[14px] h-[14px]" />;
                const count = counts.get(date) || 0;
                const isFuture = date > todayAz;
                const isSelected = selectedDate === date;
                return (
                  <button
                    key={row}
                    type="button"
                    onClick={() => !isFuture && onDayClick(date)}
                    title={`${date}: ${count} call${count === 1 ? '' : 's'}`}
                    className={`w-[14px] h-[14px] rounded-[3px] transition-transform hover:scale-125 cursor-pointer ${
                      isFuture ? 'bg-transparent border border-dashed border-foreground/10 cursor-default' : cellClass(count)
                    } ${isSelected ? 'ring-2 ring-foreground' : ''}`}
                    disabled={isFuture}
                    aria-label={`${date}: ${count} calls`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-warm-bg border border-foreground/5" />
        <div className="w-3 h-3 rounded-sm bg-primary/30" />
        <div className="w-3 h-3 rounded-sm bg-primary/60" />
        <div className="w-3 h-3 rounded-sm bg-primary" />
        <div className="w-3 h-3 rounded-sm bg-primary-dark" />
        <span>More</span>
      </div>
    </div>
  );
}
