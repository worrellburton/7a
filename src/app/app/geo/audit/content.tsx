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

interface EngineScore {
  engine: EngineId;
  score: number;
  total: number;
  cited: number;
  mentioned: number;
  lostToCompetitor: number;
  errors: number;
}

interface CategoryScore {
  category: PromptCategory;
  score: number;
  total: number;
  cited: number;
  mentioned: number;
}

interface GeoScore {
  score: number;
  grade: 'F' | 'D' | 'C' | 'B' | 'A' | 'A+';
  headline: string;
  engines: EngineScore[];
  categories: CategoryScore[];
  competitorCitations: { name: string; count: number }[];
  opportunityPrompts: {
    promptId: string;
    text: string;
    category: PromptCategory;
    priority: 1 | 2 | 3;
    visibility: number;
    impact: number;
  }[];
  wins: {
    promptId: string;
    text: string;
    category: PromptCategory;
    priority: 1 | 2 | 3;
    visibility: number;
  }[];
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
  score?: GeoScore;
  prompt?: string;
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
        score={result?.score ?? null}
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

      {result?.score && result.score.engines.length > 0 ? (
        <Panel title="Visibility by engine" className="mt-6">
          <div className="space-y-3">
            {result.score.engines.map((e) => {
              const color =
                e.score >= 70
                  ? 'bg-emerald-500'
                  : e.score >= 40
                    ? 'bg-amber-500'
                    : 'bg-red-500';
              const txt =
                e.score >= 70
                  ? 'text-emerald-600'
                  : e.score >= 40
                    ? 'text-amber-600'
                    : 'text-red-600';
              return (
                <div
                  key={e.engine}
                  className="border-b border-black/5 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="min-w-[150px] text-sm font-semibold text-foreground">
                      {ENGINE_LABELS[e.engine]}
                    </span>
                    <span className={`min-w-[60px] text-sm font-bold ${txt}`}>
                      {e.score}/100
                    </span>
                    <span className="text-xs text-foreground/60 flex-1">
                      {e.cited} cited · {e.mentioned} mentioned ·{' '}
                      {e.lostToCompetitor} lost to competitor
                      {e.errors > 0 ? ` · ${e.errors} errors` : ''}
                    </span>
                  </div>
                  <div className="mt-2 ml-[150px] h-1.5 rounded-full bg-black/5 overflow-hidden">
                    <div
                      className={`h-full ${color}`}
                      style={{ width: `${Math.max(2, e.score)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      ) : null}

      {result?.score && result.score.categories.length > 0 ? (
        <Panel title="Visibility by funnel category" className="mt-6">
          <div className="space-y-3">
            {result.score.categories
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((c) => {
                const color =
                  c.score >= 70
                    ? 'bg-emerald-500'
                    : c.score >= 40
                      ? 'bg-amber-500'
                      : 'bg-red-500';
                const txt =
                  c.score >= 70
                    ? 'text-emerald-600'
                    : c.score >= 40
                      ? 'text-amber-600'
                      : 'text-red-600';
                return (
                  <div
                    key={c.category}
                    className="border-b border-black/5 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="min-w-[200px] text-sm font-semibold text-foreground">
                        {CATEGORY_LABELS[c.category]}
                      </span>
                      <span className={`min-w-[60px] text-sm font-bold ${txt}`}>
                        {c.score}/100
                      </span>
                      <span className="text-xs text-foreground/60 flex-1">
                        {c.cited} / {c.total} cited · {c.mentioned} /{' '}
                        {c.total} mentioned
                      </span>
                    </div>
                    <div className="mt-2 ml-[200px] h-1.5 rounded-full bg-black/5 overflow-hidden">
                      <div
                        className={`h-full ${color}`}
                        style={{ width: `${Math.max(2, c.score)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </Panel>
      ) : null}

      {result?.score && result.score.competitorCitations.length > 0 ? (
        <Panel title="Who's winning our queries" className="mt-6">
          <ul className="space-y-1 text-sm">
            {result.score.competitorCitations.slice(0, 10).map((c) => (
              <li
                key={c.name}
                className="flex items-baseline gap-3 border-b border-black/5 pb-1 last:border-b-0"
              >
                <span className="font-semibold text-foreground">{c.name}</span>
                <span className="text-foreground/60 text-xs">
                  cited in {c.count} answer{c.count === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
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
          {result?.score ? (
            <StrengthList score={result.score} />
          ) : (
            <Empty>Run an audit to see which engines cite us today.</Empty>
          )}
        </Panel>
        <Panel title="What's not">
          {result?.score ? (
            <WeaknessList score={result.score} />
          ) : (
            <Empty>
              Run an audit to see where competitors win or we&apos;re
              invisible.
            </Empty>
          )}
        </Panel>
      </div>

      <ClaudePromptPanel prompt={result?.prompt ?? null} running={running} />
    </div>
  );
}

function ClaudePromptPanel({
  prompt,
  running,
}: {
  prompt: string | null;
  running: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.getElementById('geo-claude-prompt') as
        | HTMLTextAreaElement
        | null;
      if (ta) {
        ta.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }

  return (
    <Panel title="Generate Claude prompt" className="mt-6">
      {prompt ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-foreground/60">
              Paste this into Claude to turn the audit into a content + schema
              sprint.
            </p>
            <button
              type="button"
              onClick={copy}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              {copied ? 'Copied!' : 'Copy prompt'}
            </button>
          </div>
          <textarea
            id="geo-claude-prompt"
            readOnly
            value={prompt}
            className="w-full h-72 rounded-lg border border-black/10 bg-warm-bg/30 p-3 font-mono text-[11px] text-foreground/80 leading-relaxed resize-y"
          />
        </div>
      ) : (
        <Empty>
          {running
            ? 'Building prompt…'
            : 'After an audit completes, this section will produce a copy-pasteable prompt you can drop into Claude to improve AI-answer visibility.'}
        </Empty>
      )}
    </Panel>
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
  score,
  running,
  onRun,
  ranAt,
  durationMs,
  progress,
  stage,
  estimatedMs,
}: {
  summary: AuditResponse['summary'] | null;
  score: GeoScore | null;
  running: boolean;
  onRun: () => void;
  ranAt: string | null;
  durationMs: number | null;
  progress: number;
  stage: string;
  estimatedMs: number;
}) {
  const hasResult = summary != null && summary.total > 0;
  // Prefer the weighted score from the aggregator. Fall back to a
  // quick rate-based headline if we only have a legacy localStorage
  // result with no `score` field yet.
  const headlinePct = score?.score ?? (
    hasResult
      ? Math.round(
          (summary!.brandCited / summary!.total) * 80 +
          (summary!.brandMentioned / summary!.total) * 20,
        )
      : null
  );
  const color =
    headlinePct == null
      ? 'text-foreground/30'
      : headlinePct >= 70
        ? 'text-emerald-600'
        : headlinePct >= 40
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
          {score?.grade ? (
            <span className="ml-1 text-foreground/70">· {score.grade}</span>
          ) : null}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-bold text-foreground mb-1">GEO visibility</h2>
        <p className="text-sm text-foreground/60">
          {score?.headline ??
            (hasResult
              ? `Cited on ${summary!.brandCited} / ${summary!.total} calls · mentioned on ${summary!.brandMentioned} / ${summary!.total}.`
              : 'Weighted score across four AI answer engines. Citation position drives the score — first citation is worth 100, position 6+ is 60.')}
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

function StrengthList({ score }: { score: GeoScore }) {
  const strongEngines = score.engines.filter((e) => e.score >= 70);
  const strongCategories = score.categories.filter((c) => c.score >= 70);
  const topWins = score.wins.slice(0, 8);

  if (
    strongEngines.length === 0 &&
    strongCategories.length === 0 &&
    topWins.length === 0
  ) {
    return (
      <Empty>
        No category or engine is scoring &gt;=70 yet. Once you fix issues in
        &quot;What&apos;s not&quot;, this panel will fill with the wins to
        protect.
      </Empty>
    );
  }

  return (
    <ul className="space-y-3 text-sm">
      {strongEngines.map((e) => (
        <li key={`eng-${e.engine}`}>
          <span className="inline-block min-w-[44px] mr-2 rounded bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[11px] font-bold text-center">
            {e.score}
          </span>
          <strong>{ENGINE_LABELS[e.engine]}.</strong>{' '}
          <span className="text-foreground/70">
            Cited on {e.cited} of {e.total} tracked queries.
          </span>
        </li>
      ))}
      {strongCategories.map((c) => (
        <li key={`cat-${c.category}`}>
          <span className="inline-block min-w-[44px] mr-2 rounded bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[11px] font-bold text-center">
            {c.score}
          </span>
          <strong>{CATEGORY_LABELS[c.category]}.</strong>{' '}
          <span className="text-foreground/70">
            {c.cited} cited + {c.mentioned} mentioned across {c.total} answers.
          </span>
        </li>
      ))}
      {topWins.length > 0 ? (
        <li className="pt-2 mt-1 border-t border-black/5">
          <p className="text-[10px] font-semibold tracking-wider uppercase text-foreground/50 mb-2">
            Queries we&apos;re winning
          </p>
          <ul className="space-y-1.5 text-xs">
            {topWins.map((w) => (
              <li key={w.promptId}>
                <span className="inline-block min-w-[34px] mr-2 rounded bg-emerald-100 text-emerald-700 px-1 py-0.5 text-[10px] font-bold text-center">
                  {w.visibility}
                </span>
                <span className="text-foreground/80">{w.text}</span>
              </li>
            ))}
          </ul>
        </li>
      ) : null}
    </ul>
  );
}

function WeaknessList({ score }: { score: GeoScore }) {
  const top = score.opportunityPrompts.slice(0, 12);
  const weakEngines = score.engines
    .filter((e) => e.score < 40)
    .sort((a, b) => a.score - b.score);
  const weakCategories = score.categories
    .filter((c) => c.score < 40)
    .sort((a, b) => a.score - b.score);

  if (top.length === 0 && weakEngines.length === 0 && weakCategories.length === 0) {
    return (
      <Empty>
        Nothing is below the opportunity threshold. If you ran a full audit
        and still see this, the score is genuinely good — congrats.
      </Empty>
    );
  }

  return (
    <ul className="space-y-3 text-sm">
      {weakCategories.map((c) => (
        <li key={`cat-${c.category}`}>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
              category
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-foreground/50">
              {CATEGORY_LABELS[c.category]}
            </span>
            <span className="text-[10px] text-foreground/50">
              ({c.score}/100)
            </span>
          </div>
          <p className="text-foreground/80">
            Only {c.cited} of {c.total} answers in this funnel stage cite us.
            Prioritize content and schema for these queries.
          </p>
        </li>
      ))}
      {weakEngines.map((e) => (
        <li key={`eng-${e.engine}`}>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
              engine
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-foreground/50">
              {ENGINE_LABELS[e.engine]}
            </span>
            <span className="text-[10px] text-foreground/50">
              ({e.score}/100)
            </span>
          </div>
          <p className="text-foreground/80">
            Lost to competitor on {e.lostToCompetitor} of {e.total} queries.
            Publish grounding content that this engine reliably surfaces.
          </p>
        </li>
      ))}
      {top.length > 0 ? (
        <li className="pt-2 mt-1 border-t border-black/5">
          <p className="text-[10px] font-semibold tracking-wider uppercase text-foreground/50 mb-2">
            Highest-impact prompts to fix
          </p>
          <ul className="space-y-2 text-xs">
            {top.map((p) => (
              <li key={p.promptId}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      p.priority === 1
                        ? 'bg-red-100 text-red-700'
                        : p.priority === 2
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-black/5 text-foreground/60'
                    }`}
                    title={`priority ${p.priority}`}
                  >
                    P{p.priority}
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-foreground/50">
                    {CATEGORY_LABELS[p.category]}
                  </span>
                  <span className="text-[10px] text-foreground/50">
                    visibility {p.visibility} · impact {p.impact}
                  </span>
                </div>
                <p className="text-foreground/80">{p.text}</p>
              </li>
            ))}
          </ul>
        </li>
      ) : null}
    </ul>
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
