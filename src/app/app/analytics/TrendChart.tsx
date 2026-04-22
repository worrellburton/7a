'use client';

import { useMemo, useState } from 'react';

interface DailyPoint {
  date: string; // YYYY-MM-DD
  sessions: number;
  activeUsers: number;
  pageViews: number;
}

type Metric = 'sessions' | 'activeUsers' | 'pageViews';

interface Props {
  data: DailyPoint[];
  height?: number;
}

const METRICS: { key: Metric; label: string; colorClass: string }[] = [
  { key: 'sessions', label: 'Sessions', colorClass: 'stroke-primary' },
  { key: 'activeUsers', label: 'Active users', colorClass: 'stroke-emerald-500' },
  { key: 'pageViews', label: 'Page views', colorClass: 'stroke-amber-500' },
];

export function TrendChart({ data, height = 220 }: Props) {
  const [metric, setMetric] = useState<Metric>('sessions');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const values = useMemo(() => data.map((d) => d[metric]), [data, metric]);
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
  for (let i = 0; i <= yTicks; i++) tickValues.push(Math.round((max / yTicks) * i));

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
  const fillClass = active.colorClass.replace('stroke-', 'fill-') + '/10';

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-base font-bold text-foreground">Daily trend</h2>
        <div className="flex items-center gap-1 bg-warm-bg rounded-lg p-0.5">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                metric === m.key ? 'bg-white shadow-sm text-foreground' : 'text-foreground/50 hover:text-foreground/70'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
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
                  {tv.toLocaleString()}
                </text>
              </g>
            );
          })}

          <path d={areaPath} className={fillClass} />
          <path d={linePath} fill="none" strokeWidth={2} className={active.colorClass} />

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
                className={active.colorClass.replace('stroke-', 'fill-')}
              />
            </g>
          ) : null}
        </svg>

        {hoverIdx !== null && data[hoverIdx] ? (
          <div className="absolute top-0 right-0 rounded-lg bg-foreground text-white px-3 py-1.5 text-[11px]">
            <span className="font-semibold">{data[hoverIdx].date}</span>
            <span className="mx-2 opacity-50">·</span>
            <span>{active.label}: {data[hoverIdx][metric].toLocaleString()}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
