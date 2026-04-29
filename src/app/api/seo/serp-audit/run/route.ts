import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { googleSearch, hasSerpApi, SerpApiError } from '@/lib/serpapi';

// POST /api/seo/serp-audit/run
//
// Runs the brand-mention SERP audit:
//   "<domain>" -site:<domain>
// i.e. organic results that mention the literal domain string but
// are NOT hosted on the domain. Useful for spotting scraped content,
// citation opportunities, and link-building leads.
//
// Paginates through every page Google will return (start=0, 100,
// 200, …) and dedupes by URL — Google effectively caps a query at
// ~300 unique organic results before duplicating, but pulling every
// page beats stopping at one and missing tail mentions.
//
// Persists the run + results to public.seo_serp_audits so the team
// can scroll through history without burning another SerpAPI credit
// each time. Admin-only, matching the rest of the SEO area.

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const DEFAULT_DOMAIN = 'sevenarrowsrecoveryarizona.com';

// Google deprecated honoring `num` for organic search around 2023,
// so even when we ask for 100 per page Google now hands back 10
// (sometimes 20). We still pass num=100 — it's free and SerpAPI
// occasionally squeezes more out of Google's adjacent endpoints —
// but the loop must advance `start` by the *actual* number of
// results received, not by a fixed PAGE_SIZE, otherwise the second
// page asks for &start=100 when only 10 results have actually been
// scanned, missing 90 results in between.
//
// 30 iterations × ~10 results each = up to 300 unique URLs, which
// matches Google's effective dedup ceiling for a brand-mention
// query. The loop bails out earlier the moment a page returns
// zero new URLs (Google ran out) or zero results at all.
const MAX_PAGES = 30;
const PAGE_SIZE_HINT = 100;

interface SerpHit {
  position: number;
  title: string;
  link: string;
  displayed_link?: string;
  snippet?: string;
}

function buildQuery(domain: string): string {
  // Quote the domain so Google treats it as a phrase, then exclude
  // the domain itself with -site:.
  return `"${domain}" -site:${domain}`;
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!hasSerpApi()) {
    return NextResponse.json(
      { error: 'SERPAPI_KEY not configured. Set it in Vercel env.' },
      { status: 503 },
    );
  }

  // Allow an override domain in the body (e.g. for staging / sister
  // properties), default to the production apex.
  let domain = DEFAULT_DOMAIN;
  try {
    const body = (await req.json()) as { domain?: string };
    if (typeof body?.domain === 'string' && body.domain.trim().length > 0) {
      // Sanitize: strip protocol + path, lowercase, drop www.
      domain = body.domain
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0];
    }
  } catch {
    /* no body — use default */
  }

  const query = buildQuery(domain);
  const admin = getAdminSupabase();

  try {
    // Loop through SerpAPI pages until Google stops returning new
    // URLs. Advance the cursor by the actual rows returned (Google
    // mostly hands back 10 at a time now even when we ask for 100),
    // not by a fixed PAGE_SIZE — otherwise we'd skip 90 results
    // between page 1 and page 2.
    const seen = new Set<string>();
    const hits: SerpHit[] = [];
    let pagesFetched = 0;
    let lastRaw: Record<string, unknown> | null = null;
    let start = 0;

    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await googleSearch({
        q: query,
        num: PAGE_SIZE_HINT,
        start,
      });
      pagesFetched = page + 1;
      lastRaw = result.raw;
      const returned = result.organic.length;
      let added = 0;
      for (const o of result.organic) {
        if (!o.link || seen.has(o.link)) continue;
        seen.add(o.link);
        hits.push({
          // Re-number positions across pages so the table reads 1..N
          // instead of resetting per page.
          position: hits.length + 1,
          title: o.title,
          link: o.link,
          displayed_link: o.displayed_link,
          snippet: o.snippet,
        });
        added++;
      }
      // Stop when Google ran dry (zero results at all) OR when this
      // page contributed zero NEW URLs (unique-result tail reached
      // and we'd otherwise just churn duplicates). Don't compare
      // returned to PAGE_SIZE_HINT — Google ignores `num` so a short
      // page is normal and not a signal we're at the end.
      if (returned === 0) break;
      if (added === 0) break;
      // Advance by the actual count Google returned, not the hint.
      start += returned;
    }

    const { data: row, error: insertErr } = await admin
      .from('seo_serp_audits')
      .insert({
        run_by: user.id,
        query,
        result_count: hits.length,
        results: hits,
        raw: { lastPage: lastRaw, pagesFetched },
      })
      .select('id, run_at, query, result_count, results')
      .maybeSingle();

    if (insertErr) {
      // The search succeeded — return the hits anyway so the user
      // sees their data, but flag the persistence failure.
      return NextResponse.json({
        ok: true,
        persisted: false,
        warning: `Persistence failed: ${insertErr.message}`,
        run: { query, result_count: hits.length, results: hits, run_at: new Date().toISOString() },
      });
    }

    return NextResponse.json({ ok: true, persisted: true, run: row });
  } catch (err) {
    if (err instanceof SerpApiError) {
      // Capture the failed run for visibility — over-cap, network
      // errors, etc. all get a row so the team can see what
      // happened without trawling the Vercel logs.
      await admin
        .from('seo_serp_audits')
        .insert({
          run_by: user.id,
          query,
          result_count: 0,
          results: [],
          error: `${err.message} (HTTP ${err.status})`,
        })
        .select('id')
        .maybeSingle();
      return NextResponse.json(
        { error: err.message, status: err.status },
        { status: err.status >= 500 ? 502 : 400 },
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
