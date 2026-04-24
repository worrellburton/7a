import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { KEYWORDS, type Keyword } from '@/lib/seo/keywords';

// POST /api/seo/keywords/rank
//
// Admin-only. For each keyword in the body (or the curated default set),
// queries Google via SerpAPI and reports where sevenarrowsrecoveryarizona.com
// lands in the organic results (top 100). Returns a rank number when we're
// found, or null when we're not. Runs in a small worker pool so the whole
// set finishes in well under 30s.
//
// Body (optional):
//   { keywordIds?: string[], domain?: string }
//
// Response:
//   {
//     ranAt: string,
//     durationMs: number,
//     domain: string,
//     results: {
//       id: string,
//       keyword: string,
//       rank: number | null,   // 1-based Google organic position, null = not in top 100
//       url: string | null,
//       totalResults: number,
//       error: string | null,
//     }[],
//     notice?: string,
//   }

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_DOMAIN = 'sevenarrowsrecoveryarizona.com';
const SERP_ENDPOINT = 'https://serpapi.com/search.json';
const CONCURRENCY = 6;
const PER_QUERY_TIMEOUT_MS = 20_000;

interface SerpOrganic {
  position?: number;
  link?: string;
}

interface SerpResponse {
  organic_results?: SerpOrganic[];
  error?: string;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function matchesDomain(url: string, domain: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  const target = domain.replace(/^www\./, '').toLowerCase();
  return host === target || host.endsWith(`.${target}`);
}

interface RankRow {
  id: string;
  keyword: string;
  rank: number | null;
  url: string | null;
  totalResults: number;
  error: string | null;
}

async function fetchRank(
  keyword: Keyword,
  domain: string,
  apiKey: string,
): Promise<RankRow> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_QUERY_TIMEOUT_MS);
  const url = new URL(SERP_ENDPOINT);
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', keyword.text);
  url.searchParams.set('gl', 'us');
  url.searchParams.set('hl', 'en');
  url.searchParams.set('num', '100');
  url.searchParams.set('api_key', apiKey);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        id: keyword.id,
        keyword: keyword.text,
        rank: null,
        url: null,
        totalResults: 0,
        error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    const json = (await res.json()) as SerpResponse;
    if (json.error) {
      return {
        id: keyword.id,
        keyword: keyword.text,
        rank: null,
        url: null,
        totalResults: 0,
        error: json.error,
      };
    }
    const organic = json.organic_results ?? [];
    // SerpAPI positions are 1-based and sorted. Find our first hit.
    let rank: number | null = null;
    let matchUrl: string | null = null;
    for (const o of organic) {
      if (o.link && matchesDomain(o.link, domain)) {
        rank = typeof o.position === 'number' ? o.position : null;
        matchUrl = o.link;
        break;
      }
    }
    return {
      id: keyword.id,
      keyword: keyword.text,
      rank,
      url: matchUrl,
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
  } finally {
    clearTimeout(timer);
  }
}

async function workerPool(
  keywords: Keyword[],
  domain: string,
  apiKey: string,
): Promise<RankRow[]> {
  const results = new Array<RankRow | null>(keywords.length).fill(null);
  let next = 0;
  async function worker() {
    while (true) {
      const idx = next++;
      if (idx >= keywords.length) return;
      results[idx] = await fetchRank(keywords[idx], domain, apiKey);
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

  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
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

  const startedAt = Date.now();
  const results = await workerPool(keywords, domain, apiKey);
  const durationMs = Date.now() - startedAt;

  const ranked = results.filter((r) => r.rank != null).length;
  const errors = results.filter((r) => r.error != null).length;

  return NextResponse.json({
    ranAt: new Date(startedAt).toISOString(),
    durationMs,
    domain,
    results,
    summary: { total: results.length, ranked, errors },
    notice: `Checked ${results.length} keywords · ${ranked} ranking in top 100 · ${errors} errors · ${Math.round(durationMs / 1000)}s`,
  });
}
