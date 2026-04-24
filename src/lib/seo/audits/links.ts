// Internal linking audit.
//
// Builds an inbound-link map from the crawl: for each crawled URL,
// count how many other crawled pages link to it. Then flag:
//   - "orphans": pages in the corpus with zero inbound internal links
//     (other than the page itself). Search engines find these only via
//     the sitemap — fine for niche pages, but a warning otherwise.
//   - low-link pages: < 3 inbound links from elsewhere in the site.
//   - per-page: pages with no outbound internal links at all.
//
// We normalize by stripping trailing slashes so /foo and /foo/ collapse.

import type { CrawledPage } from '../crawl';
import type { CategoryAudit, PageIssue } from './types';

function normalize(url: string, fallbackHost: string): string | null {
  try {
    const u = new URL(url, `https://${fallbackHost}`);
    let path = u.pathname;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return `${u.protocol}//${u.host}${path}`;
  } catch {
    return null;
  }
}

export function auditLinks(pages: CrawledPage[]): CategoryAudit {
  const subjects = pages.filter((p) => p.ok && p.html != null);
  const total = subjects.length;
  const issues: PageIssue[] = [];

  // Build the canonical key for every crawled page.
  const host = (() => {
    try {
      return new URL(subjects[0]?.finalUrl || subjects[0]?.url || 'https://example.com').host;
    } catch {
      return 'example.com';
    }
  })();
  const keyOf = (p: CrawledPage) => normalize(p.finalUrl || p.url, host) ?? p.url;
  const inbound = new Map<string, number>();
  for (const p of subjects) inbound.set(keyOf(p), 0);

  // Tally inbound counts (skip self-links).
  for (const p of subjects) {
    const self = keyOf(p);
    const seen = new Set<string>();
    for (const link of p.links) {
      if (!link.internal) continue;
      const target = normalize(link.href, host);
      if (!target || target === self) continue;
      if (seen.has(target)) continue; // count once per (source, target)
      seen.add(target);
      if (inbound.has(target)) {
        inbound.set(target, (inbound.get(target) ?? 0) + 1);
      }
    }
  }

  let passed = 0;
  for (const p of subjects) {
    let pageOk = true;
    const inCount = inbound.get(keyOf(p)) ?? 0;

    if (inCount === 0) {
      issues.push({
        url: p.url,
        severity: 'medium',
        message:
          'Orphan page — no other crawled page links to it. Add it to a hub page or main nav.',
      });
      pageOk = false;
    } else if (inCount < 3) {
      issues.push({
        url: p.url,
        severity: 'low',
        message: `Only ${inCount} inbound internal link${inCount === 1 ? '' : 's'} — boost discoverability with hub-page links.`,
      });
      pageOk = false;
    }

    if (p.internalLinkCount === 0) {
      issues.push({
        url: p.url,
        severity: 'medium',
        message: 'Page has no outbound internal links — dead-end for crawlers and users.',
      });
      pageOk = false;
    }

    if (pageOk) passed += 1;
  }

  const score = total === 0 ? 0 : Math.round((passed / total) * 100);

  return {
    id: 'links',
    label: 'Internal linking',
    score,
    weight: 8,
    passed,
    total,
    summary:
      total === 0
        ? 'No pages crawled to audit.'
        : `${passed} of ${total} pages have ≥3 inbound internal links and at least one outbound.`,
    issues,
  };
}
