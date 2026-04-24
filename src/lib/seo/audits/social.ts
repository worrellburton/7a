// Open Graph + Twitter card audit.
//
// Required OG: og:title, og:description, og:image, og:url, og:type.
// Required Twitter: twitter:card. Recommended Twitter: twitter:title,
// twitter:description, twitter:image (which can fall back to og:* in
// most clients but is safer to set explicitly).

import type { CrawledPage } from '../crawl';
import type { CategoryAudit, PageIssue } from './types';

const OG_REQUIRED = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
const TW_REQUIRED = ['twitter:card'];

export function auditSocial(pages: CrawledPage[]): CategoryAudit {
  const subjects = pages.filter((p) => p.ok && p.html != null);
  const total = subjects.length;
  const issues: PageIssue[] = [];

  let passed = 0;
  for (const p of subjects) {
    let pageOk = true;

    const missingOg = OG_REQUIRED.filter((k) => !(k in p.openGraph) || !p.openGraph[k]);
    const missingTw = TW_REQUIRED.filter((k) => !(k in p.twitter) || !p.twitter[k]);

    if (missingOg.length === OG_REQUIRED.length) {
      issues.push({
        url: p.url,
        severity: 'medium',
        message: 'No Open Graph tags — link previews on Facebook / LinkedIn / Slack will be poor.',
      });
      pageOk = false;
    } else if (missingOg.length > 0) {
      issues.push({
        url: p.url,
        severity: 'low',
        message: `Missing OG tags: ${missingOg.join(', ')}.`,
      });
      pageOk = false;
    }

    if (missingTw.length > 0) {
      issues.push({
        url: p.url,
        severity: 'low',
        message: `Missing Twitter card meta: ${missingTw.join(', ')}.`,
      });
      pageOk = false;
    }

    // og:image should be an absolute URL for crawlers that don't resolve
    // relatives (most do, but it's a long-standing best practice).
    const ogImage = p.openGraph['og:image'];
    if (ogImage && !/^https?:\/\//i.test(ogImage)) {
      issues.push({
        url: p.url,
        severity: 'low',
        message: `og:image is relative (${ogImage}); use an absolute URL.`,
      });
      pageOk = false;
    }

    if (pageOk) passed += 1;
  }

  const score = total === 0 ? 0 : Math.round((passed / total) * 100);

  return {
    id: 'social',
    label: 'Open Graph / Twitter',
    score,
    weight: 6,
    passed,
    total,
    summary:
      total === 0
        ? 'No pages crawled to audit.'
        : `${passed} of ${total} pages have a complete OG + Twitter card set for share previews.`,
    issues,
  };
}
