// Convert raw category audits into ranked Strengths / Weaknesses for
// the audit page panels.
//
// Strength = a category scoring >= 90 with at least one passing page.
// Weakness = a per-page issue, ranked by impact = severity weight ×
//            category weight × (1 / (passed_share + 0.1)). That puts
//            high-severity issues from heavy categories on under-
//            performing audits at the top of the "What's not" list.
//
// We also collapse duplicate issue messages within a category so the
// list stays readable when, e.g., 60 pages are missing a meta
// description.

import type { CategoryAudit, PageIssue, Severity } from './audits/types';

export interface StrengthEntry {
  title: string;
  detail: string;
  categoryId: string;
  score: number;
}

export interface IssueEntry {
  /** Unique key for React. */
  key: string;
  categoryId: string;
  category: string;
  severity: Severity;
  message: string;
  /** How many pages this issue affects. */
  count: number;
  /** Up to 5 example URLs. */
  examples: string[];
  /** Computed impact score for sorting. Higher = worse. */
  impact: number;
}

export interface AuditInsights {
  strengths: StrengthEntry[];
  weaknesses: IssueEntry[];
}

const SEV_WEIGHT: Record<Severity, number> = { low: 1, medium: 3, high: 6 };

function buckets(issues: PageIssue[]): Map<string, { issues: PageIssue[] }> {
  const map = new Map<string, { issues: PageIssue[] }>();
  for (const i of issues) {
    // Collapse messages that differ only by length / current value.
    // The bucket key strips digits + quoted text so "Title is 75 chars"
    // and "Title is 80 chars" group together.
    const key = i.message
      .replace(/\d+/g, '#')
      .replace(/"[^"]*"/g, '"…"')
      .toLowerCase();
    const existing = map.get(key);
    if (existing) existing.issues.push(i);
    else map.set(key, { issues: [i] });
  }
  return map;
}

export function buildInsights(categories: CategoryAudit[]): AuditInsights {
  const strengths: StrengthEntry[] = [];
  const weaknesses: IssueEntry[] = [];

  for (const cat of categories) {
    if (cat.weight <= 0 || cat.total === 0) continue;

    if (cat.score >= 90 && cat.passed > 0) {
      strengths.push({
        title: cat.label,
        detail: cat.summary,
        categoryId: cat.id,
        score: cat.score,
      });
      // High-scoring category may still have a few issues, but we don't
      // want them dominating the weakness list — skip those.
      continue;
    }

    const passShare = cat.total === 0 ? 0 : cat.passed / cat.total;
    for (const [key, group] of buckets(cat.issues)) {
      const worst = group.issues.reduce<Severity>(
        (acc, i) => (SEV_WEIGHT[i.severity] > SEV_WEIGHT[acc] ? i.severity : acc),
        'low',
      );
      const impact =
        SEV_WEIGHT[worst] * cat.weight * (1 / (passShare + 0.1)) * Math.log2(group.issues.length + 1);
      // Use the first issue's verbatim message (with the count prefixed).
      const sample = group.issues[0];
      weaknesses.push({
        key: `${cat.id}:${key}`,
        categoryId: cat.id,
        category: cat.label,
        severity: worst,
        message: sample.message,
        count: group.issues.length,
        // Keep up to 100 URLs per issue group so the Claude prompt
        // can list every affected page and an agent can verify each
        // one. The original 5-cap was a UI display limit; the prompt
        // needs the full set to fix 100% of the errors.
        examples: group.issues.slice(0, 100).map((i) => i.url),
        impact: Math.round(impact * 100) / 100,
      });
    }
  }

  weaknesses.sort((a, b) => b.impact - a.impact);
  strengths.sort((a, b) => b.score - a.score);

  return { strengths, weaknesses };
}
