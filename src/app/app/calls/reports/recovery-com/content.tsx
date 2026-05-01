'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { downloadRecoveryComPdf } from './pdf';

// /app/calls/reports/recovery-com — full-page Seven Arrows-branded
// performance report scoped to every call CTM tagged with the
// Recovery.com source. Mirrors the public marketing site's tone:
// warm-bg, copper-accent headlines (Fraunces), Inter body. The
// "Download PDF" button hands the same data to /pdf so the printed
// doc doesn't drift from the on-screen copy.

type RangeKey = 7 | 30 | 90 | 'ytd' | 'all';

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 'ytd', label: 'This year' },
  { value: 'all', label: 'All time' },
];

const ALL_TIME_FROM = new Date('2024-01-01T00:00:00.000Z');

function rangeWindow(range: RangeKey): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  if (range === 'all') return { from: ALL_TIME_FROM, to };
  if (range === 'ytd') {
    const from = new Date(to.getFullYear(), 0, 1, 0, 0, 0, 0);
    return { from, to };
  }
  const from = new Date();
  from.setDate(from.getDate() - (range - 1));
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export interface CallLogRow {
  id: string;
  called_at: string;
  direction: string | null;
  duration: number;
  talk_time: number;
  caller_number: string | null;
  city: string | null;
  state: string | null;
  tracking_label: string | null;
  voicemail: boolean;
  score: number | null;
  fit_score: number | null;
  call_name: string | null;
  caller_name: string | null;
  operator_name: string | null;
  client_type: string | null;
  sentiment: string | null;
  summary: string | null;
  next_steps: string | null;
}

export interface RecoveryReportPayload {
  range: { from: string; to: string };
  overview: {
    total: number;
    inbound: number;
    outbound: number;
    missed: number;
    uniqueCallers: number;
    avgDuration: number;
    avgTalkTime: number;
    scoredCount: number;
    meaningful: number;
    highFit: number;
    meaningfulPct: number;
    avgCallScore: number;
    avgFitScore: number;
  };
  dailyCounts: { date: string; count: number; meaningful: number; missed: number }[];
  fitHistogram: { label: string; count: number; range: string }[];
  sentiment: { key: string; count: number }[];
  clientTypes: { label: string; count: number }[];
  operators: {
    name: string;
    count: number;
    avgScore: number | null;
    meaningful: number;
    highFit: number;
  }[];
  repeatCallers: {
    phone: string;
    calls: number;
    firstAt: string;
    lastAt: string;
    city: string | null;
    state: string | null;
  }[];
  callLog: CallLogRow[];
}

export default function RecoveryComReportContent() {
  const { session } = useAuth();
  const [range, setRange] = useState<RangeKey>(90);
  const [data, setData] = useState<RecoveryReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    const { from, to } = rangeWindow(range);
    const url = `/api/calls/reports/recovery-com?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as RecoveryReportPayload;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, session?.access_token]);

  const handleDownload = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      await downloadRecoveryComPdf(data);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="report-root bg-warm-bg min-h-full" style={{ fontFamily: 'var(--font-body)' }}>
      <style jsx global>{`
        /* Print stylesheet — strip the platform shell, expand the
           content to full width, force light backgrounds + dark
           text. The user-facing PDF download uses jsPDF, but a
           native browser print produces a clean copy too. */
        @media print {
          body { background: #ffffff !important; }
          .report-root { background: #ffffff !important; }
          .report-no-print { display: none !important; }
          aside, header[data-platform-shell-header] { display: none !important; }
          .report-section { break-inside: avoid; page-break-inside: avoid; }
          .report-call-row { break-inside: avoid; }
        }
      `}</style>

      {/* Toolbar — back link, date-range picker, download button.
          Hidden on print/PDF (`report-no-print`). */}
      <div className="report-no-print sticky top-0 z-20 bg-warm-bg/85 supports-[backdrop-filter]:bg-warm-bg/65 backdrop-blur border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/app/calls/reports"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/55 hover:text-primary uppercase tracking-wider"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Reports
            </Link>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center rounded-lg border border-black/10 bg-white p-1 gap-1">
              {RANGE_OPTIONS.map((opt) => {
                const active = opt.value === range;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setRange(opt.value)}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
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
            <button
              type="button"
              onClick={handleDownload}
              disabled={!data || downloading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {downloading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                  Building PDF…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
        <ReportHero range={range} data={data} loading={loading} />

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Couldn&rsquo;t load report: {error}
          </div>
        )}

        {!error && data && data.overview.total === 0 && !loading && (
          <div className="mt-10 rounded-2xl border border-black/10 bg-white px-6 py-10 text-center">
            <p className="text-sm font-semibold text-foreground">No Recovery.com calls in this window</p>
            <p className="mt-1 text-xs text-foreground/60">
              Try widening the date range above. Calls only appear here once CTM tags
              the listing as the source.
            </p>
          </div>
        )}

        {data && data.overview.total > 0 && (
          <>
            <KpiBand overview={data.overview} loading={loading} />
            <DailyVolumeChart data={data.dailyCounts} />
            <DistributionsRow
              fitHistogram={data.fitHistogram}
              sentiment={data.sentiment}
              clientTypes={data.clientTypes}
            />
            <OperatorScoreboard rows={data.operators} />
            <RepeatCallersSection rows={data.repeatCallers} />
            <CallLogSection rows={data.callLog} />
          </>
        )}

        <ReportFooter />
      </main>
    </div>
  );
}

// ─── Hero band ──────────────────────────────────────────────────

function ReportHero({
  range,
  data,
  loading,
}: {
  range: RangeKey;
  data: RecoveryReportPayload | null;
  loading: boolean;
}) {
  const today = new Date();
  const fromTo = useMemo(() => {
    if (!data?.range) return rangeWindow(range);
    return { from: new Date(data.range.from), to: new Date(data.range.to) };
  }, [data?.range, range]);
  return (
    <header className="report-section relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-warm-card via-white to-warm-bg shadow-[0_18px_48px_-22px_rgba(60,48,42,0.32)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-white/95 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="px-6 sm:px-10 py-8 sm:py-10 grid grid-cols-1 lg:grid-cols-[1fr,auto] gap-6 items-end relative">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <SevenArrowsLogo />
            <span className="text-[10px] font-bold tracking-[0.28em] uppercase text-foreground/45" style={{ fontFamily: 'var(--font-body)' }}>
              Performance report
            </span>
          </div>
          <h1
            className="text-foreground font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.9rem, 3.6vw, 2.7rem)', lineHeight: 1.05 }}
          >
            <em className="not-italic text-primary">Recovery.com</em> — call performance
          </h1>
          <p className="mt-3 text-sm text-foreground/65 max-w-2xl">
            Every call CTM attributes to the Recovery.com listing — volume,
            lead quality, operator handling, and conversion likelihood —
            for the {windowLabel(fromTo.from, fromTo.to)} window.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-wider text-foreground/45">
            <span>{fromTo.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span aria-hidden="true">→</span>
            <span>{fromTo.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span aria-hidden="true" className="opacity-50">·</span>
            <span>Generated {today.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
          </div>
        </div>
        <div className="relative shrink-0">
          <div className="rounded-2xl border border-primary/20 bg-white px-5 py-4 text-right shadow-sm">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">Total calls</p>
            <p className="mt-1 text-4xl font-bold text-primary tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
              {loading || !data ? '—' : data.overview.total.toLocaleString()}
            </p>
            {!loading && data && (
              <p className="mt-1 text-[10.5px] text-foreground/55">
                {data.overview.uniqueCallers.toLocaleString()} unique callers
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function SevenArrowsLogo() {
  return (
    <span className="inline-flex items-center gap-1 text-primary" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M3 12l4-7h4l-4 7 4 7H7l-4-7zM13 12l4-7h4l-4 7 4 7h-4l-4-7z" />
      </svg>
      <span className="text-[11px] font-bold tracking-[0.18em] uppercase">Seven Arrows</span>
    </span>
  );
}

function windowLabel(from: Date, to: Date): string {
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
  if (days <= 7) return 'last week';
  if (days <= 31) return 'last month';
  if (days <= 92) return 'last quarter';
  if (days <= 366) return 'last year';
  return `${days}-day`;
}

// ─── KPI band (8 stats) ─────────────────────────────────────────

function KpiBand({
  overview,
  loading,
}: {
  overview: RecoveryReportPayload['overview'];
  loading: boolean;
}) {
  const fmtNum = (n: number) => n.toLocaleString();
  const fmtPct = (n: number) => `${Math.round(n * 100)}%`;
  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };
  const conversionPct = overview.scoredCount > 0 ? overview.highFit / overview.scoredCount : 0;

  const kpis: { label: string; value: string; hint?: string; tone: 'primary' | 'emerald' | 'foreground' | 'amber' | 'red' }[] = [
    { label: 'Total calls', value: fmtNum(overview.total), tone: 'foreground' },
    { label: 'Inbound', value: fmtNum(overview.inbound), hint: `${fmtNum(overview.outbound)} outbound`, tone: 'foreground' },
    { label: 'Meaningful (fit ≥ 60)', value: fmtNum(overview.meaningful), hint: fmtPct(overview.meaningfulPct), tone: 'emerald' },
    { label: 'High fit (≥ 75)', value: fmtNum(overview.highFit), hint: `${fmtPct(conversionPct)} of scored`, tone: 'primary' },
    { label: 'Avg call score', value: overview.avgCallScore ? overview.avgCallScore.toFixed(1) : '—', hint: 'AI handling 0–100', tone: 'primary' },
    { label: 'Avg fit score', value: overview.avgFitScore ? overview.avgFitScore.toFixed(1) : '—', hint: 'Lead-quality 0–100', tone: 'emerald' },
    { label: 'Avg duration', value: fmtDuration(overview.avgDuration), hint: `${fmtDuration(overview.avgTalkTime)} talk`, tone: 'foreground' },
    { label: 'Missed inbound', value: fmtNum(overview.missed), hint: 'Voicemail + < 3s talk', tone: 'red' },
  ];

  const toneClass = (t: string) =>
    t === 'primary'
      ? 'text-primary'
      : t === 'emerald'
        ? 'text-emerald-700'
        : t === 'amber'
          ? 'text-amber-700'
          : t === 'red'
            ? 'text-red-700'
            : 'text-foreground';

  return (
    <section className="report-section mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="rounded-2xl border border-black/10 bg-white px-4 py-4 sm:px-5 sm:py-5 shadow-sm"
        >
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">{k.label}</p>
          <p
            className={`mt-1 text-2xl sm:text-3xl font-bold tabular-nums ${toneClass(k.tone)}`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {loading ? '—' : k.value}
          </p>
          {k.hint && <p className="mt-0.5 text-[11px] text-foreground/45">{k.hint}</p>}
        </div>
      ))}
    </section>
  );
}

// ─── Daily volume chart ─────────────────────────────────────────

function DailyVolumeChart({
  data,
}: {
  data: RecoveryReportPayload['dailyCounts'];
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.count));

  // Layout — fixed viewBox so SVG scales to its container width.
  const W = 900;
  const H = 240;
  const PAD_T = 14;
  const PAD_B = 28;
  const PAD_L = 36;
  const PAD_R = 12;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const slot = innerW / data.length;
  const barW = Math.max(2, slot * 0.7);
  const tickStep = niceTickStep(max);
  const ticks: number[] = [];
  for (let v = 0; v <= max; v += tickStep) ticks.push(v);

  return (
    <section className="report-section mt-8 rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
      <SectionTitle eyebrow="Volume" title="Daily call volume" subtitle="Stacked: meaningful (fit ≥ 60) sit on top of total calls." />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
        {ticks.map((v) => {
          const y = PAD_T + innerH - (innerH * v) / max;
          return (
            <g key={v}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="rgba(0,0,0,0.08)" strokeDasharray="3 3" />
              <text x={PAD_L - 6} y={y + 3} fontSize="10" textAnchor="end" fill="rgba(0,0,0,0.45)">
                {v}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const totalY = PAD_T + innerH - (innerH * d.count) / max;
          const totalH = PAD_T + innerH - totalY;
          const meaningfulH = (innerH * d.meaningful) / max;
          const meaningfulY = PAD_T + innerH - meaningfulH;
          const x = PAD_L + i * slot + (slot - barW) / 2;
          const isActive = hover === i;
          return (
            <g
              key={d.date}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'default' }}
            >
              <rect
                x={x}
                y={totalY}
                width={barW}
                height={Math.max(0, totalH)}
                rx={2}
                fill={isActive ? 'rgba(188,107,74,0.85)' : 'rgba(188,107,74,0.55)'}
              />
              {meaningfulH > 0 && (
                <rect
                  x={x}
                  y={meaningfulY}
                  width={barW}
                  height={Math.max(0, meaningfulH)}
                  rx={2}
                  fill={isActive ? 'rgba(16,185,129,0.95)' : 'rgba(16,185,129,0.75)'}
                />
              )}
            </g>
          );
        })}
        {/* X-axis labels — show ~6 evenly spaced. */}
        {data
          .filter((_, i) => i % Math.ceil(data.length / 8) === 0 || i === data.length - 1)
          .map((d) => {
            const idx = data.indexOf(d);
            const x = PAD_L + idx * slot + slot / 2;
            const date = new Date(d.date + 'T00:00:00');
            return (
              <text key={d.date} x={x} y={H - 8} fontSize="10" textAnchor="middle" fill="rgba(0,0,0,0.5)">
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            );
          })}
      </svg>
      {hover != null && data[hover] && (
        <div className="mt-3 inline-flex items-center gap-3 text-[11px] text-foreground/70 px-3 py-1.5 rounded-full bg-warm-bg/70 border border-black/5">
          <span className="font-semibold text-foreground tabular-nums">
            {new Date(data[hover].date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <span>·</span>
          <span>{data[hover].count} calls</span>
          <span>·</span>
          <span className="text-emerald-700 font-semibold">{data[hover].meaningful} meaningful</span>
          {data[hover].missed > 0 && (
            <>
              <span>·</span>
              <span className="text-red-700">{data[hover].missed} missed</span>
            </>
          )}
        </div>
      )}
      <div className="mt-2 flex items-center gap-4 text-[10.5px] text-foreground/55">
        <LegendDot color="rgba(188,107,74,0.55)" label="All calls" />
        <LegendDot color="rgba(16,185,129,0.75)" label="Meaningful (fit ≥ 60)" />
      </div>
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </span>
  );
}

function niceTickStep(max: number): number {
  if (max <= 5) return 1;
  if (max <= 10) return 2;
  if (max <= 25) return 5;
  if (max <= 50) return 10;
  if (max <= 100) return 20;
  if (max <= 250) return 50;
  return Math.ceil(max / 5);
}

// ─── Distributions row (fit / sentiment / client type) ──────────

function DistributionsRow({
  fitHistogram,
  sentiment,
  clientTypes,
}: {
  fitHistogram: RecoveryReportPayload['fitHistogram'];
  sentiment: RecoveryReportPayload['sentiment'];
  clientTypes: RecoveryReportPayload['clientTypes'];
}) {
  return (
    <section className="report-section mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
        <SectionTitle eyebrow="Lead quality" title="Fit-score buckets" subtitle="How many of the scored calls landed in each fit-score range." />
        <FitHistogram rows={fitHistogram} />
      </div>
      <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
        <SectionTitle eyebrow="Tone" title="Sentiment" subtitle="AI read of the conversational tone." />
        <SentimentBars rows={sentiment} />
      </div>
      <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
        <SectionTitle eyebrow="Mix" title="Client type" subtitle="How the AI categorised the caller." />
        <ClientTypeList rows={clientTypes} />
      </div>
    </section>
  );
}

function FitHistogram({ rows }: { rows: RecoveryReportPayload['fitHistogram'] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const pct = (r.count / max) * 100;
        const tone =
          r.range === '75-100'
            ? 'bg-emerald-500'
            : r.range === '60-74'
              ? 'bg-emerald-400'
              : r.range === '40-59'
                ? 'bg-amber-400'
                : r.range === '20-39'
                  ? 'bg-orange-400'
                  : 'bg-red-400';
        return (
          <div key={r.range}>
            <div className="flex items-center justify-between text-[11px] text-foreground/65 mb-1">
              <span className="font-semibold">{r.label}</span>
              <span className="tabular-nums">{r.count}</span>
            </div>
            <div className="h-2 bg-warm-bg rounded-full overflow-hidden">
              <div className={`h-full ${tone} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SentimentBars({ rows }: { rows: RecoveryReportPayload['sentiment'] }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  if (total === 0) {
    return <p className="text-xs text-foreground/45 italic">No scored calls yet.</p>;
  }
  const tone = (k: string) =>
    k === 'positive'
      ? 'bg-emerald-500'
      : k === 'negative'
        ? 'bg-red-500'
        : k === 'neutral'
          ? 'bg-slate-400'
          : 'bg-foreground/30';
  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const pct = total > 0 ? (r.count / total) * 100 : 0;
        return (
          <div key={r.key}>
            <div className="flex items-center justify-between text-[11px] text-foreground/65 mb-1">
              <span className="font-semibold capitalize">{r.key}</span>
              <span className="tabular-nums">{r.count} · {Math.round(pct)}%</span>
            </div>
            <div className="h-2 bg-warm-bg rounded-full overflow-hidden">
              <div className={`h-full ${tone(r.key)} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClientTypeList({ rows }: { rows: RecoveryReportPayload['clientTypes'] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-foreground/45 italic">No client-type tags yet.</p>;
  }
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return (
    <ul className="space-y-2">
      {rows.slice(0, 8).map((r) => {
        const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
        return (
          <li key={r.label} className="flex items-center justify-between text-[12px]">
            <span className="text-foreground/75">{r.label}</span>
            <span className="text-foreground/55 tabular-nums">{r.count} <span className="text-foreground/35">· {pct}%</span></span>
          </li>
        );
      })}
      {rows.length > 8 && (
        <li className="text-[11px] text-foreground/45 italic pt-1">
          + {rows.length - 8} more
        </li>
      )}
    </ul>
  );
}

// ─── Operator scoreboard ─────────────────────────────────────────

function OperatorScoreboard({ rows }: { rows: RecoveryReportPayload['operators'] }) {
  if (rows.length === 0) return null;
  return (
    <section className="report-section mt-8 rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
      <SectionTitle eyebrow="Team" title="Operator handling" subtitle="Who answered Recovery.com calls, how they performed, and how often the call landed in the meaningful bucket." />
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead className="bg-warm-bg/60 text-left text-[11px] uppercase tracking-wider text-foreground/55">
            <tr>
              <th className="px-3 py-2 rounded-l-lg">Operator</th>
              <th className="px-3 py-2 text-right">Calls</th>
              <th className="px-3 py-2 text-right">Avg score</th>
              <th className="px-3 py-2 text-right">Meaningful</th>
              <th className="px-3 py-2 text-right rounded-r-lg">High fit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((r) => (
              <tr key={r.name} className="align-middle">
                <td className="px-3 py-2.5 font-semibold text-foreground">{r.name}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.count}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {r.avgScore != null ? r.avgScore.toFixed(1) : <span className="text-foreground/40">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 font-semibold">
                  {r.meaningful}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-primary font-semibold">
                  {r.highFit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Repeat callers ─────────────────────────────────────────────

function RepeatCallersSection({ rows }: { rows: RecoveryReportPayload['repeatCallers'] }) {
  if (rows.length === 0) return null;
  return (
    <section className="report-section mt-8 rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
      <SectionTitle
        eyebrow="Persistence"
        title="Repeat callers"
        subtitle="Numbers that called more than once in this window — usually a sign of high intent or unresolved follow-up."
      />
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead className="bg-warm-bg/60 text-left text-[11px] uppercase tracking-wider text-foreground/55">
            <tr>
              <th className="px-3 py-2 rounded-l-lg">Phone</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2 text-right">Calls</th>
              <th className="px-3 py-2">First</th>
              <th className="px-3 py-2 rounded-r-lg">Last</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((r) => (
              <tr key={r.phone}>
                <td className="px-3 py-2.5 font-semibold text-foreground tabular-nums">{r.phone}</td>
                <td className="px-3 py-2.5 text-foreground/65">
                  {[r.city, r.state].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-primary font-semibold">{r.calls}</td>
                <td className="px-3 py-2.5 text-foreground/55">
                  {new Date(r.firstAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </td>
                <td className="px-3 py-2.5 text-foreground/55">
                  {new Date(r.lastAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Call log ───────────────────────────────────────────────────

const PAGE_SIZE = 25;

function CallLogSection({ rows }: { rows: CallLogRow[] }) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.caller_number, r.caller_name, r.call_name, r.operator_name, r.client_type, r.summary]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [rows, search]);
  const pageStart = page * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  return (
    <section className="report-section mt-8 rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <SectionTitle
          eyebrow="Detail"
          title="Comprehensive call log"
          subtitle={`${rows.length.toLocaleString()} calls in this window. Click any row to open the full transcript and AI analysis.`}
        />
        <div className="report-no-print w-full sm:w-auto">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search caller, operator, summary…"
            className="w-full sm:w-64 px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead className="bg-warm-bg/60 text-left text-[11px] uppercase tracking-wider text-foreground/55">
            <tr>
              <th className="px-3 py-2 rounded-l-lg">When</th>
              <th className="px-3 py-2">Caller</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2 text-right">Duration</th>
              <th className="px-3 py-2 text-right">Score</th>
              <th className="px-3 py-2 text-right">Fit</th>
              <th className="px-3 py-2">Operator</th>
              <th className="px-3 py-2">Client type</th>
              <th className="px-3 py-2 rounded-r-lg">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {pageRows.map((r) => (
              <tr key={r.id} className="report-call-row align-top hover:bg-warm-bg/40 transition-colors">
                <td className="px-3 py-2.5 text-foreground/55 whitespace-nowrap">
                  {new Date(r.called_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-foreground">
                    {r.caller_name || r.caller_number || 'Unknown'}
                  </div>
                  {r.caller_name && r.caller_number && (
                    <div className="text-[11px] text-foreground/45 tabular-nums">{r.caller_number}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-foreground/65">
                  {[r.city, r.state].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-foreground/65">
                  {fmtDuration(r.duration)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <ScoreCell value={r.score} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <FitCell value={r.fit_score} />
                </td>
                <td className="px-3 py-2.5 text-foreground/65 whitespace-nowrap">
                  {r.operator_name || <span className="text-foreground/35">—</span>}
                </td>
                <td className="px-3 py-2.5 text-foreground/65 whitespace-nowrap">
                  {r.client_type || <span className="text-foreground/35">—</span>}
                </td>
                <td className="px-3 py-2.5 text-foreground/75 max-w-[420px]">
                  {r.summary ? (
                    <span className="line-clamp-2 leading-snug">{r.summary}</span>
                  ) : (
                    <span className="text-foreground/35 italic">No analysis</span>
                  )}
                  {r.next_steps && (
                    <div className="mt-1 text-[11px] text-primary line-clamp-1">→ {r.next_steps}</div>
                  )}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-foreground/45 text-sm">
                  No matching calls.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="report-no-print mt-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] text-foreground/55">
            Page {page + 1} of {totalPages} · showing {pageRows.length} of {filtered.length}
          </p>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-foreground/70 bg-white border border-black/10 hover:bg-warm-bg disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-foreground/70 bg-white border border-black/10 hover:bg-warm-bg disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ScoreCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-foreground/35">—</span>;
  const tone =
    value >= 80 ? 'text-emerald-700 bg-emerald-50' : value >= 60 ? 'text-blue-700 bg-blue-50' : value >= 40 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
  return (
    <span className={`inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums ${tone}`}>
      {value}
    </span>
  );
}

function FitCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-foreground/35">—</span>;
  const tone =
    value >= 75 ? 'text-emerald-700 bg-emerald-50' : value >= 60 ? 'text-emerald-600 bg-emerald-50/70' : value >= 40 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
  return (
    <span className={`inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums ${tone}`}>
      {value}
    </span>
  );
}

function fmtDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Section title helper ───────────────────────────────────────

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-primary/85">{eyebrow}</p>
      <h3 className="mt-0.5 text-base sm:text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h3>
      {subtitle && <p className="mt-1 text-[12px] text-foreground/60 leading-snug max-w-2xl">{subtitle}</p>}
    </div>
  );
}

// ─── Footer ─────────────────────────────────────────────────────

function ReportFooter() {
  return (
    <footer className="mt-12 pt-6 border-t border-black/10 text-center">
      <p className="text-[11px] text-foreground/50">
        Seven Arrows Recovery · Generated by the patient portal · sevenarrowsrecoveryarizona.com
      </p>
    </footer>
  );
}

