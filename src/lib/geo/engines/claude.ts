// Anthropic Claude client with the web_search tool.
//
// Bare fetch against /v1/messages (no SDK — we only use the Anthropic
// SDK in the OpenAI client flow if we later migrate; for now the Next.js
// route runtime is Node and direct fetch is fine). Default model is
// claude-sonnet-4-6 for cost; override via ANTHROPIC_MODEL. Uses the
// web_search_20260209 tool (dynamic filtering-capable; supported on
// Sonnet 4.6 + Opus 4.6 / 4.7).
//
// Citations ride inline on assistant text content blocks as
// `citations: [{type: "web_search_result_location", url, title,
// cited_text, encrypted_index}]`. We flatten + dedupe across every
// text block to build the shared EngineCitation list.
//
// Env:
//   ANTHROPIC_API_KEY   required (already used by other routes in this
//                       app — see .env.example)
//   ANTHROPIC_MODEL     optional; defaults to claude-sonnet-4-6
//
// Console note: the org admin must enable web search in the Anthropic
// Console (Settings → Privacy) or this returns a 403.

import type { EngineAnswer, EngineCitation } from './types';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const FETCH_TIMEOUT_MS = 60_000;

// Max searches per prompt — keeps per-call cost bounded. 32 prompts ×
// 3 searches = ~96 searches/run at $10/1k = ~$1 from search alone,
// plus Sonnet 4.6 tokens.
const MAX_USES_PER_PROMPT = 3;
const MAX_OUTPUT_TOKENS = 2048;

interface ClaudeCitation {
  type: string;
  url?: string;
  title?: string;
  cited_text?: string;
  encrypted_index?: string;
}

interface ClaudeContentBlock {
  type: string;
  text?: string;
  citations?: ClaudeCitation[];
}

interface ClaudeUsage {
  server_tool_use?: { web_search_requests?: number };
}

interface ClaudeResponse {
  content?: ClaudeContentBlock[];
  stop_reason?: string;
  usage?: ClaudeUsage;
  error?: { message?: string; type?: string };
}

export function hasClaudeKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function runClaude(promptId: string, prompt: string): Promise<EngineAnswer> {
  const startedAt = Date.now();
  const base: EngineAnswer = {
    engine: 'claude',
    promptId,
    prompt,
    answer: '',
    citations: [],
    fetchMs: 0,
    ok: false,
    error: null,
    warnings: [],
    fetchedAt: new Date().toISOString(),
  };

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    base.error = 'ANTHROPIC_API_KEY is not set';
    base.fetchMs = Date.now() - startedAt;
    return base;
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'x-api-key': key,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages: [{ role: 'user', content: prompt }],
        tools: [
          {
            type: 'web_search_20260209',
            name: 'web_search',
            max_uses: MAX_USES_PER_PROMPT,
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      base.error = `HTTP ${res.status}: ${text.slice(0, 240)}`;
      return base;
    }

    const json = (await res.json()) as ClaudeResponse;
    if (json.error?.message) {
      base.error = json.error.message;
      return base;
    }

    // Concatenate every text block for the answer. Claude typically
    // narrates before searching ("I'll look that up") and then emits
    // the cited answer in a later text block — we want the full text.
    const answerParts: string[] = [];
    const seen = new Set<string>();
    const citations: EngineCitation[] = [];

    for (const block of json.content ?? []) {
      if (block.type !== 'text') continue;
      if (block.text) answerParts.push(block.text);
      for (const c of block.citations ?? []) {
        if (c.type !== 'web_search_result_location') continue;
        const url = c.url?.trim();
        if (!url || seen.has(url)) continue;
        seen.add(url);
        citations.push({
          url,
          title: c.title?.trim() || null,
          position: citations.length,
        });
      }
    }

    base.answer = answerParts.join('\n\n').trim();
    base.citations = citations;
    base.ok = base.answer.length > 0;

    if (json.stop_reason === 'pause_turn') {
      // Server-side search loop hit its 10-iteration default; we're
      // returning the partial answer we have. Treat as a soft warning
      // rather than a hard failure.
      base.warnings.push('stop_reason=pause_turn (server search loop capped)');
    }

    const searches = json.usage?.server_tool_use?.web_search_requests ?? 0;
    if (searches >= MAX_USES_PER_PROMPT) {
      base.warnings.push(`hit max_uses cap (${MAX_USES_PER_PROMPT} searches)`);
    }

    base.fetchedAt = new Date().toISOString();
  } catch (err) {
    base.error = err instanceof Error ? err.message : String(err);
  } finally {
    clearTimeout(timer);
    base.fetchMs = Date.now() - startedAt;
  }

  return base;
}
