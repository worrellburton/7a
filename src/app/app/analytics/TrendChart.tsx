'use client';

import { useMemo, useState } from 'react';

interface DailyPoint {
  date: string; // YYYY-MM-DD
  sessions: number;
  activeUsers: number;
  pageViews: number;
  newUsers?: number;
  // Per-day organic-search facets — populated by /api/google/ga4 via
  // a parallel sessionDefaultChannelGroup-filtered query. Falls back
  // to 0 on days GA4 didn't return an organic row. engagementRate is
  // GA-native 0.0–1.0.
  organicSearch?: number;
  organicSessions?: number;
  organicActiveUsers?: number;
  organicNewUsers?: number;
  organicPageViews?: number;
  organicEngagementRate?: number;
}

type Metric =
  | 'sessions' | 'activeUsers' | 'newUsers' | 'pageViews'
  | 'organicSessions' | 'organicActiveUsers' | 'organicNewUsers' | 'organicPageViews' | 'organicEngagementRate';
type Scope = 'all' | 'organic';
type Formatter = 'number' | 'percent';

interface Props {
  data: DailyPoint[];
  height?: number;
}

// Static stroke/fill pairs so Tailwind can see every class at build
// time. Constructing the fill from the stroke via .replace() at runtime
// hid the class from Tailwind's content scanner and the area fell back
// to SVG's default (black) — the "solid black chart" bug on Organic
// search. Both must appear as literal strings here.
interface MetricDef {
  key: Metric;
  scope: Scope;
  label: string;
  // One-liner description rendered under the chart heading so it's
  // unambiguous what the trace is measuring.
  description: string;
  strokeClass: string;
  fillClass: string;
  dotClass: string;
  formatter?: Formatter;
}

const METRICS: MetricDef[] = [
  // All-traffic facets — sum across every channel.
  {
    key: 'sessions',
    scope: 'all',
    label: 'Sessions',
    description: 'Distinct visits to sevenarrowsrecoveryarizona.com from any source (organic, paid, direct, referral, email).',
    strokeClass: 'stroke-primary',
    fillClass: 'fill-primary/10',
    dotClass: 'fill-primary',
  },
  {
    key: 'activeUsers',
    scope: 'all',
    label: 'Users',
    description: 'Distinct people who used the site that day (one user can have multiple sessions).',
    strokeClass: 'stroke-emerald-500',
    fillClass: 'fill-emerald-500/10',
    dotClass: 'fill-emerald-500',
  },
  {
    key: 'newUsers',
    scope: 'all',
    label: 'New users',
    description: 'Users who visited for the first time that day (GA4 counts a user as new on their first-ever session).',
    strokeClass: 'stroke-violet-500',
    fillClass: 'fill-violet-500/10',
    dotClass: 'fill-violet-500',
  },
  {
    key: 'pageViews',
    scope: 'all',
    label: 'Page views',
    description: 'Total pages loaded across all visitors (one session usually contains several views).',
    strokeClass: 'stroke-amber-500',
    fillClass: 'fill-amber-500/10',
    dotClass: 'fill-amber-500',
  },
  // Organic-search facets — filtered to sessionDefaultChannelGroup =
  // "Organic Search" (Google / Bing / etc. organic clicks; excludes
  // paid ads, direct, referral, social, email).
  {
    key: 'organicSessions',
    scope: 'organic',
    label: 'Sessions',
    description: 'Visits that started with a click on an unpaid search-engine result. Excludes Google Ads, social, email, direct.',
    strokeClass: 'stroke-sky-500',
    fillClass: 'fill-sky-500/10',
    dotClass: 'fill-sky-500',
  },
  {
    key: 'organicActiveUsers',
    scope: 'organic',
    label: 'Users',
    description: 'Distinct people whose day on the site started with an organic-search click (one user can have multiple organic sessions).',
    strokeClass: 'stroke-cyan-500',
    fillClass: 'fill-cyan-500/10',
    dotClass: 'fill-cyan-500',
  },
  {
    key: 'organicNewUsers',
    scope: 'organic',
    label: 'New users',
    description: 'First-time visitors who found the site via an organic search. The clearest signal of SEO acquisition working.',
    strokeClass: 'stroke-teal-500',
    fillClass: 'fill-teal-500/10',
    dotClass: 'fill-teal-500',
  },
  {
    key: 'organicPageViews',
    scope: 'organic',
    label: 'Page views',
    description: 'Total page loads from organic-search sessions. High per-session ratios suggest the landing copy is doing its job.',
    strokeClass: 'stroke-indigo-500',
    fillClass: 'fill-indigo-500/10',
    dotClass: 'fill-indigo-500',
  },
  {
    key: 'organicEngagementRate',
    scope: 'organic',
    label: 'Engagement rate',
    description: '% of organic sessions that were "engaged" (≥10s, ≥1 conversion, or ≥2 page views). GA4’s replacement for the old bounce-rate metric.',
    strokeClass: 'stroke-fuchsia-500',
    fillClass: 'fill-fuchsia-500/10',
    dotClass: 'fill-fuchsia-500',
    formatter: 'percent',
  },
];

export function TrendChart({ data, height = 220 }: Props) {
  const [metric, setMetric] = useState<Metric>('sessions');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const values = useMemo(() => data.map((d) => d[metric] ?? 0), [data, metric]);
  const max = Math.max(1, ...values);

  const chartWidth = 1000;
  const padL = 40;
  const padR = 10;
  const padT = 10;
  const padB = 26;
  const plotW = chartWidth - padL - padR;
  const plotH = height - padT - padB;

  const stepX = data.length > 1 ? plotW / (data.length - 1) : plotW;

  const points = values.map((v, i) => {
    const x = padL + i * stepX;
    const y = padT + plotH - (v / max) * plotH;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(' ');
  const areaPath = `${linePath} L${padL + plotW},${padT + plotH} L${padL},${padT + plotH} Z`;

  const yTicks = 4;
  const tickValues: number[] = [];
  // Percent (0–1) metrics need fractional tick values, not Math.round
  // which would collapse everything below ~1 to zero. Detect via the
  // active formatter and skip rounding for the percent path.
  const usePercent = METRICS.find((m) => m.key === metric)?.formatter === 'percent';
  for (let i = 0; i <= yTicks; i++) {
    const raw = (max / yTicks) * i;
    tickValues.push(usePercent ? raw : Math.round(raw));
  }

  const xLabelEvery = Math.max(1, Math.floor(data.length / 8));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * chartWidth;
    if (px < padL || px > padL + plotW) {
      setHoverIdx(null);
      return;
    }
    const idx = Math.min(data.length - 1, Math.max(0, Math.round((px - padL) / stepX)));
    setHoverIdx(idx);
  };

  const active = METRICS.find((m) => m.key === metric)!;
  const fmt = (v: number) =>
    active.formatter === 'percent'
      ? `${(v * 100).toFixed(1)}%`
      : v.toLocaleString();
  const allMetrics = METRICS.filter((m) => m.scope === 'all');
  const organicMetrics = METRICS.filter((m) => m.scope === 'organic');

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5">
      <div className="flex items-start justify-between mb-1 flex-wrap gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground">Daily trend</h2>
          {/* Per-metric definition so it's unambiguous what the trace
              is measuring (especially the organic-search facets, which
              are easy to confuse with overall traffic). */}
          <p className="mt-0.5 text-[11.5px] text-foreground/55 leading-snug max-w-2xl">
            <span className="font-semibold text-foreground/75">{active.scope === 'organic' ? `Organic search · ${active.label}` : active.label}.</span>{' '}
            {active.description}
          </p>
        </div>
      </div>

      {/* Two-row metric strip grouped by scope. Top row = totals across
          every channel; bottom row = organic-search-only breakdown.
          Each row carries a tiny label so the user knows what they're
          choosing between. */}
      <div className="mb-4 mt-3 space-y-1.5">
        <MetricRow
          label="All traffic"
          metrics={allMetrics}
          active={metric}
          onPick={setMetric}
        />
        <MetricRow
          label="Organic search"
          metrics={organicMetrics}
          active={metric}
          onPick={setMetric}
        />
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${chartWidth} ${height}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height }}
          onMouseMove={onMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {tickValues.map((tv, i) => {
            const y = padT + plotH - (tv / max) * plotH;
            return (
              <g key={i}>
                <line x1={padL} x2={chartWidth - padR} y1={y} y2={y} stroke="currentColor" className="text-black/5" />
                <text
                  x={padL - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  className="fill-foreground/50"
                >
                  {fmt(tv)}
                </text>
              </g>
            );
          })}

          <path d={areaPath} className={active.fillClass} />
          <path d={linePath} fill="none" strokeWidth={2} className={active.strokeClass} />

          {data.map((d, i) => {
            if (i % xLabelEvery !== 0 && i !== data.length - 1) return null;
            const x = padL + i * stepX;
            const short = d.date.slice(5); // MM-DD
            return (
              <text
                key={d.date}
                x={x}
                y={height - 8}
                textAnchor="middle"
                fontSize="10"
                className="fill-foreground/50"
              >
                {short}
              </text>
            );
          })}

          {hoverIdx !== null && points[hoverIdx] ? (
            <g>
              <line
                x1={points[hoverIdx][0]}
                x2={points[hoverIdx][0]}
                y1={padT}
                y2={padT + plotH}
                stroke="currentColor"
                className="text-foreground/20"
                strokeDasharray="3 3"
              />
              <circle
                cx={points[hoverIdx][0]}
                cy={points[hoverIdx][1]}
                r={4}
                className={active.dotClass}
              />
            </g>
          ) : null}
        </svg>

        {hoverIdx !== null && data[hoverIdx] ? (
          <div className="absolute top-0 right-0 rounded-lg bg-foreground text-white px-3 py-1.5 text-[11px]">
            <span className="font-semibold">{data[hoverIdx].date}</span>
            <span className="mx-2 opacity-50">·</span>
            <span>{active.scope === 'organic' ? `Organic ${active.label.toLowerCase()}` : active.label}: {fmt(data[hoverIdx][metric] ?? 0)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Single-row pill group for one metric scope. Pulled out so the
// chart's header doesn't balloon with two near-identical strips.
function MetricRow({
  label,
  metrics,
  active,
  onPick,
}: {
  label: string;
  metrics: MetricDef[];
  active: Metric;
  onPick: (m: Metric) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-foreground/45 shrink-0 w-[88px]" style={{ fontFamily: 'var(--font-body)' }}>
        {label}
      </span>
      <div className="flex items-center gap-1 bg-warm-bg rounded-lg p-0.5 flex-wrap">
        {metrics.map((m) => (
          <button
            key={m.key}
            onClick={() => onPick(m.key)}
            className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
              active === m.key ? 'bg-white shadow-sm text-foreground' : 'text-foreground/50 hover:text-foreground/70'
            }`}
            title={m.description}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
