// Meta description audit.
//
// Penalizes:
//  - missing description
//  - too short (< 70 chars) or too long (> 160 chars, where Google clips)
//  - duplicates across multiple pages

import type { CrawledPage } from '../crawl';
import type { CategoryAudit, PageIssue } from './types';

const MIN_LEN = 70;
const MAX_LEN = 160;

export function auditMetaDescriptions(pages: CrawledPage[]): CategoryAudit {
  const subjects = pages.filter((p) => p.ok && p.html != null);
  const total = subjects.length;
  const issues: PageIssue[] = [];

  const counts = new Map<string, number>();
  for (const p of subjects) {
    if (!p.metaDescription) continue;
    const key = p.metaDescription.trim().toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let passed = 0;
  for (const p of subjects) {
    const desc = p.metaDescription?.trim() ?? '';
    const len = desc.length;
    let pageOk = true;

    if (!desc) {
      issues.push({
        url: p.url,
        severity: 'high',
        message: 'Missing meta description.',
      });
      pageOk = false;
    } else {
      if (len < MIN_LEN) {
        issues.push({
          url: p.url,
          severity: 'medium',
          message: `Description is ${len} chars (recommend ${MIN_LEN}-${MAX_LEN}).`,
        });
        pageOk = false;
      } else if (len > MAX_LEN) {
        issues.push({
          url: p.url,
          severity: 'low',
          message: `Description is ${len} chars (recommend ${MIN_LEN}-${MAX_LEN}); Google may truncate.`,
        });
        pageOk = false;
      }
      const dup = counts.get(desc.toLowerCase()) ?? 0;
      if (dup > 1) {
        issues.push({
          url: p.url,
          severity: 'medium',
          message: `Description is duplicated on ${dup} pages.`,
        });
        pageOk = false;
      }
    }

    if (pageOk) passed += 1;
  }

  const score = total === 0 ? 0 : Math.round((passed / total) * 100);

  return {
    id: 'meta',
    label: 'Meta descriptions',
    score,
    weight: 10,
    passed,
    total,
    summary:
      total === 0
        ? 'No pages crawled to audit.'
        : `${passed} of ${total} pages have a clean meta description (${MIN_LEN}-${MAX_LEN} chars, unique).`,
    issues,
  };
}
