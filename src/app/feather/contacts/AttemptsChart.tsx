'use client';

// Full-width attempts-over-time insights section for the contacts page.
//
// A single glowing line (brand sienna — validated ≥3:1 against the
// light surface) sums the touchpoints logged per day across whichever
// methods are toggled on in the chip row. Hovering raises a crosshair
// + tooltip with that day's total and per-method breakdown; the range
// pills re-fetch (this month / last month / last 90 days / this year /
// all time — long spans arrive week-bucketed from the API so the line
// stays legible). Draw-in + hover animations respect reduced motion.
//
// Data: /api/contacts/attempts (zero-filled series, split by method).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type RangeKey = 'this_month' | 'last_month' | 'last_90' | 'this_year' | 'all';

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'last_90', label: 'Last 90 days' },
  { key: 'this_year', label: 'This year' },
  { key: 'all', label: 'All time' },
];

// Bookkeeping "methods" that aren't outreach attempts — off by
// default, one chip-tap away if someone wants them counted.
const DEFAULT_OFF = new Set(['Data Entry', 'New Contact']);

interface AttemptsPayload {
  range: RangeKey;
  bucket: 'day' | 'week';
  start: string;
  end: string;
  total: number;
  methods: string[];
  days: Array<{ date: string; total: number; byMethod: Record<string, number> }>;
  people: Array<{ id: string; name: string; avatarUrl: string | null; byMethod: Record<string, number> }>;
}

const LINE = '#a0522d'; // brand sienna — passes lightness/chroma/contrast checks

function fmtTick(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtTooltipDate(date: string, bucket: 'day' | 'week'): string {
  const label = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: bucket === 'day' ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return bucket === 'week' ? `Week of ${label}` : label;
}

/** Round an axis max up to a friendly step so gridlines land on whole numbers. */
function niceMax(n: number): number {
  if (n <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(n));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (n <= m * pow) return Math.ceil(m * pow);
  }
  return n;
}

export function AttemptsChart({ defaultOpen }: { defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [range, setRange] = useState<RangeKey>('last_90');
  const [data, setData] = useState<AttemptsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  // Per-method on/off, persisted across range switches; unseen methods
  // pick up their default when they first appear.
  const [enabled, setEnabled] = useState<Map<string, boolean>>(new Map());
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const plotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/contacts/attempts?range=${range}`, { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: AttemptsPayload | null) => {
        if (cancelled || !json) return;
        setData(json);
        setEnabled((prev) => {
          const next = new Map(prev);
          for (const m of json.methods) {
            if (!next.has(m)) next.set(m, !DEFAULT_OFF.has(m));
          }
          return next;
        });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range, open]);

  // Track the plot's rendered width so hover math is pixel-accurate.
  useEffect(() => {
    if (!open) return;
    const el = plotRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(Math.round(entries[0]?.contentRect.width ?? 0));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  const series = useMemo(() => {
    if (!data) return [];
    return data.days.map((d) => {
      let total = 0;
      for (const [m, n] of Object.entries(d.byMethod)) {
        if (enabled.get(m) !== false) total += n;
      }
      return { date: d.date, total, byMethod: d.byMethod };
    });
  }, [data, enabled]);

  const rangeTotal = useMemo(() => series.reduce((s, d) => s + d.total, 0), [series]);

  // By-person leaderboard for the range, honouring the method chips.
  const peopleCounts = useMemo(() => {
    if (!data) return [];
    return data.people
      .map((p) => ({
        ...p,
        logs: Object.entries(p.byMethod).reduce(
          (s, [m, n]) => (enabled.get(m) !== false ? s + n : s),
          0,
        ),
      }))
      .filter((p) => p.logs > 0)
      .sort((a, b) => b.logs - a.logs);
  }, [data, enabled]);

  // ── Geometry ────────────────────────────────────────────────
  const H = 220;
  const PAD = { top: 14, right: 14, bottom: 24, left: 38 };
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const yMax = niceMax(Math.max(1, ...series.map((d) => d.total)));
  const xAt = useCallback(
    (i: number) => PAD.left + (series.length <= 1 ? innerW / 2 : (i / (series.length - 1)) * innerW),
    [series.length, innerW, PAD.left],
  );
  const yAt = useCallback(
    (v: number) => PAD.top + innerH - (v / yMax) * innerH,
    [innerH, yMax, PAD.top],
  );

  const linePath = useMemo(() => {
    if (series.length === 0 || innerW <= 0) return '';
    return series.map((d, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(d.total).toFixed(1)}`).join(' ');
  }, [series, xAt, yAt, innerW]);

  const areaPath = useMemo(() => {
    if (!linePath) return '';
    const baseline = PAD.top + innerH;
    return `${linePath} L${xAt(series.length - 1).toFixed(1)},${baseline} L${xAt(0).toFixed(1)},${baseline} Z`;
  }, [linePath, series.length, xAt, innerH, PAD.top]);

  // ~5 evenly-spaced x ticks.
  const xTicks = useMemo(() => {
    const n = series.length;
    if (n === 0) return [] as number[];
    const count = Math.min(5, n);
    return Array.from({ length: count }, (_, i) => Math.round((i / Math.max(1, count - 1)) * (n - 1)));
  }, [series.length]);

  const gridVals = useMemo(() => [yMax / 3, (2 * yMax) / 3, yMax].map(Math.round), [yMax]);

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (series.length === 0 || innerW <= 0 || width <= 0) return;
      const rect = plotRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;
      // clientX / rect are in VISUAL pixels, but the chart math is in
      // layout pixels — under `.app-shell { zoom: 0.9 }` those differ
      // by 10%, which read as the crosshair snapping ~an inch left of
      // the cursor. Normalise by the effective scale (identity when
      // no zoom applies).
      const scale = rect.width / width;
      const x = (e.clientX - rect.left) / scale - PAD.left;
      const idx = Math.round((x / innerW) * (series.length - 1));
      setHoverIdx(Math.max(0, Math.min(series.length - 1, idx)));
    },
    [series.length, innerW, width, PAD.left],
  );

  // hoverIdx can go stale when the range changes under a resting
  // cursor (the new series may be shorter), so bound-check everywhere
  // instead of trusting it — a stale index must never dereference.
  const hover = hoverIdx != null ? series[hoverIdx] ?? null : null;
  const hoverBreakdown = useMemo(() => {
    if (!hover) return [];
    return Object.entries(hover.byMethod)
      .filter(([m]) => enabled.get(m) !== false)
      .sort((a, b) => b[1] - a[1]);
  }, [hover, enabled]);

  // Tooltip x clamped so it never leaves the card.
  const tooltipLeft = hoverIdx != null && width > 0
    ? Math.max(8, Math.min(xAt(hoverIdx) - 90, width - 188))
    : 0;

  return (
    <section className="mb-4 rounded-2xl border border-black/8 bg-white/80 supports-[backdrop-filter]:bg-white/65 supports-[backdrop-filter]:backdrop-blur-xl shadow-[0_8px_24px_-14px_rgba(60,48,42,0.25)] overflow-hidden">
      {/* Header row — always visible; click toggles the panel. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/45">Attempts</p>
          <p className="mt-0.5 text-[12px] text-foreground/55">
            {open && data
              ? <><span className="font-semibold text-foreground tabular-nums">{rangeTotal.toLocaleString()}</span> touchpoints · {RANGES.find((r) => r.key === range)?.label.toLowerCase()}</>
              : 'Outreach activity over time'}
          </p>
        </div>
        <svg className={`shrink-0 w-4 h-4 text-foreground/35 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {open && (
        <div className="px-4 sm:px-5 pb-4">
          {/* Filter row — range pills + method chips, one line, wraps. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
            <div className="inline-flex items-center rounded-lg border border-black/10 bg-white p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRange(r.key)}
                  aria-pressed={range === r.key}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${range === r.key ? 'bg-foreground text-white' : 'text-foreground/55 hover:text-foreground'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(data?.methods ?? []).map((m) => {
                const on = enabled.get(m) !== false;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setEnabled((prev) => new Map(prev).set(m, !on))}
                    aria-pressed={on}
                    className={`px-2 py-1 rounded-full text-[10.5px] font-semibold border transition-all ${on ? 'bg-primary/10 text-primary border-primary/25' : 'bg-white text-foreground/40 border-black/10 line-through decoration-foreground/30'}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Plot */}
          <div
            ref={plotRef}
            className="relative w-full select-none"
            style={{ height: H }}
            onMouseMove={onMove}
            onMouseLeave={() => setHoverIdx(null)}
          >
            {loading && !data ? (
              <div className="absolute inset-0 rounded-xl bg-foreground/[0.04] animate-pulse" />
            ) : series.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-[12.5px] text-foreground/40">
                No attempts in this window.
              </div>
            ) : width > 0 ? (
              <>
                <svg width={width} height={H} className="block" aria-hidden="true">
                  <defs>
                    <linearGradient id="att-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={LINE} stopOpacity="0.16" />
                      <stop offset="100%" stopColor={LINE} stopOpacity="0" />
                    </linearGradient>
                    <filter id="att-glow" x="-20%" y="-60%" width="140%" height="220%">
                      <feGaussianBlur stdDeviation="7" />
                    </filter>
                    <filter id="att-glow-tight" x="-20%" y="-60%" width="140%" height="220%">
                      <feGaussianBlur stdDeviation="2.5" />
                    </filter>
                  </defs>

                  {/* Faint grid + y labels (ink tokens, tabular) */}
                  {gridVals.map((v) => (
                    <g key={v}>
                      <line x1={PAD.left} x2={width - PAD.right} y1={yAt(v)} y2={yAt(v)} stroke="rgba(44,24,16,0.07)" strokeDasharray="2 4" />
                      <text x={PAD.left - 8} y={yAt(v) + 3.5} textAnchor="end" className="fill-foreground/40" style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                        {v}
                      </text>
                    </g>
                  ))}
                  <line x1={PAD.left} x2={width - PAD.right} y1={yAt(0)} y2={yAt(0)} stroke="rgba(44,24,16,0.14)" />

                  {/* x date ticks */}
                  {xTicks.map((i) => (
                    <text key={i} x={xAt(i)} y={H - 7} textAnchor="middle" className="fill-foreground/40" style={{ fontSize: 10 }}>
                      {fmtTick(series[i].date)}
                    </text>
                  ))}

                  {/* Area, then a two-layer glow (wide soft halo + tight
                      bright bloom) under the crisp 2px line. */}
                  <path d={areaPath} fill="url(#att-fill)" />
                  <path d={linePath} fill="none" stroke={LINE} strokeWidth="11" strokeLinejoin="round" strokeLinecap="round" opacity="0.22" filter="url(#att-glow)" />
                  <path d={linePath} fill="none" stroke={LINE} strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.5" filter="url(#att-glow-tight)" />
                  <path key={`${range}-${data?.bucket}-${rangeTotal}`} d={linePath} pathLength={1} fill="none" stroke={LINE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="att-draw" />

                  {/* Emphasized endpoint */}
                  {series.length > 0 && (
                    <circle cx={xAt(series.length - 1)} cy={yAt(series[series.length - 1].total)} r="3.5" fill={LINE} stroke="#fff" strokeWidth="2" />
                  )}

                  {/* Crosshair + hover marker */}
                  {hoverIdx != null && hover && (
                    <g>
                      <line x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={PAD.top} y2={PAD.top + innerH} stroke="rgba(44,24,16,0.18)" />
                      <circle cx={xAt(hoverIdx)} cy={yAt(hover.total)} r="4.5" fill={LINE} stroke="#fff" strokeWidth="2" />
                    </g>
                  )}
                </svg>

                {/* Tooltip */}
                {hover && (
                  <div
                    className="pointer-events-none absolute z-10 w-[180px] rounded-xl border border-black/8 bg-white/95 supports-[backdrop-filter]:backdrop-blur-md shadow-[0_10px_28px_-12px_rgba(60,48,42,0.4)] px-3 py-2.5"
                    style={{ left: tooltipLeft, top: 4 }}
                  >
                    <p className="text-[10px] font-semibold text-foreground/50">{data ? fmtTooltipDate(hover.date, data.bucket) : hover.date}</p>
                    <p className="mt-0.5 text-[15px] font-bold text-foreground tabular-nums leading-tight">
                      {hover.total.toLocaleString()} <span className="text-[10.5px] font-semibold text-foreground/45">attempt{hover.total === 1 ? '' : 's'}</span>
                    </p>
                    {hoverBreakdown.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {hoverBreakdown.slice(0, 4).map(([m, n]) => (
                          <li key={m} className="flex items-center justify-between gap-2 text-[10.5px] text-foreground/65">
                            <span className="truncate">{m}</span>
                            <span className="tabular-nums font-semibold text-foreground/80">{n}</span>
                          </li>
                        ))}
                        {hoverBreakdown.length > 4 && (
                          <li className="text-[10px] text-foreground/40">+{hoverBreakdown.length - 4} more</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </>
            ) : null}
            <style>{`
              @keyframes att-draw-in { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
              .att-draw {
                stroke-dasharray: 1;
                stroke-dashoffset: 0;
                animation: att-draw-in 0.9s cubic-bezier(0.4, 0, 0.2, 1) both;
              }
              @media (prefers-reduced-motion: reduce) {
                .att-draw { animation: none !important; }
              }
            `}</style>
          </div>

          {/* By person — everyone who logged in the window, count
              honouring the method chips above. */}
          {peopleCounts.length > 0 && (
            <div className="mt-3 pt-3 border-t border-black/5">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/40 mb-2">By person</p>
              <div className="flex flex-wrap gap-1.5">
                {peopleCounts.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-white/70 border border-black/5 shadow-[0_2px_8px_-6px_rgba(60,48,42,0.35)]"
                    title={`${p.name} · ${p.logs.toLocaleString()} logs`}
                  >
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover bg-warm-bg shrink-0" />
                    ) : (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="text-[11px] font-medium text-foreground/70 max-w-[8rem] truncate">{p.name}</span>
                    <span className="text-[11px] font-bold tabular-nums text-foreground">{p.logs.toLocaleString()}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
