// Crawlability audit — robots.txt + sitemap.xml health.
//
// This audit doesn't fit the (pages) -> CategoryAudit signature the
// other category audits use, because it depends on the robots.txt fetch
// and the sitemap discovery from earlier in the pipeline. The API
// orchestrates fetches and hands them in.

import type { CategoryAudit, PageIssue } from './types';
import type { RobotsTxt } from '../robots';
import { isPathDisallowed } from '../robots';

export interface CrawlabilityInput {
  origin: string;
  robots: RobotsTxt;
  sitemap: { url: string; type: string; count: number; warnings: string[] } | null;
}

export function auditCrawlability(input: CrawlabilityInput): CategoryAudit {
  const issues: PageIssue[] = [];
  let pass = 0;
  let total = 0;

  // 1) robots.txt reachable
  total += 1;
  if (!input.robots.ok) {
    issues.push({
      url: input.robots.url,
      severity: 'high',
      message: `robots.txt failed to load (${input.robots.error ?? `HTTP ${input.robots.status}`}). Search engines fall back to default rules.`,
    });
  } else {
    pass += 1;
  }

  // 2) No global Disallow:/
  if (input.robots.ok) {
    total += 1;
    const blocksRoot = isPathDisallowed(input.robots, '/', '*');
    if (blocksRoot) {
      issues.push({
        url: input.robots.url,
        severity: 'high',
        message: 'robots.txt blocks the entire site for crawlers (Disallow: /). Site will not be indexed.',
      });
    } else {
      pass += 1;
    }
  }

  // 3) Sitemap directive present in robots.txt
  if (input.robots.ok) {
    total += 1;
    if (input.robots.sitemaps.length === 0) {
      issues.push({
        url: input.robots.url,
        severity: 'medium',
        message: 'robots.txt does not declare a Sitemap: directive — Google can discover one via Search Console, but this is the standard pointer.',
      });
    } else {
      pass += 1;
    }
  }

  // 4) Sitemap reachable + parseable + non-empty
  total += 1;
  if (!input.sitemap) {
    issues.push({
      url: `${input.origin}/sitemap.xml`,
      severity: 'high',
      message: 'No sitemap reachable at common locations.',
    });
  } else if (input.sitemap.count === 0) {
    issues.push({
      url: input.sitemap.url,
      severity: 'high',
      message: 'Sitemap parsed to 0 URLs.',
    });
  } else {
    pass += 1;
  }

  // 5) Sitemap warnings (non-fatal but worth surfacing)
  if (input.sitemap?.warnings && input.sitemap.warnings.length > 0) {
    for (const w of input.sitemap.warnings) {
      issues.push({
        url: input.sitemap.url,
        severity: 'low',
        message: `Sitemap warning: ${w}`,
      });
    }
  }

  const score = total === 0 ? 0 : Math.round((pass / total) * 100);

  return {
    id: 'crawlability',
    label: 'Crawlability',
    score,
    weight: 14,
    passed: pass,
    total,
    summary:
      total === 0
        ? 'No crawlability checks ran.'
        : `${pass} of ${total} crawlability checks pass (robots.txt, sitemap, and pointer between them).`,
    issues,
  };
}
