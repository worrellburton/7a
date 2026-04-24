// Build a copy-pasteable Claude prompt that, given an audit, instructs
// a downstream agent to push the score to 100. The prompt embeds:
//   - the site origin
//   - current score + grade band + headline
//   - per-category scores
//   - top weaknesses ranked by impact, with example URLs
//   - rules / guardrails so the agent doesn't break things
//
// The output is plain Markdown so it pastes cleanly into Claude Code,
// claude.ai, or Slack.

import type { CategoryAudit } from './audits/types';
import type { AuditInsights, IssueEntry } from './insights';

export interface PromptInput {
  origin: string;
  score: number;
  grade: string;
  headline: string;
  categories: CategoryAudit[];
  insights: AuditInsights;
  /** Up to N weaknesses to inline (default 15). */
  topN?: number;
}

export function buildPrompt(input: PromptInput): string {
  const topN = input.topN ?? 15;
  const top = input.insights.weaknesses.slice(0, topN);
  const cats = input.categories
    .filter((c) => c.weight > 0 && c.total > 0)
    .map((c) => `- **${c.label}** — ${c.score}/100 (weight ${c.weight}). ${c.summary}`)
    .join('\n');

  const fixes = top
    .map((w, i) => formatWeakness(w, i + 1))
    .join('\n\n');

  const strengths = input.insights.strengths
    .map((s) => `- **${s.title}** (${s.score}/100): ${s.detail}`)
    .join('\n');

  return `# SEO push to 100 — ${input.origin}

You're picking up the SEO audit for **${input.origin}**. Current state:

> **${input.score}/100 (${input.grade}).** ${input.headline}

Your job: take a focused pass at the issues below and push the audit score to **100/100**. Do not pursue work that isn't on this list — every recommendation here came from a live crawl + structured-data + Core Web Vitals audit, ranked by impact.

## Category scoreboard

${cats || '_(no scored categories — audit was empty)_'}

## What's already strong (don't break these)

${strengths || '_(no categories above 90 yet — that’s the goal)_'}

## Issues to fix, ranked by impact

${fixes || '_(no per-page issues found — the audit is clean)_'}

## Rules

1. **Verify before editing.** Open each affected URL and confirm the issue is real before changing anything.
2. **Smallest change that fixes the issue.** Do not refactor surrounding code or rewrite components beyond what the audit calls out.
3. **Preserve the strengths above.** A regression in a 90+ category that drops it below 90 is worse than leaving a low-impact issue alone.
4. **One commit per category.** When you fix all issues in a category, commit with message \`SEO: <category> -> 100\`.
5. **Re-run the audit** at \`/app/seo/audit\` after each commit and paste the new score in the next message.
6. **If a fix isn't possible from this codebase** (e.g. the marketing site is on a different platform / WordPress), say so explicitly and stop — do not invent file paths.

## Stop conditions

- The audit shows **score >= 100** OR
- Three categories in a row are blocked by external constraints — in that case, summarize what's blocked and ask before continuing.
`;
}

function formatWeakness(w: IssueEntry, n: number): string {
  const head = `### ${n}. [${w.severity.toUpperCase()}] ${w.category} — ${w.message} (${w.count} page${w.count === 1 ? '' : 's'}, impact ${w.impact})`;
  const sample = w.examples.length > 0
    ? `\nAffected pages:\n${w.examples.map((u) => `- ${u}`).join('\n')}`
    : '';
  return `${head}${sample}`;
}
