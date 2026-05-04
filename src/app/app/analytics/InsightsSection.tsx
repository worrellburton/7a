'use client';

import { useEffect, useState } from 'react';
import GoogleReconnectBanner from './GoogleReconnectBanner';
import { type DateRange, toApiDate } from './shared';

interface FindingBreakdown {
  source: string;
  metric: string;
  currentValue: number;
  currentDisplay: string;
  previousValue?: number;
  previousDisplay?: string;
  currentRange?: { startDate: string; endDate: string };
  previousRange?: { startDate: string; endDate: string };
  formula?: string;
  threshold?: string;
  notes?: string[];
}

interface Finding {
  kind: 'working' | 'needs';
  category: 'traffic' | 'seo' | 'engagement' | 'conversion' | 'content';
  headline: string;
  detail: string;
  delta?: number;
  action?: string;
  breakdown?: FindingBreakdown;
}

interface InsightsResponse {
  findings: Finding[];
  range: { startDate: string; endDate: string; previousStart: string; previousEnd: string };
  fetched_at: string;
}

interface Props {
  range: DateRange;
  /** When embedded at the bottom of Overview, render a compact variant. */
  compact?: boolean;
}

export function InsightsSection({ range, compact = false }: Props) {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const queryKey = `${toApiDate(range.start)}_${toApiDate(range.end)}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/google/insights?startDate=${toApiDate(range.start)}&endDate=${toApiDate(range.end)}`,
      { cache: 'no-store' }
    )
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(json?.error ?? `HTTP ${r.status}`);
          setData(null);
        } else {
          setData(json as InsightsResponse);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryKey]);

  if (error && !compact) {
    return (
      <GoogleReconnectBanner label="insights" error={error} />
    );
  }
  if (error) return null;

  const working = (data?.findings ?? []).filter((f) => f.kind === 'working');
  const needs = (data?.findings ?? []).filter((f) => f.kind === 'needs');

  return (
    <div className={compact ? 'mt-6' : 'space-y-6'}>
      {!compact ? (
        <div className="rounded-2xl border border-black/5 bg-white p-5">
          <h2 className="text-base font-bold text-foreground">Insights</h2>
          <p className="text-[12px] text-foreground/60 mt-1">
            Auto-computed from GA4 + Search Console comparing this range against the previous period
            ({data?.range.previousStart} → {data?.range.previousEnd}). Findings with a clear action
            get priority.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FindingsPanel
          title="What's working"
          tone="working"
          findings={working}
          loading={loading}
          emptyText="No meaningful improvements detected this range — try widening the window."
        />
        <FindingsPanel
          title="What needs improvement"
          tone="needs"
          findings={needs}
          loading={loading}
          emptyText="Nothing urgent — smooth waters."
        />
      </div>
    </div>
  );
}

function FindingsPanel({
  title,
  tone,
  findings,
  loading,
  emptyText,
}: {
  title: string;
  tone: 'working' | 'needs';
  findings: Finding[];
  loading: boolean;
  emptyText: string;
}) {
  const bg = tone === 'working' ? 'bg-emerald-50/40' : 'bg-rose-50/40';
  const border = tone === 'working' ? 'border-emerald-100' : 'border-rose-100';
  const accent = tone === 'working' ? 'text-emerald-700' : 'text-rose-700';
  const glyph = tone === 'working' ? '✓' : '!';
  const glyphBg = tone === 'working' ? 'bg-emerald-500' : 'bg-rose-500';

  return (
    <div className={`rounded-2xl border ${border} ${bg} p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${glyphBg} text-white text-xs font-bold`}>
          {glyph}
        </span>
        <h3 className={`text-base font-bold ${accent}`}>{title}</h3>
        <span className="text-foreground/40 text-xs ml-1">({findings.length})</span>
      </div>
      {findings.length ? (
        <ul className="space-y-3">
          {findings.slice(0, 8).map((f, i) => (
            <FindingCard key={i} f={f} tone={tone} />
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-foreground/60 italic py-4">
          {loading ? 'Computing…' : emptyText}
        </p>
      )}
    </div>
  );
}

function FindingCard({ f, tone }: { f: Finding; tone: 'working' | 'needs' }) {
  const [open, setOpen] = useState(false);
  const hasBreakdown = !!f.breakdown;
  return (
    <li className="rounded-xl bg-white/80 border border-white p-3.5">
      <div className="flex items-start gap-3">
        <CategoryBadge category={f.category} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{f.headline}</p>
          <p className="text-[12px] text-foreground/60 mt-1">{f.detail}</p>
          {f.action ? (
            <p className="text-[12px] text-foreground/80 mt-2 italic">→ {f.action}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {f.delta !== undefined ? (
            <span
              className={`text-[10px] font-bold whitespace-nowrap ${
                (tone === 'working' ? f.delta > 0 : f.delta < 0) ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {f.delta > 0 ? '+' : ''}{(f.delta * 100).toFixed(0)}%
            </span>
          ) : null}
          {hasBreakdown ? (
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? 'Hide computation details' : 'Show computation details'}
              title="How we got here"
              onClick={() => setOpen((v) => !v)}
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full border text-[10px] font-bold transition-colors ${
                open
                  ? 'border-foreground/40 bg-foreground/10 text-foreground'
                  : 'border-foreground/20 text-foreground/50 hover:border-foreground/40 hover:text-foreground'
              }`}
            >
              i
            </button>
          ) : null}
        </div>
      </div>
      {open && f.breakdown ? <BreakdownPanel b={f.breakdown} /> : null}
    </li>
  );
}

function BreakdownPanel({ b }: { b: FindingBreakdown }) {
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-baseline gap-3 py-1">
      <span className="text-[10px] uppercase tracking-wider text-foreground/45 font-semibold w-24 shrink-0">{label}</span>
      <span className="text-[12px] text-foreground/85 break-words">{value}</span>
    </div>
  );
  const fmtRange = (r?: { startDate: string; endDate: string }) =>
    r ? `${r.startDate} → ${r.endDate}` : '—';
  return (
    <div className="mt-3 rounded-lg border border-foreground/10 bg-warm-bg/40 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/55 mb-1">
        How we got here
      </p>
      <Row label="Source" value={b.source} />
      <Row label="Metric" value={b.metric} />
      <Row
        label="This period"
        value={
          <>
            <span className="font-mono">{b.currentDisplay}</span>
            {b.currentRange ? (
              <span className="text-foreground/50"> · {fmtRange(b.currentRange)}</span>
            ) : null}
          </>
        }
      />
      {b.previousDisplay !== undefined ? (
        <Row
          label="Previous"
          value={
            <>
              <span className="font-mono">{b.previousDisplay}</span>
              {b.previousRange ? (
                <span className="text-foreground/50"> · {fmtRange(b.previousRange)}</span>
              ) : null}
            </>
          }
        />
      ) : null}
      {b.formula ? <Row label="Formula" value={<span className="font-mono">{b.formula}</span>} /> : null}
      {b.threshold ? <Row label="Threshold" value={b.threshold} /> : null}
      {b.notes && b.notes.length ? (
        <div className="flex items-baseline gap-3 py-1">
          <span className="text-[10px] uppercase tracking-wider text-foreground/45 font-semibold w-24 shrink-0">Notes</span>
          <ul className="text-[12px] text-foreground/75 space-y-0.5 list-disc pl-4">
            {b.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function CategoryBadge({ category }: { category: Finding['category'] }) {
  const labels: Record<Finding['category'], string> = {
    traffic: 'Traffic',
    seo: 'SEO',
    engagement: 'Engage',
    conversion: 'Convert',
    content: 'Content',
  };
  return (
    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-warm-bg text-[10px] font-semibold uppercase tracking-wider text-foreground/60 whitespace-nowrap">
      {labels[category]}
    </span>
  );
}
