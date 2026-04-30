'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import type { PsiSnapshot } from '@/lib/seo/psi';

// Snapshot row shape returned by /api/seo/speed/latest. Mirrors the
// public.seo_speed_runs columns with `opportunities` already parsed
// from jsonb.
export interface SpeedSnapshotRow {
  id: string;
  ran_at: string;
  url: string;
  strategy: 'mobile' | 'desktop';
  performance: number | null;
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  si: number | null;
  opportunities: Array<{ id: string; title: string; savingsMs: number }>;
  fetch_ms: number | null;
  ok: boolean;
  error: string | null;
}

// Lighthouse performance-score thresholds. Mirrors the Google bands:
// 0-49 poor, 50-89 needs improvement, 90+ good. Anything else (null /
// failed) renders as a neutral dash.
function scoreTone(score: number | null): 'good' | 'ni' | 'poor' | 'unknown' {
  if (score == null) return 'unknown';
  if (score >= 90) return 'good';
  if (score >= 50) return 'ni';
  return 'poor';
}

const SCORE_TONE_CLASS: Record<'good' | 'ni' | 'poor' | 'unknown', string> = {
  good: 'border-emerald-700 bg-emerald-950 text-emerald-200',
  ni: 'border-amber-700 bg-amber-950 text-amber-200',
  poor: 'border-red-800 bg-red-950 text-red-200',
  unknown: 'border-neutral-800 bg-neutral-900 text-neutral-500',
};

// Core Web Vitals + lab-metric thresholds (lab-mode, mobile-first —
// these are Google's published "good / needs improvement / poor"
// boundaries from web.dev). Lower is better for every metric here.
const METRIC_THRESHOLDS: Record<MetricKey, { good: number; ni: number; unit: 'ms' | 'cls' }> = {
  lcp: { good: 2500, ni: 4000, unit: 'ms' },
  cls: { good: 0.1, ni: 0.25, unit: 'cls' },
  tbt: { good: 200, ni: 600, unit: 'ms' },
  fcp: { good: 1800, ni: 3000, unit: 'ms' },
  si: { good: 3400, ni: 5800, unit: 'ms' },
};

type MetricKey = 'lcp' | 'cls' | 'tbt' | 'fcp' | 'si';

const METRIC_LABEL: Record<MetricKey, string> = {
  lcp: 'LCP',
  cls: 'CLS',
  tbt: 'TBT',
  fcp: 'FCP',
  si: 'SI',
};

function metricTone(key: MetricKey, value: number | null): 'good' | 'ni' | 'poor' | 'unknown' {
  if (value == null) return 'unknown';
  const t = METRIC_THRESHOLDS[key];
  if (value <= t.good) return 'good';
  if (value <= t.ni) return 'ni';
  return 'poor';
}

const METRIC_TONE_CLASS: Record<'good' | 'ni' | 'poor' | 'unknown', string> = {
  good: 'border-emerald-900/60 bg-emerald-950/40 text-emerald-200',
  ni: 'border-amber-900/60 bg-amber-950/40 text-amber-200',
  poor: 'border-red-900/60 bg-red-950/40 text-red-200',
  unknown: 'border-neutral-900 bg-neutral-950 text-neutral-500',
};

function formatMetric(key: MetricKey, value: number | null): string {
  if (value == null) return '—';
  const unit = METRIC_THRESHOLDS[key].unit;
  if (unit === 'cls') return value.toFixed(3);
  // ms — show seconds for anything >= 1s, ms otherwise
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}ms`;
}

function MetricTile({ metric, value }: { metric: MetricKey; value: number | null }) {
  const tone = metricTone(metric, value);
  return (
    <div
      className={`rounded-md border px-2 py-1.5 text-center ${METRIC_TONE_CLASS[tone]}`}
      title={`${METRIC_LABEL[metric]} — good ≤ ${METRIC_THRESHOLDS[metric].good}${METRIC_THRESHOLDS[metric].unit === 'cls' ? '' : 'ms'}, poor > ${METRIC_THRESHOLDS[metric].ni}${METRIC_THRESHOLDS[metric].unit === 'cls' ? '' : 'ms'}`}
    >
      <div className="text-[10px] uppercase tracking-wide opacity-70">{METRIC_LABEL[metric]}</div>
      <div className="font-mono text-xs tabular-nums">{formatMetric(metric, value)}</div>
    </div>
  );
}

// Tiny sparkline. Takes a series of (x: index, y: number|null) and
// renders a polyline scaled to fit a 100x24 viewBox. Null gaps are
// dropped (the line jumps over them); a single-point series renders
// a dot. Tone follows the latest non-null value so the chart matches
// the badge next to it. Pure SVG, no chart library.
function Sparkline({
  values,
  tone = 'good',
  width = 96,
  height = 24,
}: {
  values: Array<number | null>;
  tone?: 'good' | 'ni' | 'poor' | 'unknown';
  width?: number;
  height?: number;
}) {
  const points: Array<{ x: number; y: number }> = [];
  const valid: number[] = [];
  for (const v of values) if (v != null) valid.push(v);
  if (valid.length === 0) {
    return (
      <div className="text-[10px] text-neutral-600" style={{ width, height }}>
        no history
      </div>
    );
  }
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const span = Math.max(1, max - min);
  const padX = 2;
  const padY = 2;
  values.forEach((v, i) => {
    if (v == null) return;
    const x = padX + (values.length === 1 ? (width - padX * 2) / 2 : (i / (values.length - 1)) * (width - padX * 2));
    const y = padY + (1 - (v - min) / span) * (height - padY * 2);
    points.push({ x, y });
  });
  const stroke =
    tone === 'good' ? '#34d399' : tone === 'ni' ? '#fbbf24' : tone === 'poor' ? '#f87171' : '#6b7280';
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {points.length === 1 ? (
        <circle cx={points[0].x} cy={points[0].y} r={2} fill={stroke} />
      ) : (
        <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function StrategyPanel({ snap, strategy }: { snap: SpeedSnapshotRow | null; strategy: 'mobile' | 'desktop' }) {
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-900/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-neutral-500">{strategy}</span>
        <ScoreBadge score={snap?.performance ?? null} />
      </div>
      {snap ? (
        <>
          <MetricRow snap={snap} />
          <div className="text-[10px] text-neutral-600">
            {snap.ok ? new Date(snap.ran_at).toLocaleString() : (snap.error ?? 'failed')}
          </div>
        </>
      ) : (
        <div className="py-3 text-center text-[11px] text-neutral-600">Not yet scored</div>
      )}
    </div>
  );
}

function MetricRow({ snap }: { snap: SpeedSnapshotRow }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      <MetricTile metric="lcp" value={snap.lcp} />
      <MetricTile metric="cls" value={snap.cls} />
      <MetricTile metric="tbt" value={snap.tbt} />
      <MetricTile metric="fcp" value={snap.fcp} />
      <MetricTile metric="si" value={snap.si} />
    </div>
  );
}

function ScoreBadge({ score, label }: { score: number | null; label?: string }) {
  const tone = scoreTone(score);
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium ${SCORE_TONE_CLASS[tone]}`}
      title={label ? `${label} performance` : 'Performance score'}
    >
      <span className="font-mono text-sm tabular-nums">
        {score == null ? '—' : score}
      </span>
      {label && <span className="uppercase tracking-wide text-[10px] opacity-80">{label}</span>}
    </div>
  );
}

// LocalStorage key for the admin's URL list. Keyed under `seo.speed`
// so it doesn't collide with anything else stored by the app.
const URLS_LS_KEY = 'seo.speed.urls.v1';

// Default URLs to score on first load — homepage + the two highest-
// intent landing pages. The admin can edit this list freely; their
// edits persist in localStorage on this device only (no server sync,
// since URL preference is per-admin-per-machine).
const DEFAULT_URLS: string[] = [
  'https://7thanchor.com/',
  'https://7thanchor.com/admissions',
  'https://7thanchor.com/programs',
];

// Merge fresh snapshots into the existing list, replacing any prior
// row for the same (url, strategy) and keeping everything else. This
// lets a partial run (one URL re-scored) update only its tile without
// blowing away other URLs' results.
function mergeSnapshots(prev: SpeedSnapshotRow[], fresh: SpeedSnapshotRow[]): SpeedSnapshotRow[] {
  const keyed = new Map<string, SpeedSnapshotRow>();
  for (const s of prev) keyed.set(`${s.url}|${s.strategy}`, s);
  for (const s of fresh) keyed.set(`${s.url}|${s.strategy}`, s);
  return Array.from(keyed.values());
}

function parseUrlList(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      const normalized = parsed.toString();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      out.push(normalized);
    } catch {
      // skip invalid lines silently — the textarea shows what the user typed
    }
  }
  return out;
}

export default function SpeedContent() {
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [urls, setUrls] = useState<string[]>(DEFAULT_URLS);
  // Raw textarea value — kept separate so the admin can type freely
  // (including invalid lines mid-edit) without losing what they typed.
  const [urlsDraft, setUrlsDraft] = useState<string>(DEFAULT_URLS.join('\n'));
  const [snapshots, setSnapshots] = useState<SpeedSnapshotRow[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate URL list from localStorage on mount. Defaults stay if the
  // key is missing or unparseable.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(URLS_LS_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter(
        (u): u is string => typeof u === 'string' && /^https?:\/\//.test(u),
      );
      if (valid.length > 0) {
        setUrls(valid);
        setUrlsDraft(valid.join('\n'));
      }
    } catch {
      // ignore — we'll just use defaults
    }
  }, []);

  // Persist parsed URL list whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(URLS_LS_KEY, JSON.stringify(urls));
    } catch {
      // out of quota / private mode — non-fatal
    }
  }, [urls]);

  // Hydrate snapshots from the most-recent persisted runs so admins
  // see prior results without re-running PSI (each call is 10-25s,
  // and there's no point re-paying that cost on every page mount).
  // Re-runs are explicit via the Run All button.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/seo/speed/latest', { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as {
          snapshots?: SpeedSnapshotRow[];
          error?: string;
        };
        if (cancelled) return;
        if (Array.isArray(json.snapshots)) {
          setSnapshots(json.snapshots);
        }
      } catch {
        // network issue — leave snapshots empty; the empty-state copy
        // tells the admin to hit Run All
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  function commitDraft() {
    const next = parseUrlList(urlsDraft);
    if (next.length === 0) return;
    setUrls(next);
    setUrlsDraft(next.join('\n'));
  }

  function resetUrls() {
    setUrls(DEFAULT_URLS);
    setUrlsDraft(DEFAULT_URLS.join('\n'));
  }

  // Run All — POSTs to /api/seo/speed/run which scores every URL on
  // mobile + desktop in parallel. Each PSI call is 10-25s and we run
  // 2N in parallel, so a 3-URL run takes roughly the slowest single
  // call (~25s). The route persists every snapshot before responding.
  async function runAll() {
    if (running || urls.length === 0) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/speed/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        snapshots?: PsiSnapshot[];
        error?: string;
        persisted?: boolean;
        persistError?: string | null;
      };
      if (!res.ok) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      if (json.persisted === false) {
        // The PSI calls succeeded but the DB write didn't — surface
        // the issue so the admin knows the timeline won't update.
        setError(`Saved-to-DB failed: ${json.persistError ?? 'unknown'}`);
      }
      // Map the raw PsiSnapshot[] returned by /run into the row shape
      // the UI consumes. Server `id` / `ran_at` aren't echoed back, so
      // we fabricate placeholders; the next /latest hydrate (phase 13)
      // will replace them with the real persisted rows.
      const fresh: SpeedSnapshotRow[] = (json.snapshots ?? []).map((s, i) => ({
        id: `local-${Date.now()}-${i}`,
        ran_at: s.fetchedAt,
        url: s.url,
        strategy: s.strategy,
        performance: s.performance,
        fcp: s.metrics.fcp,
        lcp: s.metrics.lcp,
        cls: s.metrics.cls,
        tbt: s.metrics.tbt,
        si: s.metrics.si,
        opportunities: s.opportunities,
        fetch_ms: s.fetchMs,
        ok: s.ok,
        error: s.error,
      }));
      setSnapshots((prev) => mergeSnapshots(prev, fresh));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setRunning(false);
    }
  }

  // Suppress "unused" noise until later phases consume these.
  useEffect(() => {
    void snapshots;
  }, [snapshots]);

  const draftDirty = useMemo(
    () => urlsDraft.trim() !== urls.join('\n').trim(),
    [urlsDraft, urls],
  );

  // Group snapshots by URL with named slots for each strategy. Seeded
  // with the editable URL list so cards appear for URLs that haven't
  // been scored yet (empty state per card encourages a Run All).
  const groupedByUrl = useMemo(() => {
    type Slot = { mobile: SpeedSnapshotRow | null; desktop: SpeedSnapshotRow | null };
    const m = new Map<string, Slot>();
    for (const u of urls) m.set(u, { mobile: null, desktop: null });
    for (const s of snapshots) {
      const slot = m.get(s.url) ?? { mobile: null, desktop: null };
      slot[s.strategy] = s;
      m.set(s.url, slot);
    }
    return Array.from(m.entries()).map(([url, slot]) => ({ url, ...slot }));
  }, [snapshots, urls]);

  if (authLoading) return null;
  if (!user || !isAdmin) {
    return (
      <div className="px-6 py-10 text-sm text-neutral-400">
        Speed is admin-only.
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-neutral-50">Speed</h1>
        <p className="text-sm text-neutral-400">
          Core Web Vitals via PageSpeed Insights. Run All scores every URL on
          mobile and desktop, then keeps the timeline.
        </p>
      </header>

      <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-200">URLs to score</h2>
          <span className="text-xs text-neutral-500">{urls.length} URL{urls.length === 1 ? '' : 's'}</span>
        </div>
        <textarea
          value={urlsDraft}
          onChange={(e) => setUrlsDraft(e.target.value)}
          onBlur={commitDraft}
          spellCheck={false}
          rows={Math.max(3, Math.min(10, urlsDraft.split('\n').length + 1))}
          placeholder="https://example.com/&#10;https://example.com/about"
          className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-100 outline-none focus:border-neutral-600"
        />
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>One URL per line. http(s) only. Saved per device.</span>
          <div className="flex gap-2">
            {draftDirty && (
              <button
                type="button"
                onClick={commitDraft}
                className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-200 hover:border-neutral-500"
              >
                Save
              </button>
            )}
            <button
              type="button"
              onClick={resetUrls}
              className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void runAll()}
          disabled={running || urls.length === 0}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? `Running ${urls.length * 2} PSI checks…` : `Run All (×${urls.length * 2})`}
        </button>
        <span className="text-xs text-neutral-500">
          Mobile + desktop per URL. Each PSI call takes 10-25s; runs in parallel.
        </span>
      </section>

      {error && (
        <div className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {!hydrated ? (
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-sm text-neutral-500">
          Loading prior runs…
        </div>
      ) : urls.length === 0 ? (
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-sm text-neutral-500">
          Add at least one URL above to start scoring.
        </div>
      ) : (
        <ul className="space-y-3">
          {groupedByUrl.map((row) => (
            <li
              key={row.url}
              className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 space-y-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-neutral-100">{row.url}</div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <StrategyPanel snap={row.mobile} strategy="mobile" />
                <StrategyPanel snap={row.desktop} strategy="desktop" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type { PsiSnapshot };
