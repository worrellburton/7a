// Perplexity client.
//
// Calls the OpenAI-compatible /chat/completions endpoint with the
// `sonar` family of models, which always grounds the answer in live
// web search. Response includes:
//   - choices[0].message.content  — the answer
//   - citations[]                 — ordered URL list (legacy shape)
//   - search_results[]            — [{ title, url, date? }] (newer shape)
//
// We prefer search_results when present (it gives us titles); otherwise
// fall back to the citations[] URL list.
//
// Env:
//   PERPLEXITY_API_KEY  required
//   PERPLEXITY_MODEL    optional; defaults to `sonar` (~$0.001/call).
//                       Override to `sonar-pro` for deeper research
//                       answers (~$0.008/call).

import type { EngineAnswer, EngineCitation } from './types';

const ENDPOINT = 'https://api.perplexity.ai/chat/completions';
const FETCH_TIMEOUT_MS = 45_000;

interface PplxSearchResult {
  title?: string;
  url?: string;
  date?: string;
}

interface PplxMessage {
  content?: string | null;
}

interface PplxChoice {
  message?: PplxMessage;
}

interface PplxResponse {
  choices?: PplxChoice[];
  citations?: string[];
  search_results?: PplxSearchResult[];
  error?: { message?: string };
}

export function hasPerplexityKey(): boolean {
  return !!process.env.PERPLEXITY_API_KEY;
}

export async function runPerplexity(
  promptId: string,
  prompt: string,
): Promise<EngineAnswer> {
  const startedAt = Date.now();
  const base: EngineAnswer = {
    engine: 'perplexity',
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

  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) {
    base.error = 'PERPLEXITY_API_KEY is not set';
    base.fetchMs = Date.now() - startedAt;
    return base;
  }

  const model = process.env.PERPLEXITY_MODEL || 'sonar';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      base.error = `HTTP ${res.status}: ${text.slice(0, 240)}`;
      return base;
    }

    const json = (await res.json()) as PplxResponse;
    if (json.error?.message) {
      base.error = json.error.message;
      return base;
    }

    base.answer = (json.choices?.[0]?.message?.content ?? '').trim();

    const citations: EngineCitation[] = [];
    const seen = new Set<string>();
    if (json.search_results && json.search_results.length > 0) {
      for (const r of json.search_results) {
        const url = r.url?.trim();
        if (!url || seen.has(url)) continue;
        seen.add(url);
        citations.push({
          url,
          title: r.title?.trim() || null,
          position: citations.length,
        });
      }
    } else if (json.citations && json.citations.length > 0) {
      for (const url of json.citations) {
        const u = url?.trim();
        if (!u || seen.has(u)) continue;
        seen.add(u);
        citations.push({ url: u, title: null, position: citations.length });
      }
    }

    base.citations = citations;
    base.ok = base.answer.length > 0;
    base.fetchedAt = new Date().toISOString();
  } catch (err) {
    base.error = err instanceof Error ? err.message : String(err);
  } finally {
    clearTimeout(timer);
    base.fetchMs = Date.now() - startedAt;
  }

  return base;
}
