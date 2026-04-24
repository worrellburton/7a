// HTTP status / redirect / response-time audit.
//
// Checks per page (using the data the runner already collected):
//   - status === 200 OK
//   - HTTPS scheme
//   - meta robots doesn't block indexing on a sitemap-listed page
//   - response time within budget (< 1500ms is the soft target Google
//     uses for "fast"; < 3000ms is the hard ceiling beyond which UX
//     starts to suffer noticeably)
//
// Redirects from input URL -> finalUrl are tolerated (followed
// transparently by fetch), but if the sitemap lists a redirecting URL
// it's a low-severity hint that the sitemap should be updated.

import type { CrawledPage } from '../crawl';
import type { CategoryAudit, PageIssue } from './types';

const FAST_BUDGET_MS = 1_500;
const SLOW_BUDGET_MS = 3_000;

export function auditHttp(pages: CrawledPage[]): CategoryAudit {
  // Don't filter by .ok — we want to score the bad ones too.
  const subjects = pages;
  const total = subjects.length;
  const issues: PageIssue[] = [];

  let passed = 0;
  for (const p of subjects) {
    let pageOk = true;

    if (p.error) {
      issues.push({
        url: p.url,
        severity: 'high',
        message: `Fetch error: ${p.error}.`,
      });
      pageOk = false;
    } else if (p.status === 0) {
      issues.push({
        url: p.url,
        severity: 'high',
        message: 'No HTTP response captured.',
      });
      pageOk = false;
    } else if (p.status >= 500) {
      issues.push({
        url: p.url,
        severity: 'high',
        message: `Server error HTTP ${p.status}.`,
      });
      pageOk = false;
    } else if (p.status >= 400) {
      issues.push({
        url: p.url,
        severity: 'high',
        message: `Client error HTTP ${p.status}.`,
      });
      pageOk = false;
    } else if (p.status >= 300) {
      issues.push({
        url: p.url,
        severity: 'medium',
        message: `Unfollowed redirect HTTP ${p.status}.`,
      });
      pageOk = false;
    } else if (p.redirected) {
      issues.push({
        url: p.url,
        severity: 'low',
        message: `Sitemap URL redirects to ${p.finalUrl}. Update the sitemap to the canonical URL.`,
      });
      // Soft signal — don't flip pageOk.
    }

    if (p.url.startsWith('http://')) {
      issues.push({
        url: p.url,
        severity: 'high',
        message: 'URL uses http:// — must be https://.',
      });
      pageOk = false;
    }

    if (p.metaRobots && /noindex/i.test(p.metaRobots)) {
      issues.push({
        url: p.url,
        severity: 'high',
        message: 'meta robots="noindex" on a sitemap page (will be removed from search).',
      });
      pageOk = false;
    }

    if (p.fetchMs > SLOW_BUDGET_MS) {
      issues.push({
        url: p.url,
        severity: 'medium',
        message: `Slow response (${p.fetchMs}ms; target < ${SLOW_BUDGET_MS}ms).`,
      });
      pageOk = false;
    } else if (p.fetchMs > FAST_BUDGET_MS) {
      issues.push({
        url: p.url,
        severity: 'low',
        message: `Response is ${p.fetchMs}ms (fast target < ${FAST_BUDGET_MS}ms).`,
      });
      // Soft signal — don't flip pageOk for a borderline page.
    }

    if (pageOk) passed += 1;
  }

  const score = total === 0 ? 0 : Math.round((passed / total) * 100);

  return {
    id: 'http',
    label: 'HTTP / response',
    score,
    weight: 14,
    passed,
    total,
    summary:
      total === 0
        ? 'No pages crawled to audit.'
        : `${passed} of ${total} pages return 200 OK over https within the response-time budget.`,
    issues,
  };
}
