import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { discoverSitemap } from '@/lib/seo/sitemap';

// POST /api/seo/sitemap/run
//
// Fetches the live sitemap from the canonical site, parses it, and
// returns the URL list + raw XML in the response. Authed users only
// (page is admin-area-gated by PageGuard already) — no admin
// requirement, since the sitemap is public anyway and the team
// wanted any signed-in user to be able to run it.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ORIGIN = 'https://sevenarrowsrecoveryarizona.com';

export async function POST() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await discoverSitemap(ORIGIN);

  // Refetch the raw XML separately so the page can offer a clean
  // download. discoverSitemap() returns parsed entries; the raw
  // payload is what the team actually wants to send to Google
  // Search Console / share with consultants.
  let rawXml: string | null = null;
  try {
    const res = await fetch(result.url, {
      headers: { 'user-agent': 'SevenArrowsAuditBot/1.0' },
      cache: 'no-store',
    });
    if (res.ok) rawXml = await res.text();
  } catch {
    // best-effort
  }

  return NextResponse.json({
    runAt: new Date().toISOString(),
    sitemapUrl: result.url,
    type: result.type,
    urls: result.urls,
    entries: result.entries,
    childSitemaps: result.childSitemaps,
    warnings: result.warnings,
    rawXml,
  });
}
