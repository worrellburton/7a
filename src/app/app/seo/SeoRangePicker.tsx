'use client';

// Days-based range picker that mirrors the visual language of
// /app/analytics RangeSelector (warm-bg pill group with the active
// preset highlighted in white). Search Console data is daily-only,
// so the SEO surface uses a simple "last N days" model rather than
// arbitrary start/end dates — but the picker should feel like the
// rest of the analytics area.

interface Props {
  days: number;
  onChange: (d: number) => void;
}

const PRESETS: { days: number; label: string }[] = [
  { days: 7, label: '7D' },
  { days: 28, label: '28D' },
  { days: 90, label: '90D' },
];

function rangeLabel(days: number): string {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - (days - 1));
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function SeoRangePicker({ days, onChange }: Props) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5 mb-6 select-none">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/40">
            Viewing
          </p>
          <p className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            {rangeLabel(days)}
          </p>
          <p className="text-[11px] text-foreground/50">
            Last {days} day{days === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-warm-bg rounded-xl p-1 overflow-x-auto max-w-full no-scrollbar">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              onClick={() => onChange(p.days)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                days === p.days
                  ? 'bg-white shadow-sm text-foreground'
                  : 'text-foreground/40 hover:text-foreground/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
