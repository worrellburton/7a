// OpenAI web-search client.
//
// Uses the Chat Completions path with the `gpt-4o-mini-search-preview`
// model so every answer is grounded in live search results. The model
// returns the answer in message.content, and per-sentence citations
// inline as message.annotations[] entries of shape:
//   { type: 'url_citation', url_citation: { url, title, start_index, end_index } }
//
// We flatten those annotations into a de-duped ordered citation list.
//
// Env:
//   OPENAI_API_KEY   required (without it runOpenAi returns ok:false
//                    with a clear error; the orchestrator falls back
//                    and doesn't crash the audit)
//   OPENAI_SEARCH_MODEL  optional; defaults to gpt-4o-mini-search-preview

import type { EngineAnswer, EngineCitation } from './types';

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const FETCH_TIMEOUT_MS = 45_000;

interface OpenAiUrlCitation {
  url: string;
  title?: string;
  start_index?: number;
  end_index?: number;
}

interface OpenAiAnnotation {
  type: string;
  url_citation?: OpenAiUrlCitation;
}

interface OpenAiMessage {
  content?: string | null;
  annotations?: OpenAiAnnotation[];
}

interface OpenAiChoice {
  message?: OpenAiMessage;
}

interface OpenAiResponse {
  choices?: OpenAiChoice[];
  error?: { message?: string };
}

export function hasOpenAiKey(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export async function runOpenAi(promptId: string, prompt: string): Promise<EngineAnswer> {
  const startedAt = Date.now();
  const base: EngineAnswer = {
    engine: 'openai',
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

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    base.error = 'OPENAI_API_KEY is not set';
    base.fetchMs = Date.now() - startedAt;
    return base;
  }

  const model = process.env.OPENAI_SEARCH_MODEL || 'gpt-4o-mini-search-preview';
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
        web_search_options: { search_context_size: 'medium' },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      base.error = `HTTP ${res.status}: ${text.slice(0, 240)}`;
      return base;
    }

    const json = (await res.json()) as OpenAiResponse;
    if (json.error?.message) {
      base.error = json.error.message;
      return base;
    }

    const msg = json.choices?.[0]?.message;
    base.answer = (msg?.content ?? '').trim();

    const seen = new Set<string>();
    const citations: EngineCitation[] = [];
    for (const ann of msg?.annotations ?? []) {
      if (ann.type !== 'url_citation' || !ann.url_citation?.url) continue;
      const url = ann.url_citation.url.trim();
      if (seen.has(url)) continue;
      seen.add(url);
      citations.push({
        url,
        title: ann.url_citation.title?.trim() || null,
        position: citations.length,
      });
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
