import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { discoverSitemap } from '@/lib/seo/sitemap';
import { crawlPage, type CrawledPage } from '@/lib/seo/crawl';
import { crawlAll } from '@/lib/seo/runner';
import { auditTitles } from '@/lib/seo/audits/title';
import { auditMetaDescriptions } from '@/lib/seo/audits/meta';
import { auditHeadings } from '@/lib/seo/audits/headings';
import { auditCanonicals } from '@/lib/seo/audits/canonical';
import { auditSocial } from '@/lib/seo/audits/social';
import { auditSchema } from '@/lib/seo/audits/schema';
import { auditImages } from '@/lib/seo/audits/images';
import { auditLinks } from '@/lib/seo/audits/links';
import { fetchRobots, type RobotsTxt } from '@/lib/seo/robots';
import { auditCrawlability } from '@/lib/seo/audits/crawlability';
import { auditHttp } from '@/lib/seo/audits/http';
import { runPsi, hasPsiKey, type PsiSnapshot } from '@/lib/seo/psi';
import { auditPerformance } from '@/lib/seo/audits/performance';
import { aggregate } from '@/lib/seo/score';
import { buildInsights } from '@/lib/seo/insights';
import { buildPrompt } from '@/lib/seo/prompt';
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
// 300s (Vercel Pro cap) covers the homepage crawl + full-sitemap walk
// + parallel PSI (mobile + desktop) even on a site with 500+ URLs. At
// concurrency 10 and ~500ms avg fetch, 500 pages ≈ 25s; PSI adds ~30s.
// Under PSI-off it usually finishes in 15-40s.
export const maxDuration = 300;

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
    crawl = await crawlAll(urlsToCrawl, { maxPages: 1000, concurrency: 10 });
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
        detail: `Audit currently caps at 1000 pages; ${crawl.trimmed} URLs were not crawled this run. Raise the cap in src/lib/seo/runner.ts if the site has grown beyond that.`,
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
    categories.push(auditHeadings(crawl.pages));
    categories.push(auditCanonicals(crawl.pages));
    categories.push(auditSocial(crawl.pages));
    categories.push(auditSchema(crawl.pages));
    categories.push(auditImages(crawl.pages));
    categories.push(auditLinks(crawl.pages));
    categories.push(auditHttp(crawl.pages));
  }

  // Crawlability: robots.txt + sitemap.xml health check.
  let robots: RobotsTxt | null = null;
  try {
    robots = await fetchRobots(origin);
  } catch (err) {
    issues.push({
      title: 'robots.txt fetch threw',
      detail: err instanceof Error ? err.message : String(err),
      severity: 'medium',
    });
  }
  // Performance via PSI. Each call takes 10-25s, so we ONLY hit the
  // homepage and only when PAGESPEED_API_KEY is set (otherwise the
  // shared quota will throttle and burn audit time). Mobile + desktop
  // run in parallel.
  let psiMobile: PsiSnapshot | null = null;
  let psiDesktop: PsiSnapshot | null = null;
  const psiSkipped = !hasPsiKey();
  if (!psiSkipped) {
    try {
      [psiMobile, psiDesktop] = await Promise.all([
        runPsi(origin, 'mobile'),
        runPsi(origin, 'desktop'),
      ]);
    } catch (err) {
      issues.push({
        title: 'PageSpeed Insights threw',
        detail: err instanceof Error ? err.message : String(err),
        severity: 'low',
      });
    }
  }
  categories.push(
    auditPerformance({
      url: origin,
      mobile: psiMobile,
      desktop: psiDesktop,
      skipped: psiSkipped,
    }),
  );

  if (robots) {
    categories.push(
      auditCrawlability({
        origin,
        robots,
        sitemap: sitemap
          ? {
              url: sitemap.url,
              type: sitemap.type,
              count: sitemap.count,
              warnings: sitemap.warnings,
            }
          : null,
      }),
    );
  }

  // Phase 18: collapse + rank category audits into Strengths /
  // Weaknesses panels. Sitemap / homepage / runtime issues raised
  // earlier in the route stay in the legacy `strengths` / `issues`
  // arrays for backwards compatibility, while the new fields drive
  // the panels.
  const insights = buildInsights(categories);

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

  const agg = aggregate(categories);

  const result = {
    origin,
    score: agg.score,
    grade: agg.band,
    headline: agg.headline,
    effectiveWeight: agg.effectiveWeight,
    ranAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    sitemap,
    homepage: homepageSummary,
    crawl: crawlSummary,
    pages: [] as unknown[],
    categories,
    insights,
    prompt: buildPrompt({
      origin,
      score: agg.score,
      grade: agg.band,
      headline: agg.headline,
      categories,
      insights,
    }),
    strengths,
    issues,
    notice:
      crawlSummary && crawlSummary.crawled > 0
        ? `Crawled ${crawlSummary.crawled} pages (${crawlSummary.ok} OK). Per-category audits + scoring land in phases 6–17.`
        : 'Crawl incomplete. Per-category audits + scoring land in phases 6–17.',
  };

  // Persist this run to public.seo_audits for history + shared durability.
  // Non-fatal: if the table isn't reachable or the write fails, we still
  // return the computed result to the user. The admin client bypasses RLS.
  try {
    const admin = getAdminSupabase();
    const { error: insertErr } = await admin.from('seo_audits').insert({
      origin,
      score: agg.score,
      grade: agg.band,
      payload: result,
      duration_ms: result.durationMs,
      ran_by: user.id,
    });
    if (insertErr) {
      console.warn('[seo-audit] persist failed, returning anyway', insertErr.message);
    }
  } catch (err) {
    console.warn(
      '[seo-audit] persist threw, returning anyway',
      err instanceof Error ? err.message : String(err),
    );
  }

  return NextResponse.json(result);
}
