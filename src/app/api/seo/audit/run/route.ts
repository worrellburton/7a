import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { discoverSitemap } from '@/lib/seo/sitemap';
import { crawlPage, type CrawledPage } from '@/lib/seo/crawl';

// POST /api/seo/audit/run
// Admin-only. Runs a full crawl + audit of the live marketing site and
// returns a structured AuditResult. Subsequent phases populate the
// crawler, per-category audits, scoring, and Claude-prompt generation.
//
// Request body (JSON, all optional):
//   { origin?: string }  // defaults to https://sevenarrowsrecoveryarizona.com
//
// Response (skeleton — fields filled in by later phases):
//   {
//     origin: string,
//     score: number | null,
//     ranAt: string,
//     durationMs: number,
//     sitemap: { url, urls: string[], count } | null,
//     pages: AuditedPage[],
//     categories: { ... },
//     strengths: { title, detail }[],
//     issues: { title, detail, severity }[],
//   }

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_ORIGIN = 'https://sevenarrowsrecoveryarizona.com';

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let origin = DEFAULT_ORIGIN;
  try {
    const body = (await req.json().catch(() => ({}))) as { origin?: string };
    if (body.origin) {
      const u = new URL(body.origin);
      origin = `${u.protocol}//${u.host}`;
    }
  } catch {
    // ignore — fall back to default
  }

  const startedAt = Date.now();

  let sitemap: {
    url: string;
    type: string;
    urls: string[];
    count: number;
    childSitemaps: string[];
    warnings: string[];
  } | null = null;
  const issues: { title: string; detail: string; severity: 'low' | 'medium' | 'high' }[] = [];
  const strengths: { title: string; detail: string }[] = [];

  try {
    const sm = await discoverSitemap(origin);
    sitemap = {
      url: sm.url,
      type: sm.type,
      urls: sm.urls,
      count: sm.urls.length,
      childSitemaps: sm.childSitemaps,
      warnings: sm.warnings,
    };
    if (sm.urls.length > 0) {
      strengths.push({
        title: 'Sitemap reachable',
        detail: `${sm.urls.length} URLs discovered via ${sm.url}.`,
      });
    } else {
      issues.push({
        title: 'Sitemap returned no URLs',
        detail: `Resolved to ${sm.url} but parsed 0 entries. Search engines cannot rely on the sitemap to discover content.`,
        severity: 'high',
      });
    }
  } catch (err) {
    issues.push({
      title: 'Sitemap missing',
      detail: err instanceof Error ? err.message : String(err),
      severity: 'high',
    });
  }

  // Phase 4 smoke test: crawl just the homepage so we can verify the
  // extractor end-to-end. Phase 5 expands this to the whole sitemap with
  // a concurrency cap.
  let homepage: CrawledPage | null = null;
  try {
    homepage = await crawlPage(origin);
    if (homepage.error) {
      issues.push({
        title: 'Homepage crawl failed',
        detail: homepage.error,
        severity: 'high',
      });
    } else if (!homepage.ok) {
      issues.push({
        title: `Homepage returned HTTP ${homepage.status}`,
        detail: `Final URL ${homepage.finalUrl}`,
        severity: 'high',
      });
    } else {
      strengths.push({
        title: 'Homepage reachable',
        detail: `HTTP ${homepage.status} in ${homepage.fetchMs}ms · ${homepage.bytes.toLocaleString()} bytes · ${homepage.h1.length} H1 · ${homepage.imageCount} images · ${homepage.internalLinkCount} internal links · ${homepage.jsonLd.length} JSON-LD blocks`,
      });
    }
  } catch (err) {
    issues.push({
      title: 'Homepage crawl threw',
      detail: err instanceof Error ? err.message : String(err),
      severity: 'high',
    });
  }

  const homepageSummary = homepage
    ? {
        url: homepage.url,
        finalUrl: homepage.finalUrl,
        status: homepage.status,
        fetchMs: homepage.fetchMs,
        bytes: homepage.bytes,
        title: homepage.title,
        metaDescription: homepage.metaDescription,
        canonical: homepage.canonical,
        lang: homepage.lang,
        h1Count: homepage.h1.length,
        h1: homepage.h1.slice(0, 3),
        h2Count: homepage.h2.length,
        ogTags: Object.keys(homepage.openGraph).length,
        twitterTags: Object.keys(homepage.twitter).length,
        jsonLdBlocks: homepage.jsonLd.length,
        imageCount: homepage.imageCount,
        imagesMissingAlt: homepage.imagesMissingAlt,
        internalLinkCount: homepage.internalLinkCount,
        externalLinkCount: homepage.externalLinkCount,
        warnings: homepage.warnings,
      }
    : null;

  const result = {
    origin,
    score: null as number | null,
    ranAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    sitemap,
    homepage: homepageSummary,
    pages: [] as unknown[],
    categories: {} as Record<string, unknown>,
    strengths,
    issues,
    notice:
      sitemap && sitemap.count > 0
        ? `Sitemap parsed (${sitemap.count} URLs) and homepage crawled. Full-sitemap crawl + scoring land in phases 5–17.`
        : 'Sitemap fetch incomplete. Per-page crawler + scoring land in phases 5–17.',
  };

  return NextResponse.json(result);
}
