// Title tag audit.
//
// Penalizes:
//  - missing or empty <title>
//  - too short (< 30 chars) or too long (> 60 chars, where Google truncates)
//  - duplicate titles across multiple pages
//
// The score is the share of pages with a "good" title (present, in-range,
// unique), times 100.

import type { CrawledPage } from '../crawl';
import type { CategoryAudit, PageIssue } from './types';

const MIN_LEN = 30;
const MAX_LEN = 60;

export function auditTitles(pages: CrawledPage[]): CategoryAudit {
  // Only audit pages we actually loaded HTML for.
  const subjects = pages.filter((p) => p.ok && p.html != null);
  const total = subjects.length;
  const issues: PageIssue[] = [];

  // Track duplicate titles across the corpus.
  const titleCounts = new Map<string, number>();
  for (const p of subjects) {
    if (!p.title) continue;
    const key = p.title.trim().toLowerCase();
    titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
  }

  let passed = 0;
  for (const p of subjects) {
    const title = p.title?.trim() ?? '';
    const len = title.length;
    let pageOk = true;

    if (!title) {
      issues.push({ url: p.url, severity: 'high', message: 'Missing <title>.' });
      pageOk = false;
    } else {
      if (len < MIN_LEN) {
        issues.push({
          url: p.url,
          severity: 'medium',
          message: `Title is ${len} chars (recommend ${MIN_LEN}-${MAX_LEN}). Current: "${title}".`,
        });
        pageOk = false;
      } else if (len > MAX_LEN) {
        issues.push({
          url: p.url,
          severity: 'low',
          message: `Title is ${len} chars (recommend ${MIN_LEN}-${MAX_LEN}); Google may truncate. Current: "${title}".`,
        });
        pageOk = false;
      }
      const dupCount = titleCounts.get(title.toLowerCase()) ?? 0;
      if (dupCount > 1) {
        issues.push({
          url: p.url,
          severity: 'medium',
          message: `Title is duplicated on ${dupCount} pages: "${title}".`,
        });
        pageOk = false;
      }
    }

    if (pageOk) passed += 1;
  }

  const score = total === 0 ? 0 : Math.round((passed / total) * 100);

  return {
    id: 'title',
    label: 'Title tags',
    score,
    weight: 12,
    passed,
    total,
    summary:
      total === 0
        ? 'No pages crawled to audit.'
        : `${passed} of ${total} pages have a clean <title> (present, ${MIN_LEN}-${MAX_LEN} chars, unique).`,
    issues,
  };
}
