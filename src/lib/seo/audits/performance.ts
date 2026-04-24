// Performance audit using PageSpeed Insights data.
//
// Score is the average of the mobile + desktop performance scores.
// Per-metric thresholds (from web.dev "good" Core Web Vitals targets):
//   LCP <= 2500ms
//   CLS <= 0.1
//   TBT <= 200ms
// Anything worse becomes a per-page issue with the metric value.

import type { PsiSnapshot } from '../psi';
import type { CategoryAudit, PageIssue } from './types';

export interface PerformanceInput {
  url: string;
  mobile: PsiSnapshot | null;
  desktop: PsiSnapshot | null;
  /** True when no PSI fetch was attempted (e.g. PAGESPEED_API_KEY unset). */
  skipped?: boolean;
}

export function auditPerformance(input: PerformanceInput): CategoryAudit {
  const issues: PageIssue[] = [];
  if (input.skipped) {
    return {
      id: 'performance',
      label: 'Performance (Core Web Vitals)',
      score: 0,
      weight: 0,
      passed: 0,
      total: 0,
      summary:
        'Skipped — set PAGESPEED_API_KEY to enable Core Web Vitals scoring (mobile + desktop).',
      issues,
    };
  }

  const mobileOk = input.mobile?.ok && typeof input.mobile.performance === 'number';
  const desktopOk = input.desktop?.ok && typeof input.desktop.performance === 'number';
  const scores: number[] = [];
  if (mobileOk && input.mobile) scores.push(input.mobile.performance!);
  if (desktopOk && input.desktop) scores.push(input.desktop.performance!);

  if (scores.length === 0) {
    issues.push({
      url: input.url,
      severity: 'medium',
      message: `PageSpeed Insights call failed: ${input.mobile?.error ?? input.desktop?.error ?? 'unknown'}`,
    });
    return {
      id: 'performance',
      label: 'Performance (Core Web Vitals)',
      score: 0,
      weight: 14,
      passed: 0,
      total: 1,
      summary: 'PageSpeed Insights returned no usable data.',
      issues,
    };
  }

  const score = Math.round(scores.reduce((s, n) => s + n, 0) / scores.length);

  for (const snap of [input.mobile, input.desktop]) {
    if (!snap || !snap.ok) continue;
    const tag = snap.strategy.toUpperCase();
    if (snap.metrics.lcp != null && snap.metrics.lcp > 2_500) {
      issues.push({
        url: input.url,
        severity: snap.metrics.lcp > 4_000 ? 'high' : 'medium',
        message: `${tag} LCP is ${snap.metrics.lcp}ms (target ≤ 2500ms).`,
      });
    }
    if (snap.metrics.cls != null && snap.metrics.cls > 0.1) {
      issues.push({
        url: input.url,
        severity: snap.metrics.cls > 0.25 ? 'high' : 'medium',
        message: `${tag} CLS is ${snap.metrics.cls} (target ≤ 0.1).`,
      });
    }
    if (snap.metrics.tbt != null && snap.metrics.tbt > 200) {
      issues.push({
        url: input.url,
        severity: snap.metrics.tbt > 600 ? 'high' : 'medium',
        message: `${tag} TBT is ${snap.metrics.tbt}ms (target ≤ 200ms).`,
      });
    }
  }

  return {
    id: 'performance',
    label: 'Performance (Core Web Vitals)',
    score,
    weight: 14,
    passed: scores.length === 2 ? 2 : 1,
    total: 2,
    summary: `PSI homepage score: ${score}/100 (avg of ${
      mobileOk ? `mobile ${input.mobile!.performance}` : '—'
    } / ${desktopOk ? `desktop ${input.desktop!.performance}` : '—'}).`,
    issues,
  };
}
