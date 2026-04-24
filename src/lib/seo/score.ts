// Aggregate score across category audits.
//
// Each category provides its own 0-100 score and a relative weight.
// The aggregate is a weighted average. Categories with weight 0 are
// excluded (e.g. PSI when PAGESPEED_API_KEY isn't set), so the score
// isn't unfairly punished for missing optional integrations.

import type { CategoryAudit } from './audits/types';

export interface AggregateScore {
  /** Final 0-100 score. */
  score: number;
  /** Sum of weights actually counted (after excluding weight-0 cats). */
  effectiveWeight: number;
  /** Plain-English grade band. */
  band: 'F' | 'D' | 'C' | 'B' | 'A' | 'A+';
  /** Brief headline for the UI. */
  headline: string;
}

export function aggregate(categories: CategoryAudit[]): AggregateScore {
  let weighted = 0;
  let total = 0;
  for (const c of categories) {
    if (c.weight <= 0 || c.total === 0) continue;
    weighted += c.score * c.weight;
    total += c.weight;
  }
  const score = total === 0 ? 0 : Math.round(weighted / total);
  const band = bandFor(score);
  return {
    score,
    effectiveWeight: total,
    band,
    headline: headlineFor(score, band),
  };
}

function bandFor(score: number): AggregateScore['band'] {
  if (score >= 97) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function headlineFor(score: number, band: string): string {
  if (score >= 95) return `Outstanding (${band}). The site is in excellent SEO health.`;
  if (score >= 85) return `Strong (${band}). Tight up a handful of issues to push past 95.`;
  if (score >= 75) return `Solid (${band}). A focused sprint can move this to A.`;
  if (score >= 65) return `Average (${band}). Several categories need attention.`;
  if (score >= 50) return `Below par (${band}). Multiple high-impact issues to fix.`;
  return `Critical (${band}). Multiple categories failing — start with crawlability + HTTP.`;
}
