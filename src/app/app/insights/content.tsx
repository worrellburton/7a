'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

// Insights — visual rollup of call volume over time. Reuses the
// existing /api/calls/insights endpoint (Phoenix-day buckets,
// canonical `calls` table, fit_score >= 60 = meaningful) so the
// numbers always match the home dashboard + the heatmap.
//
// Single chart with a Total / Meaningful toggle + range picker.
// Pure SVG — no chart library — keeps the bundle lean.

type Series = 'total' | 'meaningful';
type Range = 7 | 30 | 90;

interface DailyCount {
  date: string;          // YYYY-MM-DD (Phoenix day)
  count: number;         // total non-spam calls
  missedCount: number;
  returnedCount: number;
  meaningfulCount: number;
}

interface InsightsResponse {
  totalCalls: number;
  meaningful: number;
  inbound: number;
  outbound: number;
  missed: number;
  dailyCounts: DailyCount[];
}

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

export default function InsightsContent() {
  const { session } = useAuth();
  const [range, setRange] = useState<Range>(30);
  const [series, setSeries] = useState<Series>('total');
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The /api/calls/insights endpoint authenticates via the
    // Authorization: Bearer header (same pattern the home dashboard
    // and the heatmap use) — cookie-only requests come back as 401.
    const token = session?.access_token;
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (range - 1));
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    const url = `/api/calls/insights?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as InsightsResponse;
      })
      .then((json) => { if (!cancelled) setData(json); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range, session?.access_token]);

  return (
    <div className="p-8 max-w-7xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Insights
        </h1>
        <p className="mt-1 text-sm text-foreground/60 max-w-2xl">
          Call volume over time. Toggle between every call we logged
          and just the meaningful ones (AI fit score ≥ 60) to see
          whether the lift in traffic is actually qualified.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SeriesToggle value={series} onChange={setSeries} />
        <span className="ml-auto" />
        <RangePicker value={range} onChange={setRange} />
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        {loading && !data ? (
          <div className="h-72 flex items-center justify-center text-sm text-foreground/45">
            Loading call data…
          </div>
        ) : error ? (
          <div className="h-72 flex items-center justify-center text-sm text-rose-700">
            Couldn&apos;t load insights: {error}
          </div>
        ) : !data || data.dailyCounts.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-sm text-foreground/45">
            No calls in this range.
          </div>
        ) : (
          <CallChart data={data.dailyCounts} series={series} />
        )}
      </section>

      {data && (
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat
            label="Total"
            value={data.totalCalls}
            tone="primary"
            active={series === 'total'}
          />
          <Stat
            label="Meaningful"
            value={data.meaningful}
            tone="emerald"
            active={series === 'meaningful'}
          />
          <Stat label="Inbound" value={data.inbound} />
          <Stat label="Missed" value={data.missed} />
        </div>
      )}
    </div>
  );
}

function SeriesToggle({
  value, onChange,
}: {
  value: Series;
  onChange: (next: Series) => void;
}) {
  return (
    <div role="tablist" className="inline-flex items-center rounded-lg border border-black/10 bg-white p-1 gap-1">
      <ToggleButton active={value === 'total'} onClick={() => onChange('total')} tone="primary">
        Total calls
      </ToggleButton>
      <ToggleButton active={value === 'meaningful'} onClick={() => onChange('meaningful')} tone="emerald">
        Meaningful calls
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active, onClick, tone, children,
}: {
  active: boolean;
  onClick: () => void;
  tone: 'primary' | 'emerald';
  children: React.ReactNode;
}) {
  const activeClass = tone === 'primary'
    ? 'bg-primary text-white shadow-sm'
    : 'bg-emerald-600 text-white shadow-sm';
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
        active ? activeClass : 'text-foreground/65 hover:text-foreground hover:bg-warm-bg/60'
      }`}
    >
      {children}
    </button>
  );
}

function RangePicker({ value, onChange }: { value: Range; onChange: (next: Range) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-black/10 bg-white p-1 gap-1">
      {RANGE_OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              active
                ? 'bg-foreground text-white shadow-sm'
                : 'text-foreground/65 hover:text-foreground hover:bg-warm-bg/60'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Stat({
  label, value, tone, active,
}: {
  label: string;
  value: number;
  tone?: 'primary' | 'emerald';
  active?: boolean;
}) {
  const accent = active && tone === 'primary'
    ? 'border-primary/40 bg-primary/5'
    : active && tone === 'emerald'
    ? 'border-emerald-300 bg-emerald-50'
    : 'border-black/10 bg-white';
  const valueClass = active && tone === 'primary'
    ? 'text-primary'
    : active && tone === 'emerald'
    ? 'text-emerald-700'
    : 'text-foreground';
  return (
    <div className={`rounded-xl border p-4 ${accent}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/55">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${valueClass}`} style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </p>
    </div>
  );
}

// ── Chart ──────────────────────────────────────────────────────────

function CallChart({
  data, series,
}: {
  data: DailyCount[];
  series: Series;
}) {
  const values = data.map((d) => series === 'total' ? d.count : d.meaningfulCount);
  const max = Math.max(1, ...values);

  // Track hovered index for tooltip. Null when nothing is hovered.
  const [hover, setHover] = useState<number | null>(null);

  // Layout — fixed viewBox so SVG scales to its container width.
  const W = 900;
  const H = 280;
  const PAD_T = 16;
  const PAD_B = 28;
  const PAD_L = 36;
  const PAD_R = 12;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const n = data.length;
  const slot = innerW / n;
  const barW = Math.max(2, slot * 0.7);

  // Y-axis ticks — round to a sensible value.
  const tickStep = niceTickStep(max);
  const tickCount = Math.ceil(max / tickStep) + 1;
  const yMax = tickStep * (tickCount - 1);
  const yScale = (v: number) => PAD_T + innerH - (v / Math.max(1, yMax)) * innerH;

  const fill = series === 'total' ? '#a0522d' : '#059669';
  const fillSoft = series === 'total' ? '#a0522d22' : '#05966922';

  // Sparse x-axis labels — at most ~7 ticks regardless of range so
  // they don't smush together on 90-day windows.
  const labelEvery = Math.max(1, Math.ceil(n / 7));

  // Total over visible range — shown in the header strip.
  const total = values.reduce((a, b) => a + b, 0);
  const avg = n > 0 ? total / n : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/55">
            {series === 'total' ? 'Total calls' : 'Meaningful calls'}
          </p>
          <p className="text-3xl font-bold text-foreground tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
            {total}
          </p>
          <p className="text-[11px] text-foreground/45 mt-0.5">
            {avg.toFixed(1)} avg / day · {n} days
          </p>
        </div>
        {hover !== null && data[hover] && (
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/55">
              {formatLabel(data[hover].date, true)}
            </p>
            <p className="text-2xl font-bold tabular-nums" style={{ fontFamily: 'var(--font-display)', color: fill }}>
              {values[hover]}
            </p>
            <p className="text-[11px] text-foreground/45 mt-0.5">
              {series === 'total' ? 'total calls' : 'meaningful calls'}
            </p>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-72"
        role="img"
        aria-label={`${series === 'total' ? 'Total' : 'Meaningful'} calls over the last ${n} days`}
        onMouseLeave={() => setHover(null)}
      >
        {/* Y-axis grid + labels */}
        {Array.from({ length: tickCount }).map((_, i) => {
          const v = i * tickStep;
          const y = yScale(v);
          return (
            <g key={i}>
              <line
                x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke="#0000000d" strokeWidth={1}
              />
              <text
                x={PAD_L - 6} y={y + 3.5}
                fontSize={10} textAnchor="end" fill="#00000066"
                fontFamily="var(--font-body)"
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const v = values[i];
          const x = PAD_L + slot * i + (slot - barW) / 2;
          const y = yScale(v);
          const h = Math.max(0, PAD_T + innerH - y);
          const isHover = hover === i;
          return (
            <g key={d.date}>
              {/* Hit target — full-height invisible rect for hover */}
              <rect
                x={PAD_L + slot * i} y={PAD_T} width={slot} height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
              <rect
                x={x} y={y} width={barW} height={h}
                rx={2}
                fill={isHover ? fill : v === 0 ? '#00000010' : fill}
                opacity={isHover || v === 0 ? 1 : 0.85}
              />
              {/* Soft glow on hover */}
              {isHover && (
                <rect
                  x={x - 2} y={y - 2} width={barW + 4} height={h + 4}
                  rx={3}
                  fill="none" stroke={fill} strokeWidth={0.8} opacity={0.4}
                />
              )}
            </g>
          );
        })}

        {/* X-axis labels (sparse) */}
        {data.map((d, i) => {
          if (i % labelEvery !== 0 && i !== n - 1) return null;
          const x = PAD_L + slot * i + slot / 2;
          return (
            <text
              key={`x-${d.date}`}
              x={x} y={H - 8}
              fontSize={10} textAnchor="middle" fill="#00000066"
              fontFamily="var(--font-body)"
            >
              {formatLabel(d.date)}
            </text>
          );
        })}

        {/* Soft baseline highlight */}
        <line
          x1={PAD_L} y1={PAD_T + innerH} x2={W - PAD_R} y2={PAD_T + innerH}
          stroke="#0000001a" strokeWidth={1}
        />

        {/* Average reference line */}
        {avg > 0 && (
          <g>
            <line
              x1={PAD_L} y1={yScale(avg)} x2={W - PAD_R} y2={yScale(avg)}
              stroke={fill} strokeWidth={1} strokeDasharray="3 3" opacity={0.4}
            />
            <rect x={W - PAD_R - 64} y={yScale(avg) - 16} width={62} height={14} rx={3} fill={fillSoft} />
            <text
              x={W - PAD_R - 4} y={yScale(avg) - 5}
              fontSize={9} textAnchor="end" fill={fill}
              fontFamily="var(--font-body)" fontWeight={600}
            >
              avg {avg.toFixed(1)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// "2026-04-27" → "Apr 27" (or "Apr 27, Sun" if `withWeekday`)
function formatLabel(iso: string, withWeekday = false): string {
  const [y, m, d] = iso.split('-').map((s) => parseInt(s, 10));
  const dt = new Date(y, m - 1, d);
  const month = dt.toLocaleString('en-US', { month: 'short' });
  if (withWeekday) {
    const wd = dt.toLocaleString('en-US', { weekday: 'short' });
    return `${wd}, ${month} ${d}`;
  }
  return `${month} ${d}`;
}

// Pick a tick interval that fits the magnitude — 1, 2, 5, 10, 20, 50…
function niceTickStep(max: number): number {
  if (max <= 5) return 1;
  if (max <= 10) return 2;
  if (max <= 25) return 5;
  if (max <= 50) return 10;
  if (max <= 100) return 20;
  if (max <= 250) return 50;
  if (max <= 500) return 100;
  return 200;
}
