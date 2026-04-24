// Heading hierarchy audit.
//
// A page should have exactly one H1 (high-impact accessibility +
// crawler signal) and at least one H2 to organize content. Penalizes
// missing, multiple, or empty H1; very short H1 (< 10 chars) is a
// soft warning.

import type { CrawledPage } from '../crawl';
import type { CategoryAudit, PageIssue } from './types';

const H1_MIN_LEN = 10;

export function auditHeadings(pages: CrawledPage[]): CategoryAudit {
  const subjects = pages.filter((p) => p.ok && p.html != null);
  const total = subjects.length;
  const issues: PageIssue[] = [];

  let passed = 0;
  for (const p of subjects) {
    let pageOk = true;
    const h1s = p.h1.filter((h) => h.trim().length > 0);

    if (h1s.length === 0) {
      issues.push({ url: p.url, severity: 'high', message: 'No H1 on page.' });
      pageOk = false;
    } else if (h1s.length > 1) {
      issues.push({
        url: p.url,
        severity: 'medium',
        message: `${h1s.length} H1s on page (should be exactly 1). First: "${h1s[0]}".`,
      });
      pageOk = false;
    } else {
      const len = h1s[0].length;
      if (len < H1_MIN_LEN) {
        issues.push({
          url: p.url,
          severity: 'low',
          message: `H1 is short (${len} chars): "${h1s[0]}".`,
        });
        pageOk = false;
      }
    }

    if (p.h2.length === 0) {
      issues.push({
        url: p.url,
        severity: 'low',
        message: 'No H2s — content lacks structural sub-headings.',
      });
      pageOk = false;
    }

    if (pageOk) passed += 1;
  }

  const score = total === 0 ? 0 : Math.round((passed / total) * 100);

  return {
    id: 'headings',
    label: 'Heading hierarchy',
    score,
    weight: 8,
    passed,
    total,
    summary:
      total === 0
        ? 'No pages crawled to audit.'
        : `${passed} of ${total} pages have exactly one H1 plus H2 sub-headings.`,
    issues,
  };
}
