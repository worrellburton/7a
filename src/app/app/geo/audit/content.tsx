'use client';

import Link from 'next/link';
import {
  CATEGORY_LABELS,
  DEFAULT_PROMPTS,
  type PromptCategory,
} from '@/lib/geo/prompts';

export default function AuditContent() {
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
          Seven Arrows is mentioned and cited. Produces a paste-ready Claude
          prompt to close the gaps.
        </p>
      </div>

      <ScoreCard />

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

      <Panel title="Tracked prompts" className="mt-6">
        <p className="text-xs text-foreground/60 mb-4">
          {DEFAULT_PROMPTS.length} prompts across {Object.keys(grouped).length} categories
          — the queries our admissions funnel actually depends on. Priority{' '}
          <span className="font-semibold">1</span> prompts are the high-value
          queries we must win; priority 3 are supporting coverage.
        </p>
        <div className="space-y-4">
          {(Object.keys(grouped) as PromptCategory[]).map((cat) => (
            <div key={cat}>
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-foreground/50 mb-2">
                {CATEGORY_LABELS[cat]} · {grouped[cat].length}
              </p>
              <ul className="space-y-1">
                {grouped[cat].map((p) => (
                  <li
                    key={p.id}
                    className="flex items-start gap-2 text-xs text-foreground/80 border-b border-black/5 pb-1 last:border-b-0"
                  >
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
                    <span>{p.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Engine coverage" className="mt-6">
        <Empty>
          Per-engine citation and mention rates appear here once an audit runs
          (phase 10).
        </Empty>
      </Panel>

      <Panel title="Generate Claude prompt" className="mt-6">
        <Empty>
          After an audit completes, this section will produce a copy-pasteable
          prompt you can drop into Claude to improve AI-answer visibility.
        </Empty>
      </Panel>
    </div>
  );
}

function ScoreCard() {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-8 flex items-center gap-8">
      <div className="flex flex-col items-center">
        <div className="text-7xl font-bold text-foreground/30 leading-none">—</div>
        <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50 mt-2">
          out of 100
        </div>
      </div>
      <div className="flex-1">
        <h2 className="text-base font-bold text-foreground mb-1">GEO score</h2>
        <p className="text-sm text-foreground/60">
          Weighted visibility across four AI answer engines. Rewards citations
          over bare mentions, and recent prompts over stale ones.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Run audit
        </button>
        <p className="mt-2 text-[11px] text-foreground/40">
          Audit runner ships in phase 8.
        </p>
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
