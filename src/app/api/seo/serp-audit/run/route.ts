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

// 10 pages × 100 results = up to 1000 hits. Google deduplicates well
// before that for any normal query, so the loop almost always exits
// early via the "page returned no new URLs" stop condition. The hard
// cap is a runaway-cost guard, not an expected ceiling.
const MAX_PAGES = 10;
const PAGE_SIZE = 100;

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
    // URLs. Each iteration burns one SerpAPI credit; the dedupe loop
    // stops as soon as a page returns zero never-seen URLs, so for
    // small brand-mention queries we usually cost out at 1–2 pages.
    const seen = new Set<string>();
    const hits: SerpHit[] = [];
    let pagesFetched = 0;
    let lastRaw: Record<string, unknown> | null = null;

    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await googleSearch({
        q: query,
        num: PAGE_SIZE,
        start: page * PAGE_SIZE,
      });
      pagesFetched = page + 1;
      lastRaw = result.raw;
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
      // Stop when this page contributed nothing new — that's Google
      // signaling the unique-result tail. Also stop if the page
      // returned fewer than PAGE_SIZE rows; SerpAPI returns the
      // largest available batch, so a short page = we're at the end.
      if (added === 0) break;
      if (result.organic.length < PAGE_SIZE) break;
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
