// Canonical URL audit.
//
// Penalizes:
//  - missing canonical
//  - canonical pointing at a different page than this one (suspicious;
//    common cause of accidental deindexing)
//  - canonical pointing at a non-https URL
//  - the same canonical reused on more than one page (cross-page collision
//    is fine in some templated cases — e.g. param-stripped — but worth a
//    low-severity flag for review)

import type { CrawledPage } from '../crawl';
import type { CategoryAudit, PageIssue } from './types';

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    // Drop trailing slash on the pathname (except root).
    let path = u.pathname;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return `${u.protocol}//${u.host}${path}${u.search}`;
  } catch {
    return raw.replace(/\/+$/, '');
  }
}

export function auditCanonicals(pages: CrawledPage[]): CategoryAudit {
  const subjects = pages.filter((p) => p.ok && p.html != null);
  const total = subjects.length;
  const issues: PageIssue[] = [];

  const canonCounts = new Map<string, number>();
  for (const p of subjects) {
    if (!p.canonical) continue;
    const key = normalizeUrl(p.canonical);
    canonCounts.set(key, (canonCounts.get(key) ?? 0) + 1);
  }

  let passed = 0;
  for (const p of subjects) {
    let pageOk = true;

    if (!p.canonical) {
      issues.push({
        url: p.url,
        severity: 'medium',
        message: 'Missing canonical link.',
      });
      pageOk = false;
    } else {
      const canon = p.canonical.trim();
      if (canon.startsWith('http://')) {
        issues.push({
          url: p.url,
          severity: 'medium',
          message: 'Canonical uses http:// (should be https://).',
        });
        pageOk = false;
      }

      const norm = normalizeUrl(canon);
      const self = normalizeUrl(p.finalUrl || p.url);
      if (norm !== self) {
        issues.push({
          url: p.url,
          severity: 'medium',
          message: `Canonical (${canon}) does not match page URL — confirm intentional.`,
        });
        pageOk = false;
      }

      const dup = canonCounts.get(norm) ?? 0;
      if (dup > 1) {
        issues.push({
          url: p.url,
          severity: 'low',
          message: `Canonical reused on ${dup} pages: ${canon}.`,
        });
        // Don't flip pageOk — duplicate canonicals can be legitimate
        // when consolidating param variants.
      }
    }

    if (pageOk) passed += 1;
  }

  const score = total === 0 ? 0 : Math.round((passed / total) * 100);

  return {
    id: 'canonical',
    label: 'Canonical URLs',
    score,
    weight: 8,
    passed,
    total,
    summary:
      total === 0
        ? 'No pages crawled to audit.'
        : `${passed} of ${total} pages have a self-referencing https canonical.`,
    issues,
  };
}
