import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { hasSerpApi, readSerpApiUsage } from '@/lib/serpapi';

// GET /api/seo/source-health
//
// Returns the current health snapshot of every data source the SEO
// surface depends on:
//   - SerpAPI: configured? today's burn rate vs cap, last 25 calls
//   - Semrush: SEMRUSH_API_KEY present
//   - Google OAuth (GA4 / Search Console / GBP): tokens row exists
//   - Per-table freshness: latest seo_keyword_ranks / seo_local_ranks
//     / seo_paa_questions / seo_competitor_serps / seo_serpapi_usage
//
// Powers the Source Health card on the Information page.

export const dynamic = 'force-dynamic';

interface UsageRow {
  engine: string;
  query: string | null;
  ok: boolean;
  duration_ms: number | null;
  http_status: number | null;
  error: string | null;
  search_id: string | null;
  called_at: string;
}

interface UsageDailyRow { engine: string; called_at: string; ok: boolean }

interface FreshnessTable {
  table: string;
  label: string;
  latest_at: string | null;
  count_30d: number;
}

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase
    .from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // SerpAPI usage today — split by engine so the panel can render a
  // per-engine breakdown.
  const { data: todayCallsRaw } = await supabase
    .from('seo_serpapi_usage')
    .select('engine, called_at, ok')
    .gte('called_at', todayStart.toISOString())
    .order('called_at', { ascending: false });
  const todayCalls = (todayCallsRaw ?? []) as UsageDailyRow[];

  // Last 25 calls — recent activity feed regardless of date.
  const { data: recent } = await supabase
    .from('seo_serpapi_usage')
    .select('engine, query, ok, duration_ms, http_status, error, search_id, called_at')
    .order('called_at', { ascending: false })
    .limit(25);

  const byEngine: Record<string, { ok: number; failed: number }> = {};
  for (const c of todayCalls) {
    if (!byEngine[c.engine]) byEngine[c.engine] = { ok: 0, failed: 0 };
    if (c.ok) byEngine[c.engine].ok += 1;
    else byEngine[c.engine].failed += 1;
  }

  // Google OAuth — check the tokens row exists.
  const { data: oauthRow } = await supabase
    .from('google_oauth_tokens')
    .select('id, refresh_token, updated_at')
    .eq('id', 'primary')
    .maybeSingle();
  const oauthPresent = !!(oauthRow && typeof oauthRow.refresh_token === 'string' && oauthRow.refresh_token.length > 0);

  // Freshness per table. Each select is small + indexed.
  const tables: FreshnessTable[] = [];
  async function addFreshness(table: string, label: string, timeCol = 'checked_at') {
    const latestPromise = supabase.from(table).select(timeCol).order(timeCol, { ascending: false }).limit(1);
    const countPromise = supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .gte(timeCol, since30);
    const [{ data: latestRows }, { count }] = await Promise.all([latestPromise, countPromise]);
    const first = latestRows && latestRows.length > 0 ? latestRows[0] : null;
    const latest = first && typeof first === 'object' ? (first as unknown as Record<string, unknown>)[timeCol] : null;
    tables.push({
      table,
      label,
      latest_at: typeof latest === 'string' ? latest : null,
      count_30d: count ?? 0,
    });
  }
  await Promise.all([
    addFreshness('seo_keyword_ranks', 'Keyword ranks'),
    addFreshness('seo_local_ranks', 'Local pack'),
    addFreshness('seo_paa_questions', 'PAA questions', 'last_seen_at'),
    addFreshness('seo_competitor_serps', 'Competitor SERPs'),
    addFreshness('seo_serpapi_usage', 'SerpAPI usage', 'called_at'),
  ]);

  return NextResponse.json({
    serpapi: {
      configured: hasSerpApi(),
      usage: readSerpApiUsage(),
      today_total: todayCalls.length,
      today_failed: todayCalls.filter((c) => !c.ok).length,
      by_engine: byEngine,
      recent: (recent ?? []) as UsageRow[],
    },
    semrush: {
      configured: typeof process.env.SEMRUSH_API_KEY === 'string' && process.env.SEMRUSH_API_KEY.length > 0,
    },
    google_oauth: {
      configured:
        !!process.env.GOOGLE_OAUTH_CLIENT_ID &&
        !!process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      token_present: oauthPresent,
      token_updated_at: oauthRow?.updated_at ?? null,
    },
    ga4: {
      property_id: process.env.GA4_PROPERTY_ID ?? null,
    },
    freshness: tables,
  });
}
