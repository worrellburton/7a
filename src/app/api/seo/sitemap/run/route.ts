import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { crawlSite, discoverSitemap } from '@/lib/seo/sitemap';

// POST /api/seo/sitemap/run
//
// Runs in two stages:
//   1. Crawl the live site (BFS through internal links) so the
//      result reflects what's actually reachable on production —
//      not just what the static or auto-generated sitemap.xml
//      claims.
//   2. Fetch the published /sitemap.xml so admins can see both at
//      once, with a diff of what was crawled but not in the
//      sitemap (orphaned-only-via-link) vs. in the sitemap but
//      not crawled (orphaned-only-via-sitemap).
//
// The dynamic app/sitemap.ts auto-enumerates the (site) directory
// at request time, so the published sitemap is always fresh — but
// running a crawl confirms it matches the link graph the rest of
// the world sees.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ORIGIN = 'https://sevenarrowsrecoveryarizona.com';

export async function POST() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Run the live crawl and the sitemap parse in parallel. Each is
  // independent — crawl walks the link graph, sitemap parse is a
  // single XML fetch — so doing them concurrently halves wall time.
  const [crawl, sitemap] = await Promise.all([
    crawlSite(`${ORIGIN}/`),
    discoverSitemap(ORIGIN),
  ]);

  // Refetch the raw sitemap XML so the page can offer a clean
  // download. discoverSitemap returns parsed entries; this is the
  // verbatim payload Search Console / consultants want.
  let rawXml: string | null = null;
  try {
    const res = await fetch(sitemap.url, {
      headers: { 'user-agent': 'SevenArrowsAuditBot/1.0' },
      cache: 'no-store',
    });
    if (res.ok) rawXml = await res.text();
  } catch {
    // best-effort
  }

  // Compute the diff. Normalize trailing slashes on both sides so
  // / and (site root) don't show as missing each other.
  const norm = (u: string) => u.replace(/\/$/, '') || '/';
  const sitemapSet = new Set(sitemap.urls.map(norm));
  const crawlSet = new Set(crawl.pages.map(norm));
  const onlyCrawled = crawl.pages.filter((u) => !sitemapSet.has(norm(u)));
  const onlyInSitemap = sitemap.urls.filter((u) => !crawlSet.has(norm(u)));

  return NextResponse.json({
    runAt: new Date().toISOString(),

    // Live crawl
    crawl: {
      origin: crawl.origin,
      pages: crawl.pages,
      unfetched: crawl.unfetched,
      redirects: crawl.redirects,
      warnings: crawl.warnings,
      truncated: crawl.truncated,
      durationMs: crawl.durationMs,
    },

    // Published sitemap (still surfaced so URLs/Download work as before)
    sitemapUrl: sitemap.url,
    type: sitemap.type,
    urls: sitemap.urls,
    entries: sitemap.entries,
    childSitemaps: sitemap.childSitemaps,
    warnings: sitemap.warnings,
    rawXml,

    // Diff
    diff: {
      onlyCrawled,    // reachable via link but missing from sitemap
      onlyInSitemap,  // in sitemap but didn't surface during crawl
    },
  });
}
