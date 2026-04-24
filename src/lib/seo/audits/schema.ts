// Schema / JSON-LD audit.
//
// We're a residential addiction treatment center. The high-value
// schema types here are:
//   - Organization or LocalBusiness or MedicalBusiness on the homepage
//     (treatment centers are MedicalBusiness)
//   - BreadcrumbList on internal pages
//   - FAQPage on the FAQ page (eligible for rich-result expansion)
//   - Article / BlogPosting on blog content
//
// Audit logic:
//   - Every page must have at least one valid JSON-LD block.
//   - Homepage must include an Organization-class type (Organization /
//     LocalBusiness / MedicalBusiness / MedicalOrganization).
//   - Pages with "faq" in their URL should include FAQPage.
//   - Pages with "/blog/" or "/post/" in their URL should include
//     Article or BlogPosting.

import type { CrawledPage } from '../crawl';
import type { CategoryAudit, PageIssue } from './types';

const ORG_TYPES = new Set([
  'Organization',
  'LocalBusiness',
  'MedicalBusiness',
  'MedicalOrganization',
  'MedicalClinic',
  'Hospital',
]);

function extractTypes(node: unknown, out: Set<string>): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) extractTypes(item, out);
    return;
  }
  if (typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  const t = obj['@type'];
  if (typeof t === 'string') {
    out.add(t);
  } else if (Array.isArray(t)) {
    for (const item of t) {
      if (typeof item === 'string') out.add(item);
    }
  }
  // Recurse into nested @graph and any object children.
  for (const v of Object.values(obj)) {
    if (typeof v === 'object' && v != null) extractTypes(v, out);
  }
}

function getTypes(blocks: unknown[]): Set<string> {
  const out = new Set<string>();
  for (const b of blocks) extractTypes(b, out);
  return out;
}

function isHomepage(p: CrawledPage): boolean {
  try {
    const u = new URL(p.finalUrl || p.url);
    return u.pathname === '/' || u.pathname === '';
  } catch {
    return false;
  }
}

export function auditSchema(pages: CrawledPage[]): CategoryAudit {
  const subjects = pages.filter((p) => p.ok && p.html != null);
  const total = subjects.length;
  const issues: PageIssue[] = [];

  let passed = 0;
  for (const p of subjects) {
    let pageOk = true;
    const types = getTypes(p.jsonLd);
    const path = (() => {
      try {
        return new URL(p.finalUrl || p.url).pathname.toLowerCase();
      } catch {
        return p.url.toLowerCase();
      }
    })();

    if (p.jsonLd.length === 0) {
      issues.push({
        url: p.url,
        severity: 'medium',
        message: 'No JSON-LD structured data on page.',
      });
      pageOk = false;
    }

    if (isHomepage(p)) {
      const hasOrg = Array.from(ORG_TYPES).some((t) => types.has(t));
      if (!hasOrg) {
        issues.push({
          url: p.url,
          severity: 'high',
          message:
            'Homepage missing Organization / LocalBusiness / MedicalBusiness schema (high-impact rich result).',
        });
        pageOk = false;
      }
    }

    if (path.includes('faq') && !types.has('FAQPage')) {
      issues.push({
        url: p.url,
        severity: 'medium',
        message: 'FAQ page missing FAQPage schema (eligible for rich-result expansion).',
      });
      pageOk = false;
    }

    if ((path.includes('/blog/') || path.includes('/post/')) &&
        !types.has('Article') && !types.has('BlogPosting') && !types.has('NewsArticle')) {
      issues.push({
        url: p.url,
        severity: 'medium',
        message: 'Blog / post page missing Article or BlogPosting schema.',
      });
      pageOk = false;
    }

    if (pageOk) passed += 1;
  }

  const score = total === 0 ? 0 : Math.round((passed / total) * 100);

  return {
    id: 'schema',
    label: 'Structured data',
    score,
    weight: 12,
    passed,
    total,
    summary:
      total === 0
        ? 'No pages crawled to audit.'
        : `${passed} of ${total} pages have appropriate JSON-LD structured data for their type.`,
    issues,
  };
}
