// Build a copy-pasteable Claude prompt that, given an audit, instructs
// a downstream agent to push the score to 100. The prompt embeds:
//   - the site origin
//   - current score + grade band + headline
//   - per-category scores
//   - EVERY weakness (no top-N truncation), with EVERY affected URL
//   - a per-category "Fix recipe" section with concrete, codebase-
//     specific instructions so an agent can execute without guessing
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
  /** No-op now — kept for signature compat; prompt always lists every weakness. */
  topN?: number;
}

export function buildPrompt(input: PromptInput): string {
  const cats = input.categories
    .filter((c) => c.weight > 0 && c.total > 0)
    .map((c) => `- **${c.label}** — ${c.score}/100 (weight ${c.weight}). ${c.summary}`)
    .join('\n');

  // Every weakness, in impact order. No truncation.
  const fixes = input.insights.weaknesses
    .map((w, i) => formatWeakness(w, i + 1))
    .join('\n\n');

  const strengths = input.insights.strengths
    .map((s) => `- **${s.title}** (${s.score}/100): ${s.detail}`)
    .join('\n');

  // Per-category fix recipes — only emit a section for categories
  // that actually have issues in this run.
  const presentCategoryIds = new Set(
    input.insights.weaknesses.map((w) => w.categoryId),
  );
  const recipes = CATEGORY_RECIPES.filter((r) => presentCategoryIds.has(r.id))
    .map((r) => `### ${r.label}\n\n${r.recipe}`)
    .join('\n\n');

  return `# SEO push to 100 — ${input.origin}

You're picking up the SEO audit for **${input.origin}**. Current state:

> **${input.score}/100 (${input.grade}).** ${input.headline}

Your job: take a focused pass at the issues below and push the audit score to **100/100**. Every issue listed here must be addressed — do not stop short or pick favorites. Recommendations come from a live crawl + structured-data + Core Web Vitals audit, ranked by impact.

## Category scoreboard

${cats || '_(no scored categories — audit was empty)_'}

## What's already strong (don't break these)

${strengths || '_(no categories above 90 yet — that’s the goal)_'}

## Fix recipes — how to resolve each category

${recipes || '_(no actionable categories)_'}

## Issues to fix — every one of these must land

Listed in descending impact. Every affected URL is enumerated under each issue; verify each, fix it, then move on. If a category has multiple issue groups, work them all.

${fixes || '_(no per-page issues found — the audit is clean)_'}

## Rules

1. **Verify before editing.** Open each affected URL and confirm the issue is real before changing anything.
2. **Fix every listed issue.** "100/100" means no remaining open weakness in this report. If you can't fix one, surface it explicitly with the reason — don't silently skip.
3. **Smallest change that fixes the issue.** Do not refactor surrounding code or rewrite components beyond what the audit calls out.
4. **Preserve the strengths above.** A regression in a 90+ category that drops it below 90 is worse than leaving a low-impact issue alone.
5. **One commit per category** when you finish all of that category's issues. Commit message: \`SEO: <category> -> 100\`.
6. **Re-run the audit** at \`/app/seo/audit\` after each commit and paste the new score in the next message.
7. **If a fix isn't possible from this codebase** (e.g. the marketing site is on a different platform / WordPress), say so explicitly and stop — do not invent file paths.

## Stop conditions

- The audit shows **score >= 100** (every category at or above 95) OR
- Three categories in a row are blocked by external constraints — in that case, summarize what's blocked and ask before continuing.
`;
}

function formatWeakness(w: IssueEntry, n: number): string {
  const head = `### ${n}. [${w.severity.toUpperCase()}] ${w.category} — ${w.message} (${w.count} page${w.count === 1 ? '' : 's'}, impact ${w.impact})`;
  // List every affected URL so the agent has the full set, not a
  // sample. `examples` is capped upstream at 100; if a single issue
  // group exceeds that, surface the overflow count explicitly.
  if (w.examples.length === 0) return head;
  const shown = w.examples.map((u) => `- ${u}`).join('\n');
  const overflow = w.count > w.examples.length
    ? `\n_(+ ${w.count - w.examples.length} more affected pages — re-run the audit after partial fixes to surface the rest.)_`
    : '';
  return `${head}\n\nAffected pages:\n${shown}${overflow}`;
}

interface CategoryRecipe {
  id: string;
  label: string;
  recipe: string;
}

// Each recipe is concrete enough that an agent can pattern-match it
// to the codebase. Site is Next.js App Router with metadata exports
// in src/app/(site)/**/page.tsx. Where a fix touches the public site
// only, say so. /app/* (the admin portal) is intentionally noindex
// and should not be hand-edited for SEO.
const CATEGORY_RECIPES: CategoryRecipe[] = [
  {
    id: 'title',
    label: 'Title tags',
    recipe: `Edit the \`metadata.title\` string in each affected page (\`src/app/(site)/**/page.tsx\`).

- Target length: 30-60 characters total (the prompt audit treats >60 as a low-severity "Google may truncate" hit).
- Keep titles unique across the corpus. Two pages with identical titles each take a duplicate-title penalty.
- Layout template (\`src/app/layout.tsx\`) is now \`'%s'\` — pages render the title verbatim. Don't add the brand twice; pages that want " | Seven Arrows Recovery" should include it directly in the page title string.
- For over-long titles, drop the redundant city repeats ("Drug Rehab in Phoenix AZ | Addiction Treatment Phoenix" → "Drug Rehab in Phoenix, AZ"); compress "Does X Cover Drug & Alcohol Rehab?" → "X Rehab Coverage".`,
  },
  {
    id: 'meta',
    label: 'Meta descriptions',
    recipe: `Edit the \`metadata.description\` string in each affected page.

- Target length: 70-160 characters. Anything outside that range fails this audit.
- Make each description specific to its page (no generic boilerplate). Mention the actual page topic + the call to action.
- For pages flagged at 162 chars, just trim to 160. For ones at 21 chars, expand to a real description that names the topic + CTA.`,
  },
  {
    id: 'canonical',
    label: 'Canonical URLs',
    recipe: `**Critical**: \`src/app/layout.tsx\` currently hardcodes \`<link rel="canonical" href="https://sevenarrowsrecoveryarizona.com" />\` in the \`<head>\`, so every page declares the homepage as canonical. Remove that single \`<link>\` tag.

Then make sure each page sets its own self-referencing canonical via the Next.js Metadata API:

\`\`\`ts
export const metadata: Metadata = {
  alternates: { canonical: 'https://sevenarrowsrecoveryarizona.com/<route>' },
  // ... rest of metadata
};
\`\`\`

Pages that already have \`alternates.canonical\` set are fine — leave them alone. The audit needs every page to have a canonical that matches its own URL exactly.`,
  },
  {
    id: 'social',
    label: 'Open Graph / Twitter',
    recipe: `Most pages inherit \`openGraph\` and \`twitter\` from \`src/app/layout.tsx\` but lose \`og:url\` because the root metadata doesn't set it (and Next.js can't auto-derive it without a per-page declaration).

For each affected page, set \`metadata.openGraph.url\` to that page's full https URL:

\`\`\`ts
export const metadata: Metadata = {
  openGraph: {
    url: 'https://sevenarrowsrecoveryarizona.com/<route>',
    // inherits the rest from root layout
  },
};
\`\`\`

Page-level openGraph shallow-merges over root's openGraph, so just supplying \`url\` is enough — the title/description/images cascade. Don't accidentally drop the existing root-level og fields.`,
  },
  {
    id: 'images',
    label: 'Image alt text',
    recipe: `Two flavors of fix in this category:

1. **Missing alt text** (high-severity). For each \`<img>\` or \`<Image>\` element on the affected pages, add a descriptive \`alt\` attribute. Decorative images can use \`alt=""\` plus \`aria-hidden="true"\` — but only if they're truly decorative; the audit counts an empty alt as covered.

2. **Missing width/height** (low-severity, hurts CLS). Every \`<img>\` needs explicit \`width\` and \`height\` attributes (or use Next.js \`<Image>\` which sets them automatically). For background-style images using \`<img>\` with object-cover, still set numeric width/height — the CSS sizing wins for layout but the attributes prevent CLS during load.`,
  },
  {
    id: 'links',
    label: 'Internal linking',
    recipe: `Each flagged page has fewer than 3 inbound internal links. Boost discoverability by adding contextual links from hub pages:

- Pages under \`/insurance/<carrier>\` should be linked from the \`/admissions\` page (insurance section), the homepage's insurance carousel, and any \`/treatment\` mention of payment.
- Pages under \`/our-program/*\` should be linked from \`/our-program\` (the index hub) and from \`/who-we-are\`.
- Pages under \`/treatment/*\` should be linked from \`/treatment\` (the index hub) and from the homepage's treatment section.

Look for existing list components rendering hub links (e.g. \`InsuranceCarousel\`, \`TreatmentServices\`, \`ProgramSection\`) and add the missing entry there. Each affected URL needs at least 3 inbound internal links and at least one outbound internal link of its own.`,
  },
  {
    id: 'headings',
    label: 'Heading hierarchy',
    recipe: `Every page needs exactly one \`<h1>\` and at least one \`<h2>\` sub-heading. Audit any flagged page for:

- Multiple \`<h1>\` tags — promote one and demote the rest to \`<h2>\`/\`<h3>\`.
- Zero \`<h2>\` tags — section headings should be \`<h2>\`, not \`<div className="text-xl font-bold">\`.
- Skipped levels (h1 → h3 with no h2 in between).`,
  },
  {
    id: 'schema',
    label: 'Structured data',
    recipe: `Each flagged page is missing the appropriate JSON-LD \`<script type="application/ld+json">\` block for its content type:

- Service pages → \`MedicalWebPage\` or \`Service\`
- FAQ pages → \`FAQPage\` (with a \`mainEntity\` array of \`Question\`/\`Answer\` pairs)
- Local-business / location pages → \`MedicalBusiness\` or \`LocalBusiness\`
- Articles / blog → \`Article\` with author + publishedTime

The codebase already has helpers in \`src/lib/seo/pageSchema.ts\` (\`faqPageSchema\`, \`medicalWebPageSchema\`, \`jsonLdScript\`) — reuse them.`,
  },
  {
    id: 'http',
    label: 'HTTP / response',
    recipe: `Two pages return non-200 — fix the underlying route or add a redirect:

- 404s typically mean the route was renamed or removed. Either restore the page, or add a 301 in \`next.config.mjs\` (or the redirects table) pointing to the new URL.
- 5xx means a runtime error — check the server logs for the page in question and fix the underlying bug.`,
  },
  {
    id: 'crawlability',
    label: 'Crawlability',
    recipe: `Verify that \`/robots.txt\` references the sitemap, the sitemap is reachable, and the sitemap lists every public URL. The codebase generates these dynamically in \`src/lib/seo/robots.ts\` and \`src/lib/seo/sitemap.ts\` — most failures here are stale build output, not source issues.`,
  },
  {
    id: 'performance',
    label: 'Performance (Core Web Vitals)',
    recipe: `If this category shows "skipped", set the \`PAGESPEED_API_KEY\` environment variable in Vercel and re-run the audit. With a key set, the runner pulls real LCP/CLS/INP values from PageSpeed Insights for both mobile + desktop.`,
  },
];
