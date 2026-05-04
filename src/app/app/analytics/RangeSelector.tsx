'use client';

import { useMemo } from 'react';
import {
  type DateRange,
  type RangePreset,
  rangeForPreset,
  detectPreset,
  formatRangeLabel,
  spanDays,
  azDateString,
} from './shared';

interface Props {
  range: DateRange;
  onChange: (r: DateRange) => void;
}

// Reuses the visual language from /app/calls — warm-bg pill group with the
// active preset highlighted in white, plus a readable label on the left.
export function RangeSelector({ range, onChange }: Props) {
  const active = useMemo(() => detectPreset(range), [range]);
  const label = useMemo(() => formatRangeLabel(range), [range]);
  const days = spanDays(range);

  const pills: { key: RangePreset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: '7d', label: '7D' },
    { key: '14d', label: '14D' },
    { key: '30d', label: '30D' },
    { key: '90d', label: '90D' },
    { key: 'ytd', label: 'YTD' },
  ];

  const onCustomStart = (v: string) => {
    if (!v) return;
    const [yy, mm, dd] = v.split('-').map(Number);
    const start = new Date(Date.UTC(yy, mm - 1, dd, 7, 0, 0, 0));
    if (start > range.end) return;
    onChange({ start, end: range.end });
  };
  const onCustomEnd = (v: string) => {
    if (!v) return;
    const [yy, mm, dd] = v.split('-').map(Number);
    const end = new Date(Date.UTC(yy, mm - 1, dd + 1, 7, 0, 0, 0) - 1);
    if (end < range.start) return;
    onChange({ start: range.start, end });
  };

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5 mb-6 select-none">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/40">
            Viewing
          </p>
          <p className="text-base sm:text-lg font-bold text-foreground tracking-tight">{label}</p>
          <p className="text-[11px] text-foreground/50">{days} day{days === 1 ? '' : 's'}</p>
        </div>
        <div className="flex items-center gap-1 bg-warm-bg rounded-xl p-1 overflow-x-auto max-w-full no-scrollbar">
          {pills.map((p) => (
            <button
              key={p.key}
              onClick={() => onChange(rangeForPreset(p.key))}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                active === p.key
                  ? 'bg-white shadow-sm text-foreground'
                  : 'text-foreground/40 hover:text-foreground/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 flex-wrap text-[11px]">
        <label className="flex items-center gap-2 text-foreground/60">
          <span>From</span>
          <input
            type="date"
            value={azDateString(range.start)}
            onChange={(e) => onCustomStart(e.target.value)}
            className="rounded-lg border border-black/10 bg-white px-2 py-1 text-[12px]"
          />
        </label>
        <label className="flex items-center gap-2 text-foreground/60">
          <span>to</span>
          <input
            type="date"
            value={azDateString(range.end)}
            onChange={(e) => onCustomEnd(e.target.value)}
            className="rounded-lg border border-black/10 bg-white px-2 py-1 text-[12px]"
          />
        </label>
      </div>
    </div>
  );
}
