import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { KEYWORDS, type Keyword } from '@/lib/seo/keywords';
import {
  findRankInOrganic,
  googleSearch,
  hasSerpApi,
  readSerpApiUsage,
  SerpApiError,
} from '@/lib/serpapi';

// POST /api/seo/keywords/rank
//
// Admin-only. For each keyword in the body (or the curated default set),
// queries Google via SerpAPI and reports where sevenarrowsrecoveryarizona.com
// lands in the organic results (top 100). Returns a rank number when we're
// found, or null when we're not. Runs in a small worker pool so the whole
// set finishes in well under 30s.
//
// Phase 1 of the SerpAPI rebuild: this route is now backed by the
// shared `src/lib/serpapi.ts` client, which enforces a daily call cap
// and emits structured logs. Persistent rank history lands in Phase 2.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_DOMAIN = 'sevenarrowsrecoveryarizona.com';
const CONCURRENCY = 6;

interface RankRow {
  id: string;
  keyword: string;
  rank: number | null;
  url: string | null;
  totalResults: number;
  error: string | null;
}

async function fetchRank(keyword: Keyword, domain: string): Promise<RankRow> {
  try {
    const { organic } = await googleSearch({ q: keyword.text, num: 100 });
    const hit = findRankInOrganic(organic, domain);
    return {
      id: keyword.id,
      keyword: keyword.text,
      rank: hit?.position ?? null,
      url: hit?.url ?? null,
      totalResults: organic.length,
      error: null,
    };
  } catch (err) {
    return {
      id: keyword.id,
      keyword: keyword.text,
      rank: null,
      url: null,
      totalResults: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function workerPool(keywords: Keyword[], domain: string): Promise<RankRow[]> {
  const results = new Array<RankRow | null>(keywords.length).fill(null);
  let next = 0;
  async function worker() {
    while (true) {
      const idx = next++;
      if (idx >= keywords.length) return;
      results[idx] = await fetchRank(keywords[idx], domain);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, keywords.length) }, () => worker()),
  );
  return results.filter((r): r is RankRow => r != null);
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

  if (!hasSerpApi()) {
    return NextResponse.json(
      {
        error:
          'SERPAPI_KEY not configured — the keyword-rank lookup needs SerpAPI to query Google. Set SERPAPI_KEY in Vercel env.',
      },
      { status: 412 },
    );
  }

  let body: { keywordIds?: string[]; domain?: string } = {};
  try {
    body = (await req.json().catch(() => ({}))) as typeof body;
  } catch {
    // ignore — use defaults
  }

  const domain = (body.domain ?? DEFAULT_DOMAIN).trim();
  const keywords = body.keywordIds
    ? KEYWORDS.filter((k) => body.keywordIds!.includes(k.id))
    : KEYWORDS;
  if (keywords.length === 0) {
    return NextResponse.json(
      { error: 'No keywords matched the supplied keywordIds' },
      { status: 400 },
    );
  }

  // Pre-flight cap check so we fail fast with a friendly message
  // instead of half-way through a sweep.
  const preUsage = readSerpApiUsage();
  if (preUsage.count + keywords.length > preUsage.cap) {
    return NextResponse.json(
      {
        error: `SerpAPI daily cap would be exceeded — ${preUsage.count}/${preUsage.cap} used today, sweep needs ${keywords.length} more. Raise SERPAPI_DAILY_CAP or wait until UTC midnight.`,
        usage: preUsage,
      },
      { status: 429 },
    );
  }

  const startedAt = Date.now();
  let results: RankRow[];
  try {
    results = await workerPool(keywords, domain);
  } catch (err) {
    if (err instanceof SerpApiError && err.status === 429) {
      return NextResponse.json({ error: err.message, usage: readSerpApiUsage() }, { status: 429 });
    }
    throw err;
  }
  const durationMs = Date.now() - startedAt;

  const ranked = results.filter((r) => r.rank != null).length;
  const errors = results.filter((r) => r.error != null).length;
  const usage = readSerpApiUsage();

  return NextResponse.json({
    ranAt: new Date(startedAt).toISOString(),
    durationMs,
    domain,
    results,
    summary: { total: results.length, ranked, errors },
    usage,
    notice: `Checked ${results.length} keywords · ${ranked} ranking in top 100 · ${errors} errors · ${Math.round(durationMs / 1000)}s · ${usage.count}/${usage.cap} SerpAPI calls today`,
  });
}
