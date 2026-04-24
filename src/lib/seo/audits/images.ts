// Image alt-text coverage audit.
//
// Per-page coverage threshold: at least 90% of <img> elements must have
// a non-empty alt attribute. (Empty alt is allowed for purely
// decorative images, but at the page level we expect almost everything
// to be labeled.)
//
// Site-level: also flag any image with width / height attributes
// missing — those help Core Web Vitals (CLS) but are softer.

import type { CrawledPage } from '../crawl';
import type { CategoryAudit, PageIssue } from './types';

const COVERAGE_THRESHOLD = 0.9;

export function auditImages(pages: CrawledPage[]): CategoryAudit {
  const subjects = pages.filter((p) => p.ok && p.html != null);
  const total = subjects.length;
  const issues: PageIssue[] = [];

  let passed = 0;
  for (const p of subjects) {
    if (p.imageCount === 0) {
      // No images = trivially passing.
      passed += 1;
      continue;
    }

    const coverage = (p.imageCount - p.imagesMissingAlt) / p.imageCount;
    let pageOk = true;
    if (coverage < COVERAGE_THRESHOLD) {
      const pct = Math.round(coverage * 100);
      issues.push({
        url: p.url,
        severity: pct < 50 ? 'high' : 'medium',
        message: `Only ${pct}% of images have alt text (${p.imagesMissingAlt} of ${p.imageCount} missing).`,
      });
      pageOk = false;
    }

    // Soft warning: a meaningful share of images without width/height
    // hurts CLS. Only flag pages where >50% are missing dimensions.
    const noDims = p.images.filter((i) => !i.width || !i.height).length;
    if (p.imageCount >= 4 && noDims / p.imageCount > 0.5) {
      issues.push({
        url: p.url,
        severity: 'low',
        message: `${noDims} of ${p.imageCount} images missing width/height (hurts CLS).`,
      });
      // Do not flip pageOk — this is a soft signal.
    }

    if (pageOk) passed += 1;
  }

  const score = total === 0 ? 0 : Math.round((passed / total) * 100);

  return {
    id: 'images',
    label: 'Image alt text',
    score,
    weight: 8,
    passed,
    total,
    summary:
      total === 0
        ? 'No pages crawled to audit.'
        : `${passed} of ${total} pages have ≥${Math.round(COVERAGE_THRESHOLD * 100)}% alt-text coverage.`,
    issues,
  };
}
