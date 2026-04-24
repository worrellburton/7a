import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { discoverSitemap } from '@/lib/seo/sitemap';
import { crawlPage, type CrawledPage } from '@/lib/seo/crawl';
import { crawlAll } from '@/lib/seo/runner';
import { auditTitles } from '@/lib/seo/audits/title';
import { auditMetaDescriptions } from '@/lib/seo/audits/meta';
import type { CategoryAudit } from '@/lib/seo/audits/types';

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

function severityRank(s: 'low' | 'medium' | 'high'): number {
  return s === 'high' ? 3 : s === 'medium' ? 2 : 1;
}

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

  // Phase 5: crawl the full sitemap with bounded concurrency. The
  // homepage is always crawled too — even when sitemap discovery
  // failed — so we can still produce a partial audit.
  const sitemapUrls = sitemap?.urls ?? [];
  const urlsToCrawl: string[] = [];
  if (!sitemapUrls.includes(origin) && !sitemapUrls.includes(origin + '/')) {
    urlsToCrawl.push(origin);
  }
  for (const u of sitemapUrls) urlsToCrawl.push(u);

  let crawl: { pages: CrawledPage[]; skipped: { url: string; reason: string }[]; trimmed: number; totalMs: number } | null = null;
  let homepage: CrawledPage | null = null;
  try {
    crawl = await crawlAll(urlsToCrawl, { maxPages: 100, concurrency: 6 });
    homepage =
      crawl.pages.find(
        (p) => p.url === origin || p.finalUrl === origin || p.url === origin + '/',
      ) ?? crawl.pages[0] ?? null;

    const okCount = crawl.pages.filter((p) => p.ok).length;
    const errCount = crawl.pages.length - okCount;
    if (okCount > 0) {
      strengths.push({
        title: 'Site reachable',
        detail: `Crawled ${crawl.pages.length} pages (${okCount} OK, ${errCount} non-200) in ${crawl.totalMs}ms.`,
      });
    }
    if (errCount > 0) {
      const sample = crawl.pages
        .filter((p) => !p.ok)
        .slice(0, 5)
        .map((p) => `${p.status || 'ERR'} ${p.url}`)
        .join('; ');
      issues.push({
        title: `${errCount} page${errCount === 1 ? '' : 's'} failed to load`,
        detail: `Examples: ${sample}`,
        severity: errCount >= 5 ? 'high' : 'medium',
      });
    }
    if (crawl.trimmed > 0) {
      issues.push({
        title: `${crawl.trimmed} URLs over crawl cap`,
        detail: `Audit currently caps at 100 pages; ${crawl.trimmed} URLs were not crawled this run.`,
        severity: 'low',
      });
    }
  } catch (err) {
    issues.push({
      title: 'Site crawl threw',
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

  // Per-category audits — phases 6+. Each function reads CrawledPages and
  // returns a CategoryAudit. The aggregator (phase 17) combines them.
  const categories: CategoryAudit[] = [];
  if (crawl && crawl.pages.length > 0) {
    categories.push(auditTitles(crawl.pages));
    categories.push(auditMetaDescriptions(crawl.pages));
  }

  for (const cat of categories) {
    if (cat.score >= 90 && cat.total > 0) {
      strengths.push({
        title: `${cat.label}: ${cat.score}/100`,
        detail: cat.summary,
      });
    } else if (cat.total > 0) {
      // Take the top issue (or pick one of a category's worst) as a teaser
      // for the "What's not" panel. Phase 18 will rank these properly.
      const worst = cat.issues
        .slice()
        .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];
      issues.push({
        title: `${cat.label}: ${cat.score}/100`,
        detail: worst
          ? `${cat.summary} Worst: ${worst.message}`
          : cat.summary,
        severity: cat.score < 60 ? 'high' : cat.score < 80 ? 'medium' : 'low',
      });
    }
  }

  const crawlSummary = crawl
    ? {
        crawled: crawl.pages.length,
        ok: crawl.pages.filter((p) => p.ok).length,
        errors: crawl.pages.filter((p) => !p.ok).length,
        skipped: crawl.skipped.length,
        trimmed: crawl.trimmed,
        totalMs: crawl.totalMs,
        avgFetchMs:
          crawl.pages.length > 0
            ? Math.round(
                crawl.pages.reduce((s, p) => s + p.fetchMs, 0) / crawl.pages.length,
              )
            : 0,
      }
    : null;

  const result = {
    origin,
    score: null as number | null,
    ranAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    sitemap,
    homepage: homepageSummary,
    crawl: crawlSummary,
    pages: [] as unknown[],
    categories,
    strengths,
    issues,
    notice:
      crawlSummary && crawlSummary.crawled > 0
        ? `Crawled ${crawlSummary.crawled} pages (${crawlSummary.ok} OK). Per-category audits + scoring land in phases 6–17.`
        : 'Crawl incomplete. Per-category audits + scoring land in phases 6–17.',
  };

  return NextResponse.json(result);
}
