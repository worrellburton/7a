// Shared types for per-category SEO audits.
//
// Every audit takes the array of CrawledPages from the runner and
// returns a CategoryAudit. The aggregator (phase 17) combines these
// into a single 0-100 score using `weight`.

import type { CrawledPage } from '../crawl';

export type Severity = 'low' | 'medium' | 'high';

export interface PageIssue {
  url: string;
  severity: Severity;
  message: string;
}

export interface CategoryAudit {
  /** Stable identifier (e.g. "title", "meta", "headings"). */
  id: string;
  /** Human-readable name for the UI. */
  label: string;
  /** Score for this category, 0-100. */
  score: number;
  /** Weight in the aggregate score (relative; aggregator normalizes). */
  weight: number;
  /** How many pages passed this audit cleanly. */
  passed: number;
  /** Total pages considered. */
  total: number;
  /** One-line plain-English summary for headlines / digests. */
  summary: string;
  /** Per-page issues this audit raised. */
  issues: PageIssue[];
}

export type AuditFn = (pages: CrawledPage[]) => CategoryAudit;
