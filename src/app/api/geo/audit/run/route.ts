import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import {
  DEFAULT_PROMPTS,
  COMPETITOR_BRANDS,
  type GeoPrompt,
} from '@/lib/geo/prompts';
import { hasOpenAiKey, runOpenAi } from '@/lib/geo/engines/openai';
import {
  hasPerplexityKey,
  runPerplexity,
} from '@/lib/geo/engines/perplexity';
import { hasClaudeKey, runClaude } from '@/lib/geo/engines/claude';
import { hasSerpApiKey, runGoogleAio } from '@/lib/geo/engines/google_aio';
import type { EngineAnswer, EngineId } from '@/lib/geo/engines/types';
import { detectMentions, type MentionResult } from '@/lib/geo/detector';

// POST /api/geo/audit/run
//
// Admin-only orchestrator for the GEO audit. Fans out (engine × prompt)
// calls in parallel with a concurrency cap and returns detected mentions
// per call. Each engine degrades gracefully: if its API key is unset it's
// listed under skippedEngines and the audit continues.
//
// Body (all optional):
//   {
//     promptIds?: string[]  // subset of DEFAULT_PROMPTS to run (default: all)
//     engines?: EngineId[]  // which engines to run (default: all enabled)
//   }
//
// Response:
//   {
//     ranAt, durationMs,
//     prompts: { id, text, category, priority }[],
//     engines: EngineId[],
//     skippedEngines: { engine, reason }[],
//     results: MentionResult[],      // one per (engine, prompt) pair
//     summary: {
//       total, ok, answered, brandMentioned, brandCited,
//     },
//     notice?: string,
//   }

export const dynamic = 'force-dynamic';
// A 32-prompt × 4-engine run is 128 calls. With concurrency 10 and
// Claude web-search at ~15s p50 that's ~200s. Budget 300s (Vercel Pro
// hard cap) and let the client chunk via promptIds if needed.
export const maxDuration = 300;

const CONCURRENCY = 10;
const DEFAULT_ENGINES: EngineId[] = [
  'openai',
  'perplexity',
  'claude',
  'google_aio',
];

interface Task {
  engine: EngineId;
  prompt: GeoPrompt;
}

async function runTask(task: Task): Promise<MentionResult> {
  const { engine, prompt } = task;
  let answer: EngineAnswer;
  switch (engine) {
    case 'openai':
      answer = await runOpenAi(prompt.id, prompt.text);
      break;
    case 'perplexity':
      answer = await runPerplexity(prompt.id, prompt.text);
      break;
    case 'claude':
      answer = await runClaude(prompt.id, prompt.text);
      break;
    case 'google_aio':
      answer = await runGoogleAio(prompt.id, prompt.text);
      break;
  }
  const competitors = prompt.competitorWatch ?? COMPETITOR_BRANDS;
  return detectMentions(answer, { competitors });
}

async function workerPool(tasks: Task[]): Promise<MentionResult[]> {
  const results = new Array<MentionResult | null>(tasks.length).fill(null);
  let next = 0;
  async function worker() {
    while (true) {
      const idx = next++;
      if (idx >= tasks.length) return;
      results[idx] = await runTask(tasks[idx]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => worker()),
  );
  return results.filter((r): r is MentionResult => r != null);
}

function engineEnabled(engine: EngineId): { enabled: boolean; reason?: string } {
  switch (engine) {
    case 'openai':
      return hasOpenAiKey()
        ? { enabled: true }
        : { enabled: false, reason: 'OPENAI_API_KEY is not set' };
    case 'perplexity':
      return hasPerplexityKey()
        ? { enabled: true }
        : { enabled: false, reason: 'PERPLEXITY_API_KEY is not set' };
    case 'claude':
      return hasClaudeKey()
        ? { enabled: true }
        : { enabled: false, reason: 'ANTHROPIC_API_KEY is not set' };
    case 'google_aio':
      return hasSerpApiKey()
        ? { enabled: true }
        : { enabled: false, reason: 'SERPAPI_KEY is not set' };
  }
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Parse body.
  let body: { promptIds?: string[]; engines?: EngineId[] } = {};
  try {
    body = (await req.json().catch(() => ({}))) as typeof body;
  } catch {
    // ignore — use defaults
  }

  const promptIds = body.promptIds;
  const prompts = promptIds
    ? DEFAULT_PROMPTS.filter((p) => promptIds.includes(p.id))
    : DEFAULT_PROMPTS;
  if (prompts.length === 0) {
    return NextResponse.json(
      { error: 'No prompts matched the supplied promptIds' },
      { status: 400 },
    );
  }

  const requestedEngines = body.engines ?? DEFAULT_ENGINES;
  const engines: EngineId[] = [];
  const skippedEngines: { engine: EngineId; reason: string }[] = [];
  for (const e of requestedEngines) {
    const status = engineEnabled(e);
    if (status.enabled) engines.push(e);
    else skippedEngines.push({ engine: e, reason: status.reason ?? 'disabled' });
  }

  if (engines.length === 0) {
    return NextResponse.json(
      {
        error:
          'No engines are configured. Set at least one of OPENAI_API_KEY / PERPLEXITY_API_KEY / ANTHROPIC_API_KEY / SERPAPI_KEY.',
        skippedEngines,
      },
      { status: 412 },
    );
  }

  // Build the full task matrix, interleaved by engine so one slow
  // engine doesn't block all the fast ones behind it.
  const tasks: Task[] = [];
  for (const prompt of prompts) {
    for (const engine of engines) {
      tasks.push({ engine, prompt });
    }
  }

  const startedAt = Date.now();
  const results = await workerPool(tasks);
  const durationMs = Date.now() - startedAt;

  const summary = {
    total: results.length,
    ok: results.filter((r) => r.ok).length,
    answered: results.filter((r) => r.answered).length,
    brandMentioned: results.filter((r) => r.brandMentioned).length,
    brandCited: results.filter((r) => r.brandCited).length,
  };

  return NextResponse.json({
    ranAt: new Date(startedAt).toISOString(),
    durationMs,
    prompts: prompts.map((p) => ({
      id: p.id,
      text: p.text,
      category: p.category,
      priority: p.priority,
    })),
    engines,
    skippedEngines,
    results,
    summary,
    notice:
      skippedEngines.length > 0
        ? `Ran ${engines.length} of ${requestedEngines.length} engines (${skippedEngines.map((s) => s.engine).join(', ')} skipped — see skippedEngines). Scoring lands in phase 10.`
        : `Ran ${results.length} (engine × prompt) calls in ${Math.round(durationMs / 1000)}s. Scoring lands in phase 10.`,
  });
}
