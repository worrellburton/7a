// Google AI Overviews via SerpAPI.
//
// Google doesn't expose AI Overviews via an official API, so we scrape
// via SerpAPI. Two-step fetch:
//   1) GET /search.json?engine=google&q=... — sometimes returns an
//      inline `ai_overview` block, sometimes returns a `page_token`
//      placeholder that says "call again with this token".
//   2) If we got a page_token, GET /search.json?engine=google_ai_overview
//      &page_token=... to fetch the actual overview.
//
// Many queries return NO AI Overview at all — Google only generates them
// for Q&A-shaped queries. We treat "no AI overview present" as a
// legitimate zero-visibility result, not an error. That's signal: the
// brand simply wasn't surfaced.
//
// Env:
//   SERPAPI_KEY   optional. Without it runGoogleAio returns ok:false
//                 with a clear error; the orchestrator skips this
//                 engine. Get a key at serpapi.com (~$50/mo plan covers
//                 weekly audits).

import type { EngineAnswer, EngineCitation } from './types';

const ENDPOINT = 'https://serpapi.com/search.json';
const FETCH_TIMEOUT_MS = 30_000;

interface AioReference {
  link?: string;
  title?: string;
  source?: string;
  index?: number;
}

interface AioTextBlock {
  type?: string;
  snippet?: string;
  list?: { snippet?: string; title?: string }[];
}

interface AioBlock {
  text_blocks?: AioTextBlock[];
  references?: AioReference[];
  page_token?: string;
  error?: string;
}

interface SerpApiResponse {
  ai_overview?: AioBlock;
  error?: string;
  search_metadata?: { status?: string };
}

export function hasSerpApiKey(): boolean {
  return !!process.env.SERPAPI_KEY;
}

function flattenTextBlocks(blocks: AioTextBlock[] | undefined): string {
  if (!blocks || blocks.length === 0) return '';
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.snippet) parts.push(b.snippet.trim());
    if (b.list) {
      for (const item of b.list) {
        const line = [item.title, item.snippet].filter(Boolean).join(' — ');
        if (line) parts.push(`• ${line.trim()}`);
      }
    }
  }
  return parts.join('\n\n');
}

async function fetchSerp(params: Record<string, string>): Promise<SerpApiResponse> {
  const key = process.env.SERPAPI_KEY!;
  const url = new URL(ENDPOINT);
  for (const [k, v] of Object.entries({ ...params, api_key: key })) {
    url.searchParams.set(k, v);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`SerpAPI HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    return (await res.json()) as SerpApiResponse;
  } finally {
    clearTimeout(timer);
  }
}

export async function runGoogleAio(
  promptId: string,
  prompt: string,
): Promise<EngineAnswer> {
  const startedAt = Date.now();
  const base: EngineAnswer = {
    engine: 'google_aio',
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

  if (!process.env.SERPAPI_KEY) {
    base.error = 'SERPAPI_KEY is not set';
    base.fetchMs = Date.now() - startedAt;
    return base;
  }

  try {
    const first = await fetchSerp({
      engine: 'google',
      q: prompt,
      // gl=us + hl=en to pin the English US result set; adjust if we
      // ever tune the audit for non-US markets.
      gl: 'us',
      hl: 'en',
    });

    if (first.error) {
      base.error = first.error;
      return base;
    }

    let aio = first.ai_overview;

    // Lazy-loaded variant: first call only returns a page_token and we
    // have to fetch the overview in a second call. Second-call responses
    // return the ai_overview directly (no more nesting).
    if (aio?.page_token && !aio.text_blocks) {
      const second = await fetchSerp({
        engine: 'google_ai_overview',
        page_token: aio.page_token,
      });
      if (second.error) {
        base.error = second.error;
        return base;
      }
      aio = second.ai_overview ?? (second as unknown as AioBlock);
    }

    if (!aio || (!aio.text_blocks?.length && !aio.references?.length)) {
      // No AI Overview generated for this query — legitimate outcome,
      // not an error. Scorer should read this as zero visibility.
      base.warnings.push('No AI Overview returned for this query');
      base.ok = true;
      base.fetchedAt = new Date().toISOString();
      return base;
    }

    if (aio.error) {
      base.error = aio.error;
      return base;
    }

    base.answer = flattenTextBlocks(aio.text_blocks);

    const seen = new Set<string>();
    const citations: EngineCitation[] = [];
    // references are ordered; `index` is 1-based but may be missing.
    // Walk in array order and use array position for our `position`.
    const refs = (aio.references ?? []).slice().sort((a, b) => {
      const ai = typeof a.index === 'number' ? a.index : 999;
      const bi = typeof b.index === 'number' ? b.index : 999;
      return ai - bi;
    });
    for (const r of refs) {
      const url = r.link?.trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      citations.push({
        url,
        title: r.title?.trim() || r.source?.trim() || null,
        position: citations.length,
      });
    }
    base.citations = citations;

    // An AIO block with references but no text is still a valid result
    // (we can't read the text but we know what was cited). ok mirrors
    // whether we got *something* back.
    base.ok = base.answer.length > 0 || citations.length > 0;
    base.fetchedAt = new Date().toISOString();
  } catch (err) {
    base.error = err instanceof Error ? err.message : String(err);
  } finally {
    base.fetchMs = Date.now() - startedAt;
  }

  return base;
}
