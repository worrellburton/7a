import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { discoverSitemap } from '@/lib/seo/sitemap';
import { crawlAll } from '@/lib/seo/runner';
import { KEYWORDS } from '@/lib/seo/keywords';
import { fitForKeyword, bucketFor, type KeywordFit } from '@/lib/seo/keywordFit';

// POST /api/seo/keywords/fit/scan
// Admin-only. Crawls the live marketing site, scores every keyword in
// KEYWORDS against every reachable page, and upserts one row per
// keyword into public.keyword_fits. Returns the ranked list so the
// admin UI can render immediately without a follow-up GET.

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DEFAULT_ORIGIN = 'https://sevenarrowsrecoveryarizona.com';

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let origin = DEFAULT_ORIGIN;
  try {
    const body = (await req.json().catch(() => ({}))) as { origin?: string };
    if (body.origin) {
      const u = new URL(body.origin);
      origin = `${u.protocol}//${u.host}`;
    }
  } catch { /* fall through */ }

  const startedAt = Date.now();

  // Discover URLs. Falls back to a seed list of known routes when the
  // sitemap is empty or missing so the fit scan still produces data.
  const sitemap = await discoverSitemap(origin).catch(() => null);
  const urls: string[] = Array.isArray(sitemap?.urls) && sitemap.urls.length > 0
    ? sitemap.urls
    : [`${origin}/`];

  // Crawl all pages with HTML retained so scorePageForKeyword can
  // sample body text. Page cap is generous — scoring per page is cheap.
  const { pages } = await crawlAll(urls, { concurrency: 10, maxPages: 400, keepHtml: true });

  const fits: KeywordFit[] = KEYWORDS.map((k) => fitForKeyword({
    keyword_id: k.id,
    keyword_text: k.text,
    pages,
  }));

  // Upsert into keyword_fits. Single insert with onConflict so the
  // whole scan result lands atomically-ish.
  const admin = getAdminSupabase();
  const rows = fits.map((f) => ({
    keyword_id: f.keyword_id,
    score: Math.max(0, Math.min(127, Math.round(f.score))),
    bucket: bucketFor(f.score),
    best_url: f.best_url,
    best_h1: f.best_h1,
    best_title: f.best_title,
    breakdown: f.breakdown ?? {},
    scanned_at: new Date().toISOString(),
  }));

  const { error } = await admin
    .from('keyword_fits')
    .upsert(rows, { onConflict: 'keyword_id' });
  if (error) {
    return NextResponse.json({ error: error.message, fits }, { status: 500 });
  }

  return NextResponse.json({
    origin,
    pagesCrawled: pages.length,
    keywords: fits.length,
    durationMs: Date.now() - startedAt,
    fits,
  });
}
