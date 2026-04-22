'use client';

import { useEffect, useState } from 'react';
import { type DateRange, toApiDate } from './shared';

interface Finding {
  kind: 'working' | 'needs';
  category: 'traffic' | 'seo' | 'engagement' | 'conversion' | 'content';
  headline: string;
  detail: string;
  delta?: number;
  action?: string;
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
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <strong>Couldn&apos;t load insights:</strong> {error}
      </div>
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
            <li key={i} className="rounded-xl bg-white/80 border border-white p-3.5">
              <div className="flex items-start gap-3">
                <CategoryBadge category={f.category} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{f.headline}</p>
                  <p className="text-[12px] text-foreground/60 mt-1">{f.detail}</p>
                  {f.action ? (
                    <p className="text-[12px] text-foreground/80 mt-2 italic">→ {f.action}</p>
                  ) : null}
                </div>
                {f.delta !== undefined ? (
                  <span
                    className={`text-[10px] font-bold whitespace-nowrap ${
                      (tone === 'working' ? f.delta > 0 : f.delta < 0) ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {f.delta > 0 ? '+' : ''}{(f.delta * 100).toFixed(0)}%
                  </span>
                ) : null}
              </div>
            </li>
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
