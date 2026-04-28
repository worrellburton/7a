import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerSupabase } from '@/lib/supabase-server';
import { KEYWORDS, type Keyword } from '@/lib/seo/keywords';
import {
  findRankInOrganic,
  googleSearch,
  hasSerpApi,
  readSerpApiUsage,
  SerpApiError,
  type SerpApiUsageRecorder,
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

interface SerpFeatures {
  ai_overview: boolean;
  answer_box: boolean;
  knowledge_graph: boolean;
  related_questions: boolean;
  local_pack: boolean;
  inline_videos: boolean;
  inline_images: boolean;
  ads_top: number;
  ads_bottom: number;
}

interface CompetitorEntry {
  position: number;
  url: string;
  title: string;
  snippet: string | null;
}

interface RankRow {
  id: string;
  keyword: string;
  rank: number | null;
  url: string | null;
  totalResults: number;
  features: SerpFeatures | null;
  /** Top-10 organic results from the same google_search call.
   *  Persisted to seo_competitor_serps so the Competitors page can
   *  show week-over-week churn without spending more SerpAPI units. */
  top10: CompetitorEntry[];
  error: string | null;
}

async function fetchRank(
  keyword: Keyword,
  domain: string,
  onUsage: SerpApiUsageRecorder | undefined,
): Promise<RankRow> {
  try {
    const { organic, features } = await googleSearch({
      q: keyword.text,
      num: 100,
      onUsage,
    });
    const hit = findRankInOrganic(organic, domain);
    const top10 = organic.slice(0, 10).map((o) => ({
      position: o.position,
      url: o.link,
      title: o.title,
      snippet: o.snippet ?? null,
    }));
    return {
      id: keyword.id,
      keyword: keyword.text,
      rank: hit?.position ?? null,
      url: hit?.url ?? null,
      totalResults: organic.length,
      features,
      top10,
      error: null,
    };
  } catch (err) {
    return {
      id: keyword.id,
      keyword: keyword.text,
      rank: null,
      url: null,
      totalResults: 0,
      features: null,
      top10: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function workerPool(
  keywords: Keyword[],
  domain: string,
  onUsage: SerpApiUsageRecorder | undefined,
): Promise<RankRow[]> {
  const results = new Array<RankRow | null>(keywords.length).fill(null);
  let next = 0;
  async function worker() {
    while (true) {
      const idx = next++;
      if (idx >= keywords.length) return;
      results[idx] = await fetchRank(keywords[idx], domain, onUsage);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, keywords.length) }, () => worker()),
  );
  return results.filter((r): r is RankRow => r != null);
}

// Bulk-insert one history row per checked keyword. Errors that don't
// throw (no SerpApi error, just no rank found) still record so the
// sparkline shows "off the chart" days. Genuine fetch errors record
// rank=null too, but with the error string preserved alongside via
// the seo_serpapi_usage row that callSerpApi already wrote.
async function persistRankHistory(
  supabase: SupabaseClient,
  userId: string,
  domain: string,
  rows: RankRow[],
  keywords: Keyword[],
): Promise<void> {
  if (rows.length === 0) return;
  // Build a lookup so we can grab keyword_text even for rows that
  // bubbled up from an error (we still saved the keyword.text on
  // the result, but defensive lookup keeps the insert resilient).
  const byId = new Map(keywords.map((k) => [k.id, k]));
  const inserts = rows.map((r) => ({
    keyword_id: r.id,
    keyword_text: r.keyword || byId.get(r.id)?.text || r.id,
    domain,
    rank: r.rank,
    url: r.url,
    total_organic: r.totalResults || 0,
    serp_features: r.features ?? null,
    checked_by: userId,
  }));
  const { error } = await supabase.from('seo_keyword_ranks').insert(inserts);
  if (error) {
    console.warn('[seo_keyword_ranks] insert failed', error.message);
  }
}

// Persist top-10 competitor URLs from each keyword sweep into
// seo_competitor_serps. Each row pairs (keyword × position × url)
// at this exact checked_at — the Competitors page reads the latest
// row per (keyword, position) to render the current top 10 + a
// week-ago column for diffing.
function competitorDomain(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}
async function persistCompetitorSerps(
  supabase: SupabaseClient,
  domain: string,
  rows: RankRow[],
): Promise<void> {
  const target = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase();
  const inserts: Record<string, unknown>[] = [];
  for (const r of rows) {
    for (const c of r.top10) {
      const d = competitorDomain(c.url);
      if (!d) continue;
      inserts.push({
        keyword_id: r.id,
        keyword_text: r.keyword,
        position: c.position,
        url: c.url,
        domain: d,
        title: c.title || null,
        snippet: c.snippet,
        is_us: d === target || d.endsWith(`.${target}`),
      });
    }
  }
  if (inserts.length === 0) return;
  const { error } = await supabase.from('seo_competitor_serps').insert(inserts);
  if (error) {
    console.warn('[seo_competitor_serps] insert failed', error.message);
  }
}

// Build a recorder that inserts each SerpAPI call into
// public.seo_serpapi_usage. Bound to the calling admin's user id so
// the audit trail says who burned the credit. The insert is fire-
// and-forget — see callSerpApi's record() — so a flaky DB never
// breaks the rank sweep, but successful inserts give us a queryable
// "where did our SerpAPI credits go this week?" answer.
function makeUsageRecorder(
  supabase: SupabaseClient,
  userId: string,
): SerpApiUsageRecorder {
  return async (rec) => {
    const { error } = await supabase.from('seo_serpapi_usage').insert({
      engine: rec.engine,
      query: rec.query,
      ok: rec.ok,
      duration_ms: rec.duration_ms,
      http_status: rec.http_status,
      error: rec.error,
      search_id: rec.search_id,
      called_by: userId,
    });
    if (error) {
      console.warn('[serpapi.usage] insert failed', error.message);
    }
  };
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
  // Recorder writes one seo_serpapi_usage row per SerpAPI HTTP
  // attempt — successful or failed. Bound to the admin who fired
  // off this sweep so we can answer "who burned the credits?".
  const recorder = makeUsageRecorder(supabase, user.id);
  let results: RankRow[];
  try {
    results = await workerPool(keywords, domain, recorder);
  } catch (err) {
    if (err instanceof SerpApiError && err.status === 429) {
      return NextResponse.json({ error: err.message, usage: readSerpApiUsage() }, { status: 429 });
    }
    throw err;
  }
  const durationMs = Date.now() - startedAt;

  // Persist a row per keyword to seo_keyword_ranks so the Overview
  // page can render a sparkline + Δ-vs-last-week per keyword on the
  // next render. Awaited (vs. fire-and-forget) so a Vercel function
  // teardown doesn't silently drop the writes.
  await persistRankHistory(supabase, user.id, domain, results, keywords);
  // Same sweep — persist the top-10 competitors per keyword. The
  // Competitors page reads from seo_competitor_serps directly.
  await persistCompetitorSerps(supabase, domain, results);

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

// GET /api/seo/keywords/rank
//
// Returns the rank history for the curated keyword set so the
// Overview page can render a sparkline + Δ-vs-last-week per keyword
// without re-running the SerpAPI sweep every page load.
//
// Response shape:
//   {
//     domain: string,
//     latestRanAt: string | null,
//     keywords: Array<{
//       id: string,
//       text: string,
//       latest: { rank, url, checked_at, features } | null,
//       previous: { rank, checked_at } | null,
//       delta: number | null,                  // previous - latest (positive = improved)
//       sparkline: Array<{ rank, checked_at }> // up to 30 most recent points
//     }>
//   }

export async function GET() {
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

  // Pull every check from the last ~6 weeks; the typical sparkline
  // window is 30 days, but we want enough headroom to compute a
  // 7-day-ago "previous" comparison even when sweeps happen on
  // irregular cadence. Cap at 5000 rows so a runaway cron doesn't
  // make this query expensive.
  const since = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('seo_keyword_ranks')
    .select('keyword_id, keyword_text, domain, rank, url, serp_features, checked_at')
    .gte('checked_at', since)
    .order('checked_at', { ascending: false })
    .limit(5000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  type Row = {
    keyword_id: string;
    keyword_text: string;
    domain: string;
    rank: number | null;
    url: string | null;
    serp_features: Record<string, unknown> | null;
    checked_at: string;
  };
  const rows = (data ?? []) as Row[];

  // Group rows by keyword_id, preserving descending-time order from
  // the query. The first row in each group is the latest; the row
  // closest to 7 days before that is "previous".
  const byKeyword = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byKeyword.get(r.keyword_id) ?? [];
    list.push(r);
    byKeyword.set(r.keyword_id, list);
  }

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  const keywords = KEYWORDS.map((k) => {
    const history = byKeyword.get(k.id) ?? [];
    const latest = history[0] ?? null;
    let previous: Row | null = null;
    if (latest) {
      const target = new Date(latest.checked_at).getTime() - WEEK_MS;
      // Find the row whose checked_at is closest to (but at or after)
      // the 7-day-prior mark. Falling back to the oldest row in the
      // window if nothing is older than `target`.
      let bestDelta = Infinity;
      for (const r of history) {
        if (r === latest) continue;
        const t = new Date(r.checked_at).getTime();
        if (t > new Date(latest.checked_at).getTime() - 60_000) continue;
        const d = Math.abs(t - target);
        if (d < bestDelta) {
          bestDelta = d;
          previous = r;
        }
      }
    }
    const delta =
      latest?.rank != null && previous?.rank != null
        ? previous.rank - latest.rank
        : latest?.rank != null && previous?.rank == null
          ? null
          : null;
    return {
      id: k.id,
      text: k.text,
      latest: latest
        ? {
            rank: latest.rank,
            url: latest.url,
            checked_at: latest.checked_at,
            features: latest.serp_features,
          }
        : null,
      previous: previous
        ? { rank: previous.rank, checked_at: previous.checked_at }
        : null,
      delta,
      // Sparkline points: oldest → newest, max 30 points.
      sparkline: history
        .slice()
        .reverse()
        .slice(-30)
        .map((r) => ({ rank: r.rank, checked_at: r.checked_at })),
    };
  });

  const latestRanAt =
    rows.length > 0
      ? rows.reduce((max, r) => (r.checked_at > max ? r.checked_at : max), rows[0].checked_at)
      : null;

  return NextResponse.json({
    domain: rows[0]?.domain ?? DEFAULT_DOMAIN,
    latestRanAt,
    keywords,
  });
}
