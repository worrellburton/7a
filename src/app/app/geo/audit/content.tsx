'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  CATEGORY_LABELS,
  DEFAULT_PROMPTS,
  type PromptCategory,
} from '@/lib/geo/prompts';

const STORAGE_KEY = 'sa-geo-audit:last-result';
const DURATION_KEY = 'sa-geo-audit:last-duration-ms';
// 32 prompts × 4 engines @ concurrency 10 with Claude's ~15s p50 lands
// around 200s for a fresh run. Anything configured locally (fewer
// engines, fewer prompts) will beat this; the estimator also persists
// the last actual run.
const DEFAULT_DURATION_MS = 180_000;

const STAGES: { label: string; atFraction: number }[] = [
  { label: 'Querying ChatGPT (OpenAI)…', atFraction: 0.02 },
  { label: 'Querying Perplexity…', atFraction: 0.2 },
  { label: 'Querying Claude web search…', atFraction: 0.35 },
  { label: 'Querying Google AI Overviews…', atFraction: 0.65 },
  { label: 'Detecting mentions…', atFraction: 0.88 },
  { label: 'Finalizing…', atFraction: 0.97 },
];

type EngineId = 'openai' | 'perplexity' | 'claude' | 'google_aio';
const ENGINE_LABELS: Record<EngineId, string> = {
  openai: 'ChatGPT',
  perplexity: 'Perplexity',
  claude: 'Claude',
  google_aio: 'Google AI Overview',
};

interface MentionResult {
  engine: EngineId;
  promptId: string;
  prompt: string;
  ok: boolean;
  answered: boolean;
  brandMentioned: boolean;
  brandMentionCount: number;
  brandCited: boolean;
  brandCitationPosition: number | null;
  totalCitations: number;
  competitorsMentioned: string[];
  competitorsCited: string[];
  answer: string;
  citations: { url: string; title: string | null; position: number }[];
  warnings: string[];
  error: string | null;
}

interface AuditResponse {
  ranAt: string;
  durationMs: number;
  prompts: {
    id: string;
    text: string;
    category: PromptCategory;
    priority: 1 | 2 | 3;
  }[];
  engines: EngineId[];
  skippedEngines: { engine: EngineId; reason: string }[];
  results: MentionResult[];
  summary: {
    total: number;
    ok: number;
    answered: number;
    brandMentioned: number;
    brandCited: number;
  };
  notice?: string;
}

export default function AuditContent() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string>('');
  const [estimatedMs, setEstimatedMs] = useState<number>(DEFAULT_DURATION_MS);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setResult(JSON.parse(raw) as AuditResponse);
    } catch {
      // stale / corrupt — ignore
    }
    const stored = Number(window.localStorage.getItem(DURATION_KEY));
    if (Number.isFinite(stored) && stored > 5_000 && stored < 600_000) {
      setEstimatedMs(stored);
    }
  }, []);

  useEffect(
    () => () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    },
    [],
  );

  function startTicker(totalMs: number) {
    if (tickerRef.current) clearInterval(tickerRef.current);
    const startedAt = Date.now();
    setProgress(0);
    setStage(STAGES[0]?.label ?? 'Starting…');
    tickerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const raw = Math.min(0.95, elapsed / totalMs);
      const eased = 1 - Math.pow(1 - raw, 1.5);
      setProgress(Number(eased.toFixed(3)));
      let label = STAGES[0]?.label ?? '';
      for (const s of STAGES) {
        if (eased >= s.atFraction) label = s.label;
      }
      setStage(label);
    }, 500);
  }

  function stopTicker(final = 1) {
    if (tickerRef.current) clearInterval(tickerRef.current);
    tickerRef.current = null;
    setProgress(final);
  }

  async function runAudit() {
    setRunning(true);
    setError(null);
    startTicker(estimatedMs);
    const startedAt = Date.now();
    try {
      const res = await fetch('/api/geo/audit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      const audit = json as AuditResponse;
      setResult(audit);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(audit));
        const actual = Date.now() - startedAt;
        window.localStorage.setItem(DURATION_KEY, String(actual));
        setEstimatedMs(actual);
      } catch {
        // quota — non-fatal
      }
      setStage('Done');
      stopTicker(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      stopTicker(0);
      setStage('');
    } finally {
      setRunning(false);
    }
  }

  const grouped = DEFAULT_PROMPTS.reduce<Record<PromptCategory, typeof DEFAULT_PROMPTS>>(
    (acc, p) => {
      acc[p.category] ??= [];
      acc[p.category].push(p);
      return acc;
    },
    {
      location_intent: [],
      modality: [],
      insurance: [],
      substance: [],
      brand: [],
      decision: [],
    },
  );

  // Results index for the prompts view: prompt.id -> engine -> result.
  const byPrompt = new Map<string, Map<EngineId, MentionResult>>();
  for (const r of result?.results ?? []) {
    let inner = byPrompt.get(r.promptId);
    if (!inner) {
      inner = new Map();
      byPrompt.set(r.promptId, inner);
    }
    inner.set(r.engine, r);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-2">
          Marketing &amp; Admissions
        </p>
        <Link
          href="/app/geo"
          className="text-xs text-foreground/50 hover:text-foreground transition"
        >
          ← GEO
        </Link>
        <h1 className="text-2xl font-bold text-foreground mt-1">GEO audit</h1>
        <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
          Runs a curated set of admissions-funnel prompts against ChatGPT,
          Perplexity, Claude, and Google AI Overviews, then scores how often
          Seven Arrows is mentioned and cited.
        </p>
      </div>

      <ScoreCard
        summary={result?.summary ?? null}
        running={running}
        onRun={runAudit}
        ranAt={result?.ranAt ?? null}
        durationMs={result?.durationMs ?? null}
        progress={progress}
        stage={stage}
        estimatedMs={estimatedMs}
      />

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Audit failed:</strong> {error}
        </div>
      ) : null}

      {result?.skippedEngines && result.skippedEngines.length > 0 ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Engines skipped:</strong>{' '}
          {result.skippedEngines
            .map((s) => `${ENGINE_LABELS[s.engine]} (${s.reason})`)
            .join(', ')}
          . Set the missing keys in Vercel env to include them next run.
        </div>
      ) : null}

      {result?.notice ? (
        <div className="mt-6 rounded-xl border border-black/10 bg-warm-bg/40 p-4 text-xs text-foreground/60">
          {result.notice}
        </div>
      ) : null}

      {result?.engines && result.engines.length > 0 ? (
        <Panel title="Engine coverage" className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {result.engines.map((e) => {
              const engineResults = result.results.filter((r) => r.engine === e);
              const mentioned = engineResults.filter((r) => r.brandMentioned).length;
              const cited = engineResults.filter((r) => r.brandCited).length;
              const total = engineResults.length;
              const mentionRate = total === 0 ? 0 : mentioned / total;
              const citeRate = total === 0 ? 0 : cited / total;
              return (
                <div
                  key={e}
                  className="rounded-xl border border-black/5 bg-white p-4"
                >
                  <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50 mb-2">
                    {ENGINE_LABELS[e]}
                  </p>
                  <p className="text-xs text-foreground/60">
                    Mentioned:{' '}
                    <span className="font-semibold text-foreground">
                      {mentioned}/{total}
                    </span>{' '}
                    <span className="text-foreground/50">
                      ({Math.round(mentionRate * 100)}%)
                    </span>
                  </p>
                  <p className="text-xs text-foreground/60">
                    Cited:{' '}
                    <span className="font-semibold text-foreground">
                      {cited}/{total}
                    </span>{' '}
                    <span className="text-foreground/50">
                      ({Math.round(citeRate * 100)}%)
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </Panel>
      ) : null}

      <Panel title="Tracked prompts" className="mt-6">
        {!result?.results?.length ? (
          <p className="text-xs text-foreground/60 mb-4">
            {DEFAULT_PROMPTS.length} prompts across{' '}
            {Object.keys(grouped).length} categories. Run the audit to see
            per-engine results next to each.
          </p>
        ) : null}
        <div className="space-y-4">
          {(Object.keys(grouped) as PromptCategory[]).map((cat) => (
            <div key={cat}>
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-foreground/50 mb-2">
                {CATEGORY_LABELS[cat]} · {grouped[cat].length}
              </p>
              <ul className="space-y-1">
                {grouped[cat].map((p) => {
                  const engineResults = byPrompt.get(p.id);
                  return (
                    <li
                      key={p.id}
                      className="border-b border-black/5 pb-1.5 last:border-b-0"
                    >
                      <div className="flex items-start gap-2 text-xs">
                        <span
                          className={`inline-block w-5 text-center font-bold rounded ${
                            p.priority === 1
                              ? 'bg-red-50 text-red-700'
                              : p.priority === 2
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-black/5 text-foreground/50'
                          }`}
                          title={`priority ${p.priority}`}
                        >
                          {p.priority}
                        </span>
                        <span className="flex-1 text-foreground/80">{p.text}</span>
                      </div>
                      {engineResults ? (
                        <div className="flex flex-wrap gap-1.5 mt-1 ml-7">
                          {(result!.engines).map((e) => {
                            const r = engineResults.get(e);
                            return (
                              <EngineChip
                                key={e}
                                engine={e}
                                result={r}
                              />
                            );
                          })}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <Panel title="What's working">
          <Empty>Run an audit to see which engines cite us today.</Empty>
        </Panel>
        <Panel title="What's not">
          <Empty>
            Run an audit to see where competitors win or we're invisible.
          </Empty>
        </Panel>
      </div>

      <Panel title="Generate Claude prompt" className="mt-6">
        <Empty>
          After an audit completes, this section will produce a copy-pasteable
          prompt you can drop into Claude to improve AI-answer visibility.
          (Ships in phase 12.)
        </Empty>
      </Panel>
    </div>
  );
}

function EngineChip({
  engine,
  result,
}: {
  engine: EngineId;
  result: MentionResult | undefined;
}) {
  if (!result) {
    return (
      <span className="inline-flex items-center rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold text-foreground/50">
        {ENGINE_LABELS[engine]}: —
      </span>
    );
  }
  if (result.error) {
    return (
      <span
        title={result.error}
        className="inline-flex items-center rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700"
      >
        {ENGINE_LABELS[engine]}: err
      </span>
    );
  }
  if (result.brandCited) {
    const pos =
      result.brandCitationPosition != null
        ? ` #${result.brandCitationPosition + 1}`
        : '';
    return (
      <span
        className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"
        title={`Cited${pos}${result.brandMentioned ? ' + mentioned' : ''}`}
      >
        {ENGINE_LABELS[engine]}: cited{pos}
      </span>
    );
  }
  if (result.brandMentioned) {
    return (
      <span
        className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
        title="Mentioned in answer text but not cited as a source"
      >
        {ENGINE_LABELS[engine]}: mention
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold text-foreground/50"
      title={
        result.competitorsCited.length
          ? `Competitors cited: ${result.competitorsCited.join(', ')}`
          : result.competitorsMentioned.length
            ? `Competitors mentioned: ${result.competitorsMentioned.join(', ')}`
            : 'Not mentioned'
      }
    >
      {ENGINE_LABELS[engine]}: none
    </span>
  );
}

function ScoreCard({
  summary,
  running,
  onRun,
  ranAt,
  durationMs,
  progress,
  stage,
  estimatedMs,
}: {
  summary: AuditResponse['summary'] | null;
  running: boolean;
  onRun: () => void;
  ranAt: string | null;
  durationMs: number | null;
  progress: number;
  stage: string;
  estimatedMs: number;
}) {
  const hasResult = summary != null && summary.total > 0;
  const citeRate = hasResult ? summary!.brandCited / summary!.total : 0;
  const mentionRate = hasResult ? summary!.brandMentioned / summary!.total : 0;
  // Headline rate: mostly citation-driven, small bump from bare mentions.
  const headlinePct = hasResult
    ? Math.round((citeRate * 0.8 + mentionRate * 0.2) * 100)
    : null;
  const color =
    headlinePct == null
      ? 'text-foreground/30'
      : headlinePct >= 60
        ? 'text-emerald-600'
        : headlinePct >= 30
          ? 'text-amber-600'
          : 'text-red-600';

  const pct = Math.round(progress * 100);
  const remainingMs = Math.max(1_000, Math.round(estimatedMs * (1 - progress)));

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-8 flex items-center gap-8">
      <div className="flex flex-col items-center">
        <div className={`text-7xl font-bold leading-none ${color}`}>
          {headlinePct == null ? '—' : headlinePct}
        </div>
        <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50 mt-2">
          visibility
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-bold text-foreground mb-1">GEO visibility</h2>
        <p className="text-sm text-foreground/60">
          {hasResult
            ? `Cited on ${summary!.brandCited} / ${summary!.total} calls · mentioned on ${summary!.brandMentioned} / ${summary!.total}. Weighted 0-100 score lands in phase 10.`
            : 'Weighted score across four AI answer engines. Rewards citations over bare mentions.'}
        </p>
        <button
          type="button"
          onClick={onRun}
          disabled={running}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? 'Running audit…' : hasResult ? 'Re-run audit' : 'Run audit'}
        </button>
        {running ? (
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-3 text-[11px] mb-1.5">
              <span className="font-semibold text-foreground/70 truncate">
                {stage || 'Starting…'}
              </span>
              <span className="tabular-nums text-foreground/50 flex-none">
                {pct}% · ~{Math.ceil(remainingMs / 1000)}s left
              </span>
            </div>
            <div className="h-2 rounded-full bg-black/5 overflow-hidden">
              <div
                className="h-full bg-primary transition-[width] duration-[500ms] ease-linear"
                style={{ width: `${Math.max(2, pct)}%` }}
              />
            </div>
          </div>
        ) : ranAt ? (
          <p className="mt-2 text-[11px] text-foreground/40">
            Last run {new Date(ranAt).toLocaleString()}
            {typeof durationMs === 'number'
              ? ` · ${(durationMs / 1000).toFixed(1)}s`
              : ''}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-black/5 bg-white p-6 ${className}`}>
      <h2 className="text-base font-bold text-foreground mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-black/10 bg-warm-bg/40 p-4 text-xs text-foreground/50">
      {children}
    </div>
  );
}
