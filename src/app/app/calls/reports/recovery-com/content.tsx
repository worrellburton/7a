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
//
// Volume + attribution only — daily/hourly/day-of-week breakdowns,
// missed-call counts, top tracking labels, sources, geo. The GA4
// website-traffic slice loads from a sister endpoint.

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
  tracking_number: string | null;
  source: string | null;
  voicemail: boolean;
}

export interface RecoveryReportPayload {
  range: { from: string; to: string };
  overview: {
    total: number;
    inbound: number;
    outbound: number;
    missed: number;
    voicemails: number;
    uniqueCallers: number;
    avgDuration: number;
    avgTalkTime: number;
    totalDuration: number;
    totalTalkTime: number;
  };
  dailyCounts: { date: string; count: number; missed: number }[];
  hourlyCounts: { hour: number; count: number }[];
  dowCounts: { day: number; label: string; count: number }[];
  trackingLabels: { label: string; count: number }[];
  trackingNumbers: { number: string; count: number }[];
  sources: { label: string; count: number }[];
  cities: { city: string; state: string | null; count: number }[];
  states: { state: string; count: number }[];
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

// GA4 payload — pulled from /api/calls/reports/recovery-com/analytics.
// Surfaces undefined when GA4 isn't wired up (configured=false) so
// the section can collapse cleanly without lighting up an error.
export interface AnalyticsPayload {
  configured: boolean;
  range?: { startDate: string; endDate: string; prevStart: string | null; prevEnd: string | null };
  sourceFilter?: string[];
  summary?: AnalyticsSummary;
  previous?: AnalyticsSummary | null;
  daily?: { date: string; sessions: number; activeUsers: number; pageViews: number }[];
  landing?: {
    path: string;
    sessions: number;
    activeUsers: number;
    engagementRate: number;
    avgSessionDurationSec: number;
    bounceRate: number;
  }[];
  countries?: { country: string; sessions: number; activeUsers: number }[];
  cities?: {
    city: string;
    region: string | null;
    country: string | null;
    sessions: number;
    activeUsers: number;
    engagementRate: number;
  }[];
  devices?: { device: string; sessions: number; activeUsers: number; engagementRate: number }[];
  browsers?: { name: string; sessions: number; engagementRate: number }[];
  operatingSystems?: { name: string; sessions: number; engagementRate: number }[];
  sources?: {
    source: string;
    sessions: number;
    activeUsers: number;
    engagementRate: number;
    avgSessionDurationSec: number;
    bounceRate: number;
  }[];
  sourceMedium?: {
    source: string;
    medium: string;
    sessions: number;
    activeUsers: number;
    engagementRate: number;
  }[];
  campaigns?: { name: string; sessions: number; activeUsers: number; engagementRate: number }[];
  hourly?: { hour: number; sessions: number }[];
  dayOfWeek?: { day: number; label: string; sessions: number }[];
  newVsReturning?: { label: string; sessions: number; activeUsers: number }[];
  events?: { name: string; count: number; users: number }[];
  debug?: {
    allSources?: { source: string; medium: string; sessions: number }[];
  };
  error?: string;
}

export interface AnalyticsSummary {
  sessions: number;
  activeUsers: number;
  newUsers: number;
  pageViews: number;
  avgSessionDurationSec: number;
  bounceRate: number;
  engagementRate: number;
  pagesPerSession: number;
}

export default function RecoveryComReportContent() {
  const { session } = useAuth();
  const [range, setRange] = useState<RangeKey>(90);
  const [data, setData] = useState<RecoveryReportPayload | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
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

  // GA4-backed website-traffic slice for the same window. Fires
  // independently of the calls fetch so a slow GA call doesn't
  // delay the call charts. Failure is non-fatal — the section
  // renders an "analytics not available" banner instead.
  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    const { from, to } = rangeWindow(range);
    const startDate = from.toISOString().slice(0, 10);
    const endDate = to.toISOString().slice(0, 10);
    const url = `/api/calls/reports/recovery-com/analytics?startDate=${startDate}&endDate=${endDate}`;
    let cancelled = false;
    setAnalytics(null);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => (r.ok ? ((await r.json()) as AnalyticsPayload) : null))
      .then((json) => {
        if (!cancelled && json) setAnalytics(json);
      })
      .catch(() => {
        if (!cancelled) setAnalytics({ configured: false });
      });
    return () => {
      cancelled = true;
    };
  }, [range, session?.access_token]);

  const handleDownload = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      await downloadRecoveryComPdf(data, analytics);
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
            <TimePatternsRow hourly={data.hourlyCounts} dowCounts={data.dowCounts} />
            <AttributionRow
              trackingLabels={data.trackingLabels}
              trackingNumbers={data.trackingNumbers}
              sources={data.sources}
            />
            <GeoRow cities={data.cities} states={data.states} />
            <AnalyticsSection analytics={analytics} />
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
            Every call CTM attributes to the Recovery.com listing — call volume,
            tracking-line attribution, and caller geography — for the {windowLabel(fromTo.from, fromTo.to)} window.
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

// ─── KPI band ───────────────────────────────────────────────────

function KpiBand({
  overview,
  loading,
}: {
  overview: RecoveryReportPayload['overview'];
  loading: boolean;
}) {
  const fmtNum = (n: number) => n.toLocaleString();
  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const kpis: { label: string; value: string; hint?: string; tone: 'primary' | 'emerald' | 'foreground' | 'amber' | 'red' }[] = [
    { label: 'Total calls', value: fmtNum(overview.total), tone: 'foreground' },
    { label: 'Inbound', value: fmtNum(overview.inbound), hint: `${fmtNum(overview.outbound)} outbound`, tone: 'foreground' },
    { label: 'Unique callers', value: fmtNum(overview.uniqueCallers), hint: 'Distinct phone numbers', tone: 'foreground' },
    { label: 'Voicemails', value: fmtNum(overview.voicemails), hint: 'Of total calls', tone: 'amber' },
    { label: 'Avg duration', value: fmtDuration(overview.avgDuration), hint: `${fmtDuration(overview.avgTalkTime)} talk`, tone: 'emerald' },
    { label: 'Total talk time', value: fmtDuration(overview.totalTalkTime), hint: `${fmtDuration(overview.totalDuration)} ringtime`, tone: 'emerald' },
    { label: 'Missed inbound', value: fmtNum(overview.missed), hint: 'Voicemail + < 3s talk', tone: 'red' },
    { label: 'Outbound', value: fmtNum(overview.outbound), hint: 'Calls placed', tone: 'foreground' },
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
      <SectionTitle eyebrow="Volume" title="Daily call volume" subtitle="Total calls per day, with missed inbound calls highlighted in red." />
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
          const missedH = (innerH * d.missed) / max;
          const missedY = PAD_T + innerH - missedH;
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
              {missedH > 0 && (
                <rect
                  x={x}
                  y={missedY}
                  width={barW}
                  height={Math.max(0, missedH)}
                  rx={2}
                  fill={isActive ? 'rgba(220,38,38,0.95)' : 'rgba(220,38,38,0.75)'}
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
        <LegendDot color="rgba(220,38,38,0.75)" label="Missed inbound" />
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

// ─── Hour-of-day + day-of-week (calls) ──────────────────────────

function TimePatternsRow({
  hourly,
  dowCounts,
}: {
  hourly: RecoveryReportPayload['hourlyCounts'];
  dowCounts: RecoveryReportPayload['dowCounts'];
}) {
  const hourlyHas = hourly.some((h) => h.count > 0);
  const dowHas = dowCounts.some((d) => d.count > 0);
  if (!hourlyHas && !dowHas) return null;
  const maxHourly = Math.max(1, ...hourly.map((h) => h.count));
  const maxDay = Math.max(1, ...dowCounts.map((d) => d.count));
  const peakHour = hourly.reduce((best, h) => (h.count > best.count ? h : best), hourly[0]);
  const peakDay = dowCounts.reduce((best, d) => (d.count > best.count ? d : best), dowCounts[0]);
  const fmtHour = (h: number) => {
    if (h === 0) return '12am';
    if (h < 12) return `${h}am`;
    if (h === 12) return '12pm';
    return `${h - 12}pm`;
  };
  return (
    <section className="report-section mt-8 rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
      <SectionTitle eyebrow="Timing" title="When calls arrive" subtitle="Hour-of-day and day-of-week distribution for Recovery.com calls (Phoenix time)." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground/50">By hour</p>
            {peakHour && peakHour.count > 0 && (
              <p className="text-[11px] text-foreground/55">
                Peak: <span className="font-semibold text-primary">{fmtHour(peakHour.hour)}</span> · {peakHour.count}
              </p>
            )}
          </div>
          <div className="flex items-end gap-0.5 h-28">
            {hourly.map((h) => {
              const pct = (h.count / maxHourly) * 100;
              const isPeak = peakHour && h.hour === peakHour.hour && h.count > 0;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    className={`w-full rounded-t-sm transition-all ${isPeak ? 'bg-primary' : 'bg-primary/55'} group-hover:bg-primary`}
                    style={{ height: `${pct}%`, minHeight: h.count > 0 ? 2 : 0 }}
                    title={`${fmtHour(h.hour)} · ${h.count} calls`}
                  />
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-12 mt-1 text-[9px] text-foreground/45 text-center">
            <span className="col-span-3">12am</span>
            <span className="col-span-3">6am</span>
            <span className="col-span-3">noon</span>
            <span className="col-span-3">6pm</span>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground/50">By day of week</p>
            {peakDay && peakDay.count > 0 && (
              <p className="text-[11px] text-foreground/55">
                Peak: <span className="font-semibold text-primary">{peakDay.label}</span> · {peakDay.count}
              </p>
            )}
          </div>
          <ul className="space-y-1.5">
            {dowCounts.map((d) => {
              const pct = maxDay > 0 ? (d.count / maxDay) * 100 : 0;
              return (
                <li key={d.day} className="text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground/75 font-semibold">{d.label}</span>
                    <span className="text-foreground/55 tabular-nums">{d.count}</span>
                  </div>
                  <div className="mt-1 h-2 bg-warm-bg rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─── Attribution row (tracking labels / numbers / sources) ──────

function AttributionRow({
  trackingLabels,
  trackingNumbers,
  sources,
}: {
  trackingLabels: RecoveryReportPayload['trackingLabels'];
  trackingNumbers: RecoveryReportPayload['trackingNumbers'];
  sources: RecoveryReportPayload['sources'];
}) {
  if (trackingLabels.length === 0 && trackingNumbers.length === 0 && sources.length === 0) return null;
  return (
    <section className="report-section mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
        <SectionTitle eyebrow="Attribution" title="Top tracking labels" subtitle="The CTM tracking-line label that fielded the call." />
        <CountList rows={trackingLabels.map((r) => ({ label: r.label, count: r.count }))} accent="primary" />
      </div>
      <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
        <SectionTitle eyebrow="Attribution" title="Top tracking numbers" subtitle="The dialed-in tracking number per CTM line." />
        <CountList
          rows={trackingNumbers.map((r) => ({ label: r.number, count: r.count }))}
          accent="primary"
          mono
        />
      </div>
      <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
        <SectionTitle eyebrow="Attribution" title="Top sources" subtitle="CTM source string variants we caught for Recovery.com." />
        <CountList rows={sources.map((r) => ({ label: r.label, count: r.count }))} accent="emerald" />
      </div>
    </section>
  );
}

function CountList({
  rows,
  accent,
  mono = false,
}: {
  rows: { label: string; count: number }[];
  accent: 'primary' | 'emerald';
  mono?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-xs text-foreground/45 italic">No data in this window.</p>;
  }
  const max = Math.max(1, ...rows.map((r) => r.count));
  const tone = accent === 'primary' ? 'bg-primary/70' : 'bg-emerald-500';
  return (
    <ul className="space-y-2.5">
      {rows.slice(0, 12).map((r) => {
        const pct = (r.count / max) * 100;
        return (
          <li key={r.label}>
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span className={`text-foreground/80 truncate ${mono ? 'font-mono text-[11.5px]' : ''}`}>{r.label}</span>
              <span className="text-foreground/55 tabular-nums shrink-0 ml-2">{r.count}</span>
            </div>
            <div className="h-1.5 bg-warm-bg rounded-full overflow-hidden">
              <div className={`h-full ${tone} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
      {rows.length > 12 && (
        <li className="text-[11px] text-foreground/45 italic pt-1">+ {rows.length - 12} more</li>
      )}
    </ul>
  );
}

// ─── Geography (cities + states) ───────────────────────────────

function GeoRow({
  cities,
  states,
}: {
  cities: RecoveryReportPayload['cities'];
  states: RecoveryReportPayload['states'];
}) {
  if (cities.length === 0 && states.length === 0) return null;
  return (
    <section className="report-section mt-8 rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
      <SectionTitle eyebrow="Geography" title="Where callers are dialing from" subtitle="Top cities and states inferred from CTM caller-location data." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground/50 mb-2">Top cities</p>
          {cities.length === 0 ? (
            <p className="text-xs text-foreground/45 italic">No city data in this window.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-warm-bg/60 text-left text-[11px] uppercase tracking-wider text-foreground/55">
                <tr>
                  <th className="px-3 py-2 rounded-l-lg">City</th>
                  <th className="px-3 py-2">State</th>
                  <th className="px-3 py-2 text-right rounded-r-lg">Calls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {cities.map((r, i) => (
                  <tr key={`${r.city}-${i}`}>
                    <td className="px-3 py-2.5 font-semibold text-foreground">{r.city}</td>
                    <td className="px-3 py-2.5 text-foreground/65">{r.state ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-primary">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground/50 mb-2">Top states</p>
          {states.length === 0 ? (
            <p className="text-xs text-foreground/45 italic">No state data in this window.</p>
          ) : (
            <ul className="space-y-1.5">
              {states.slice(0, 10).map((r) => {
                const total = states.reduce((s, x) => s + x.count, 0) || 1;
                const pct = (r.count / total) * 100;
                return (
                  <li key={r.state} className="text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground/75">{r.state}</span>
                      <span className="text-foreground/55 tabular-nums">
                        {r.count} <span className="text-foreground/35">· {pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 bg-warm-bg rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
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
      [r.caller_number, r.tracking_label, r.tracking_number, r.source, r.city, r.state]
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
          subtitle={`${rows.length.toLocaleString()} calls in this window.`}
        />
        <div className="report-no-print w-full sm:w-auto">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search caller, tracking, location…"
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
              <th className="px-3 py-2">Direction</th>
              <th className="px-3 py-2 text-right">Duration</th>
              <th className="px-3 py-2">Tracking line</th>
              <th className="px-3 py-2 rounded-r-lg">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {pageRows.map((r) => (
              <tr key={r.id} className="report-call-row align-top hover:bg-warm-bg/40 transition-colors">
                <td className="px-3 py-2.5 text-foreground/55 whitespace-nowrap">
                  {new Date(r.called_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-foreground tabular-nums">
                    {r.caller_number || 'Unknown'}
                  </div>
                  {r.voicemail && (
                    <div className="text-[11px] text-amber-700 font-semibold">Voicemail</div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-foreground/65">
                  {[r.city, r.state].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-3 py-2.5 text-foreground/65 capitalize">
                  {r.direction || '—'}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-foreground/65">
                  {fmtDuration(r.duration)}
                </td>
                <td className="px-3 py-2.5 text-foreground/75">
                  {r.tracking_label || <span className="text-foreground/35">—</span>}
                  {r.tracking_number && (
                    <div className="text-[11px] text-foreground/45 font-mono tabular-nums">{r.tracking_number}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-foreground/65">
                  {r.source || <span className="text-foreground/35">—</span>}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-foreground/45 text-sm">
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

function fmtDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Analytics (GA4) ────────────────────────────────────────────

function AnalyticsSection({ analytics }: { analytics: AnalyticsPayload | null }) {
  if (!analytics) {
    return (
      <section className="report-section mt-8 rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
        <SectionTitle eyebrow="Website" title="Traffic via Recovery.com" subtitle="Loading Google Analytics…" />
        <div className="h-32 grid place-items-center text-xs text-foreground/40">Fetching GA4 data…</div>
      </section>
    );
  }
  if (!analytics.configured) {
    return (
      <section className="report-section mt-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6">
        <SectionTitle
          eyebrow="Website"
          title="Traffic via Recovery.com"
          subtitle="GA4 isn't connected on this environment, so the website-traffic slice is unavailable. Add a service-account / OAuth token + GA4_PROPERTY_ID and the section fills in automatically."
        />
      </section>
    );
  }
  if (analytics.error) {
    return (
      <section className="report-section mt-8 rounded-2xl border border-red-200 bg-red-50/60 p-5 sm:p-6">
        <SectionTitle eyebrow="Website" title="Traffic via Recovery.com" subtitle={`GA4 error: ${analytics.error}`} />
      </section>
    );
  }
  if (!analytics.summary || analytics.summary.sessions === 0) {
    const allSources = analytics.debug?.allSources ?? [];
    const recoveryHits = allSources.filter((r) =>
      /recovery|rehab/i.test(r.source),
    );
    return (
      <section className="report-section mt-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6">
        <SectionTitle
          eyebrow="Website"
          title="Traffic via Recovery.com"
          subtitle="GA4 returned zero sessions whose source matches our Recovery.com filter for this window. The source list below shows every source GA actually emitted — if you spot a match we should be including, tell us and we'll widen the filter."
        />
        {recoveryHits.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-white px-4 py-3 mb-4 text-[12px] text-amber-900">
            <p className="font-semibold mb-1">Looks like we should be matching these — they contain &ldquo;recovery&rdquo; or &ldquo;rehab&rdquo;:</p>
            <ul className="space-y-0.5 font-mono text-[11px]">
              {recoveryHits.map((r) => (
                <li key={`${r.source}-${r.medium}`}>
                  {r.source} / {r.medium} <span className="text-amber-700">· {r.sessions} sessions</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {allSources.length > 0 && (
          <div className="rounded-lg border border-black/10 bg-white px-4 py-3 text-[12px]">
            <p className="font-semibold text-foreground/75 mb-1">Top {allSources.length} source / medium pairs GA reported (any source):</p>
            <table className="w-full text-[11px]">
              <thead className="text-foreground/50 text-left">
                <tr>
                  <th className="py-1 pr-3">Source</th>
                  <th className="py-1 pr-3">Medium</th>
                  <th className="py-1 text-right">Sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {allSources.map((r, i) => (
                  <tr key={`${r.source}-${r.medium}-${i}`}>
                    <td className="py-1 pr-3 font-mono text-foreground/85">{r.source}</td>
                    <td className="py-1 pr-3 font-mono text-foreground/55">{r.medium}</td>
                    <td className="py-1 text-right tabular-nums text-foreground/65">{r.sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }
  return (
    <section className="report-section mt-8 space-y-4">
      <AnalyticsKpiBand summary={analytics.summary} previous={analytics.previous ?? null} />
      <AnalyticsSourcesSplit
        sources={analytics.sources ?? []}
        sourceMedium={analytics.sourceMedium ?? []}
        sourceFilter={analytics.sourceFilter ?? []}
        newVsReturning={analytics.newVsReturning ?? []}
      />
      <AnalyticsDailyChart daily={analytics.daily ?? []} />
      <AnalyticsTimePatterns hourly={analytics.hourly ?? []} dayOfWeek={analytics.dayOfWeek ?? []} />
      <AnalyticsLandingPages rows={analytics.landing ?? []} />
      <AnalyticsGeoTable cities={analytics.cities ?? []} countries={analytics.countries ?? []} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <AnalyticsDevices rows={analytics.devices ?? []} />
        <AnalyticsBrowserOs browsers={analytics.browsers ?? []} operatingSystems={analytics.operatingSystems ?? []} />
        <AnalyticsEvents rows={analytics.events ?? []} />
      </div>
      {analytics.campaigns && analytics.campaigns.length > 0 && (
        <AnalyticsCampaigns rows={analytics.campaigns} />
      )}
    </section>
  );
}

// ─── Per-source split (recoverycom vs rehabpath) + medium pairs ─

function AnalyticsSourcesSplit({
  sources,
  sourceMedium,
  sourceFilter,
  newVsReturning,
}: {
  sources: NonNullable<AnalyticsPayload['sources']>;
  sourceMedium: NonNullable<AnalyticsPayload['sourceMedium']>;
  sourceFilter: string[];
  newVsReturning: NonNullable<AnalyticsPayload['newVsReturning']>;
}) {
  if (sources.length === 0) return null;
  const total = sources.reduce((s, r) => s + r.sessions, 0) || 1;
  const nvrTotal = newVsReturning.reduce((s, r) => s + r.sessions, 0) || 1;
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
      <SectionTitle
        eyebrow="Sources"
        title="Recovery.com network split"
        subtitle={`Both ${sourceFilter.join(' and ')} feed traffic into the report — here's how the two sources compare side by side.`}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground/50 mb-2">By source</p>
          <table className="w-full text-sm">
            <thead className="bg-warm-bg/60 text-left text-[11px] uppercase tracking-wider text-foreground/55">
              <tr>
                <th className="px-3 py-2 rounded-l-lg">Source</th>
                <th className="px-3 py-2 text-right">Sessions</th>
                <th className="px-3 py-2 text-right">Users</th>
                <th className="px-3 py-2 text-right">Avg session</th>
                <th className="px-3 py-2 text-right rounded-r-lg">Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {sources.map((r) => {
                const pct = (r.sessions / total) * 100;
                return (
                  <tr key={r.source}>
                    <td className="px-3 py-2.5">
                      <div className="font-mono text-[12.5px] font-semibold text-foreground">{r.source}</div>
                      <div className="mt-1 h-1.5 bg-warm-bg rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-primary">{r.sessions}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-foreground/65">{r.activeUsers}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-foreground/65">{fmtSecs(r.avgSessionDurationSec)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 font-semibold">{(r.engagementRate * 100).toFixed(0)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {newVsReturning.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground/50 mb-2">New vs returning</p>
              <ul className="space-y-1.5">
                {newVsReturning.map((r) => {
                  const pct = (r.sessions / nvrTotal) * 100;
                  return (
                    <li key={r.label} className="text-[12px]">
                      <div className="flex items-center justify-between">
                        <span className="capitalize text-foreground/75">{r.label || 'unknown'}</span>
                        <span className="text-foreground/55 tabular-nums">
                          {r.sessions} <span className="text-foreground/35">· {pct.toFixed(0)}%</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 bg-warm-bg rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground/50 mb-2">By source / medium</p>
          <ul className="space-y-1.5">
            {sourceMedium.slice(0, 12).map((r, i) => (
              <li key={`${r.source}-${r.medium}-${i}`} className="text-[12px] flex items-center justify-between">
                <span className="font-mono text-[11px] text-foreground/70 truncate">
                  {r.source} <span className="text-foreground/35">/ {r.medium}</span>
                </span>
                <span className="text-foreground/55 tabular-nums">
                  {r.sessions}
                  <span className="text-foreground/35"> · {(r.engagementRate * 100).toFixed(0)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Hour-of-day + day-of-week ─────────────────────────────────

function AnalyticsTimePatterns({
  hourly,
  dayOfWeek,
}: {
  hourly: NonNullable<AnalyticsPayload['hourly']>;
  dayOfWeek: NonNullable<AnalyticsPayload['dayOfWeek']>;
}) {
  if (hourly.every((h) => h.sessions === 0) && dayOfWeek.every((d) => d.sessions === 0)) {
    return null;
  }
  const maxHourly = Math.max(1, ...hourly.map((h) => h.sessions));
  const maxDay = Math.max(1, ...dayOfWeek.map((d) => d.sessions));
  const peakHour = hourly.reduce((best, h) => (h.sessions > best.sessions ? h : best), hourly[0]);
  const peakDay = dayOfWeek.reduce((best, d) => (d.sessions > best.sessions ? d : best), dayOfWeek[0]);
  const fmtHour = (h: number) => {
    if (h === 0) return '12am';
    if (h < 12) return `${h}am`;
    if (h === 12) return '12pm';
    return `${h - 12}pm`;
  };
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
      <SectionTitle
        eyebrow="Timing"
        title="When traffic arrives"
        subtitle="Helps admissions staff their shifts — peak hour and peak day of the week for Recovery.com referrals."
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground/50">By hour (Phoenix time)</p>
            {peakHour && peakHour.sessions > 0 && (
              <p className="text-[11px] text-foreground/55">
                Peak: <span className="font-semibold text-primary">{fmtHour(peakHour.hour)}</span> · {peakHour.sessions}
              </p>
            )}
          </div>
          <div className="flex items-end gap-0.5 h-28">
            {hourly.map((h) => {
              const pct = (h.sessions / maxHourly) * 100;
              const isPeak = peakHour && h.hour === peakHour.hour && h.sessions > 0;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    className={`w-full rounded-t-sm transition-all ${isPeak ? 'bg-primary' : 'bg-blue-400/70'} group-hover:bg-primary`}
                    style={{ height: `${pct}%`, minHeight: h.sessions > 0 ? 2 : 0 }}
                    title={`${fmtHour(h.hour)} · ${h.sessions} sessions`}
                  />
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-12 mt-1 text-[9px] text-foreground/45 text-center">
            <span className="col-span-3">12am</span>
            <span className="col-span-3">6am</span>
            <span className="col-span-3">noon</span>
            <span className="col-span-3">6pm</span>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground/50">By day of week</p>
            {peakDay && peakDay.sessions > 0 && (
              <p className="text-[11px] text-foreground/55">
                Peak: <span className="font-semibold text-primary">{peakDay.label}</span> · {peakDay.sessions}
              </p>
            )}
          </div>
          <ul className="space-y-1.5">
            {dayOfWeek.map((d) => {
              const pct = maxDay > 0 ? (d.sessions / maxDay) * 100 : 0;
              return (
                <li key={d.day} className="text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground/75 font-semibold">{d.label}</span>
                    <span className="text-foreground/55 tabular-nums">{d.sessions}</span>
                  </div>
                  <div className="mt-1 h-2 bg-warm-bg rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Geo table (cities + countries) ────────────────────────────

function AnalyticsGeoTable({
  cities,
  countries,
}: {
  cities: NonNullable<AnalyticsPayload['cities']>;
  countries: NonNullable<AnalyticsPayload['countries']>;
}) {
  if (cities.length === 0 && countries.length === 0) return null;
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
      <SectionTitle eyebrow="Geo" title="Where they're browsing from" subtitle="Top cities (richer than country alone for an admissions team) plus a country fallback." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground/50 mb-2">Top cities</p>
          <table className="w-full text-sm">
            <thead className="bg-warm-bg/60 text-left text-[11px] uppercase tracking-wider text-foreground/55">
              <tr>
                <th className="px-3 py-2 rounded-l-lg">City</th>
                <th className="px-3 py-2">Region / country</th>
                <th className="px-3 py-2 text-right">Sessions</th>
                <th className="px-3 py-2 text-right">Users</th>
                <th className="px-3 py-2 text-right rounded-r-lg">Eng.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {cities.slice(0, 12).map((r, i) => (
                <tr key={`${r.city}-${i}`}>
                  <td className="px-3 py-2.5 font-semibold text-foreground">{r.city || '(unknown)'}</td>
                  <td className="px-3 py-2.5 text-foreground/65">
                    {[r.region, r.country].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-primary">{r.sessions}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-foreground/65">{r.activeUsers}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 font-semibold">
                    {(r.engagementRate * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground/50 mb-2">Top countries</p>
          <ul className="space-y-1.5">
            {countries.slice(0, 8).map((r) => {
              const total = countries.reduce((s, x) => s + x.sessions, 0) || 1;
              const pct = (r.sessions / total) * 100;
              return (
                <li key={r.country} className="text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground/75">{r.country || '(unknown)'}</span>
                    <span className="text-foreground/55 tabular-nums">
                      {r.sessions} <span className="text-foreground/35">· {pct.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 bg-warm-bg rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Browser + OS ─────────────────────────────────────────────

function AnalyticsBrowserOs({
  browsers,
  operatingSystems,
}: {
  browsers: NonNullable<AnalyticsPayload['browsers']>;
  operatingSystems: NonNullable<AnalyticsPayload['operatingSystems']>;
}) {
  if (browsers.length === 0 && operatingSystems.length === 0) return null;
  const renderBars = (rows: { name: string; sessions: number }[]) => {
    const total = rows.reduce((s, r) => s + r.sessions, 0) || 1;
    return (
      <ul className="space-y-1.5">
        {rows.slice(0, 5).map((r) => {
          const pct = (r.sessions / total) * 100;
          return (
            <li key={r.name} className="text-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-foreground/75 truncate">{r.name || '(unknown)'}</span>
                <span className="text-foreground/55 tabular-nums">
                  {r.sessions} <span className="text-foreground/35">· {pct.toFixed(0)}%</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 bg-warm-bg rounded-full overflow-hidden">
                <div className="h-full bg-foreground/45 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    );
  };
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <SectionTitle eyebrow="Tech" title="Browser & OS" />
      <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground/50 mb-1.5">Browser</p>
      {renderBars(browsers)}
      <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground/50 mt-3 mb-1.5">Operating system</p>
      {renderBars(operatingSystems)}
    </div>
  );
}

// ─── UTM campaigns ─────────────────────────────────────────────

function AnalyticsCampaigns({
  rows,
}: {
  rows: NonNullable<AnalyticsPayload['campaigns']>;
}) {
  // Filter the noise rows GA always returns.
  const named = rows.filter((r) => r.name && !/^\(not set\)|^\(direct\)$/i.test(r.name));
  if (named.length === 0) return null;
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
      <SectionTitle eyebrow="Campaigns" title="UTM campaigns in play" subtitle="Named campaigns Recovery.com / Rehabpath are pushing toward us." />
      <table className="w-full text-sm">
        <thead className="bg-warm-bg/60 text-left text-[11px] uppercase tracking-wider text-foreground/55">
          <tr>
            <th className="px-3 py-2 rounded-l-lg">Campaign</th>
            <th className="px-3 py-2 text-right">Sessions</th>
            <th className="px-3 py-2 text-right">Users</th>
            <th className="px-3 py-2 text-right rounded-r-lg">Engagement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {named.slice(0, 10).map((r) => (
            <tr key={r.name}>
              <td className="px-3 py-2.5 font-mono text-[12px] text-foreground/85">{r.name}</td>
              <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-primary">{r.sessions}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-foreground/65">{r.activeUsers}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 font-semibold">{(r.engagementRate * 100).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalyticsKpiBand({
  summary,
  previous,
}: {
  summary: AnalyticsSummary;
  previous: AnalyticsSummary | null;
}) {
  const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const fmtSecs = (s: number) => {
    if (!Number.isFinite(s) || s <= 0) return '0s';
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    if (m === 0) return `${sec}s`;
    return `${m}m ${sec}s`;
  };
  const delta = (next: number, prev: number | undefined): { pct: number | null; up: boolean } => {
    if (prev == null || prev === 0) return { pct: null, up: false };
    const change = (next - prev) / prev;
    return { pct: change, up: change >= 0 };
  };
  const tiles: { label: string; value: string; deltaSource?: { next: number; prev?: number }; tone: 'primary' | 'emerald' | 'foreground' | 'red' | 'amber'; hint?: string }[] = [
    { label: 'Sessions', value: summary.sessions.toLocaleString(), deltaSource: { next: summary.sessions, prev: previous?.sessions }, tone: 'primary' },
    { label: 'Active users', value: summary.activeUsers.toLocaleString(), deltaSource: { next: summary.activeUsers, prev: previous?.activeUsers }, tone: 'primary' },
    { label: 'New users', value: summary.newUsers.toLocaleString(), deltaSource: { next: summary.newUsers, prev: previous?.newUsers }, tone: 'foreground' },
    { label: 'Pageviews', value: summary.pageViews.toLocaleString(), deltaSource: { next: summary.pageViews, prev: previous?.pageViews }, tone: 'foreground' },
    { label: 'Avg session', value: fmtSecs(summary.avgSessionDurationSec), deltaSource: { next: summary.avgSessionDurationSec, prev: previous?.avgSessionDurationSec }, tone: 'emerald' },
    { label: 'Pages / session', value: summary.pagesPerSession.toFixed(2), deltaSource: { next: summary.pagesPerSession, prev: previous?.pagesPerSession }, tone: 'emerald' },
    { label: 'Engagement', value: fmtPct(summary.engagementRate), deltaSource: { next: summary.engagementRate, prev: previous?.engagementRate }, tone: 'emerald' },
    { label: 'Bounce rate', value: fmtPct(summary.bounceRate), deltaSource: { next: summary.bounceRate, prev: previous?.bounceRate }, tone: 'red', hint: 'Lower is better' },
  ];
  const toneClass = (t: string) =>
    t === 'primary'
      ? 'text-primary'
      : t === 'emerald'
        ? 'text-emerald-700'
        : t === 'red'
          ? 'text-red-700'
          : t === 'amber'
            ? 'text-amber-700'
            : 'text-foreground';
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
      <SectionTitle
        eyebrow="Website"
        title="Traffic via Recovery.com"
        subtitle="Sessions, users, and engagement attributed to Recovery.com referrals (GA4)."
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {tiles.map((t) => {
          const d = t.deltaSource ? delta(t.deltaSource.next, t.deltaSource.prev) : { pct: null, up: false };
          return (
            <div
              key={t.label}
              className="rounded-xl border border-black/10 bg-warm-bg/40 px-4 py-4 sm:px-5 sm:py-5"
            >
              <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">{t.label}</p>
              <p
                className={`mt-1 text-2xl sm:text-3xl font-bold tabular-nums ${toneClass(t.tone)}`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {t.value}
              </p>
              {d.pct != null ? (
                <p className={`mt-0.5 text-[11px] font-semibold tabular-nums ${d.up ? 'text-emerald-700' : 'text-red-700'}`}>
                  {d.up ? '↑' : '↓'} {Math.abs(d.pct * 100).toFixed(0)}% vs prior
                </p>
              ) : t.hint ? (
                <p className="mt-0.5 text-[11px] text-foreground/45">{t.hint}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsDailyChart({ daily }: { daily: { date: string; sessions: number; activeUsers: number; pageViews: number }[] }) {
  if (daily.length === 0) return null;
  const max = Math.max(1, ...daily.map((d) => d.sessions));
  const W = 900;
  const H = 220;
  const PAD_T = 14;
  const PAD_B = 28;
  const PAD_L = 36;
  const PAD_R = 12;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const slot = innerW / daily.length;
  const barW = Math.max(2, slot * 0.7);
  const tickStep = niceTickStep(max);
  const ticks: number[] = [];
  for (let v = 0; v <= max; v += tickStep) ticks.push(v);
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
      <SectionTitle eyebrow="Daily" title="Sessions over time" subtitle="GA4 sessions per day from Recovery.com referrals." />
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
        {daily.map((d, i) => {
          const x = PAD_L + i * slot + (slot - barW) / 2;
          const totalH = (innerH * d.sessions) / max;
          const totalY = PAD_T + innerH - totalH;
          return (
            <rect
              key={d.date}
              x={x}
              y={totalY}
              width={barW}
              height={Math.max(0, totalH)}
              rx={2}
              fill="rgba(59,130,246,0.6)"
            />
          );
        })}
        {daily
          .filter((_, i) => i % Math.ceil(daily.length / 8) === 0 || i === daily.length - 1)
          .map((d) => {
            const idx = daily.indexOf(d);
            const x = PAD_L + idx * slot + slot / 2;
            const date = new Date(d.date + 'T00:00:00');
            return (
              <text key={d.date} x={x} y={H - 8} fontSize="10" textAnchor="middle" fill="rgba(0,0,0,0.5)">
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            );
          })}
      </svg>
    </div>
  );
}

function AnalyticsLandingPages({ rows }: { rows: AnalyticsPayload['landing'] }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm">
      <SectionTitle eyebrow="Pages" title="Top landing pages" subtitle="Where Recovery.com traffic enters the site, ranked by sessions." />
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead className="bg-warm-bg/60 text-left text-[11px] uppercase tracking-wider text-foreground/55">
            <tr>
              <th className="px-3 py-2 rounded-l-lg">Path</th>
              <th className="px-3 py-2 text-right">Sessions</th>
              <th className="px-3 py-2 text-right">Users</th>
              <th className="px-3 py-2 text-right">Avg session</th>
              <th className="px-3 py-2 text-right">Engagement</th>
              <th className="px-3 py-2 text-right rounded-r-lg">Bounce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((r) => (
              <tr key={r.path}>
                <td className="px-3 py-2.5 font-mono text-[12px] text-foreground/80 truncate max-w-[360px]">
                  {r.path || '/'}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-primary">{r.sessions}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-foreground/65">{r.activeUsers}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-foreground/65">{fmtSecs(r.avgSessionDurationSec)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 font-semibold">
                  {(r.engagementRate * 100).toFixed(0)}%
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-foreground/65">
                  {(r.bounceRate * 100).toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalyticsDevices({ rows }: { rows: AnalyticsPayload['devices'] }) {
  if (!rows || rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + r.sessions, 0) || 1;
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <SectionTitle eyebrow="Device" title="Where they're browsing" />
      <ul className="space-y-2">
        {rows.map((r) => {
          const pct = (r.sessions / total) * 100;
          return (
            <li key={r.device} className="text-[12px]">
              <div className="flex items-center justify-between">
                <span className="capitalize text-foreground/75">{r.device || 'unknown'}</span>
                <span className="text-foreground/55 tabular-nums">
                  {r.sessions} <span className="text-foreground/35">· {pct.toFixed(0)}%</span>
                </span>
              </div>
              <div className="mt-1 h-2 bg-warm-bg rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AnalyticsEvents({ rows }: { rows: AnalyticsPayload['events'] }) {
  if (!rows || rows.length === 0) return null;
  // GA4 ships ambient events (page_view, session_start, etc.) that
  // aren't actionable for a marketing report. Filter to the events
  // most useful for an admissions team — conversions + interactions.
  const interesting = rows
    .filter((r) =>
      /click|submit|conversion|call|book|tour|verify|chat|signup|contact|cta|begin|purchase|download/i.test(
        r.name,
      ),
    )
    .slice(0, 10);
  const display = interesting.length > 0 ? interesting : rows.slice(0, 10);
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <SectionTitle eyebrow="Activity" title="Top events" />
      <ul className="space-y-1.5">
        {display.map((r) => (
          <li key={r.name} className="text-[12px] flex items-center justify-between">
            <span className="font-mono text-[11px] text-foreground/75 truncate">{r.name}</span>
            <span className="tabular-nums text-foreground/55">
              {r.count.toLocaleString()}
              <span className="text-foreground/35"> · {r.users.toLocaleString()} users</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function fmtSecs(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return '0s';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  if (m === 0) return `${sec}s`;
  return `${m}m ${sec}s`;
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
