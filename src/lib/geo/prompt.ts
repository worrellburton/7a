// Build a paste-ready Claude prompt that turns a GEO audit into an
// actionable content + schema sprint. The downstream agent's job is
// NOT to ship code — it's to publish the pages, Q&A content, and
// schema tweaks that AI answer engines (ChatGPT, Perplexity, Claude,
// Google AIO) will actually cite. The live marketing site is WordPress
// (see project history), so most edits live in Rank Math + the WP
// editor, not this Next.js codebase.

import type { GeoScore } from './score';
import type { EngineId } from './engines/types';
import { CATEGORY_LABELS, type PromptCategory } from './prompts';

const ENGINE_LABELS: Record<EngineId, string> = {
  openai: 'ChatGPT',
  perplexity: 'Perplexity',
  claude: 'Claude',
  google_aio: 'Google AI Overviews',
};

export interface GeoPromptInput {
  site: string;
  score: GeoScore;
  /** Up to N opportunity prompts to inline (default 15). */
  topN?: number;
}

export function buildGeoPrompt(input: GeoPromptInput): string {
  const topN = input.topN ?? 15;
  const { score } = input;

  const engineLines = score.engines
    .slice()
    .sort((a, b) => b.score - a.score)
    .map(
      (e) =>
        `- **${ENGINE_LABELS[e.engine]}** — ${e.score}/100. ${e.cited}/${e.total} cited, ${e.mentioned}/${e.total} mentioned, ${e.lostToCompetitor} lost to competitor.`,
    )
    .join('\n');

  const categoryLines = score.categories
    .slice()
    .sort((a, b) => a.score - b.score)
    .map(
      (c) =>
        `- **${CATEGORY_LABELS[c.category]}** — ${c.score}/100 (${c.cited}/${c.total} cited).`,
    )
    .join('\n');

  const competitorLines = score.competitorCitations
    .slice(0, 8)
    .map((c) => `- ${c.name} — cited in ${c.count} answer${c.count === 1 ? '' : 's'}`)
    .join('\n');

  const opportunityLines = score.opportunityPrompts
    .slice(0, topN)
    .map((p, i) => {
      const head = `### ${i + 1}. P${p.priority} · ${CATEGORY_LABELS[p.category]} — ${p.text} (visibility ${p.visibility}, impact ${p.impact})`;
      return head;
    })
    .join('\n\n');

  const winLines = score.wins
    .slice(0, 8)
    .map((w) => `- **${w.text}** — visibility ${w.visibility}.`)
    .join('\n');

  return `# GEO push — improve AI-answer visibility for ${input.site}

You're picking up the Generative Engine Optimization (GEO) audit for **${input.site}**. Current state:

> **${score.score}/100 (${score.grade}).** ${score.headline}

Your job: publish and refine the content and signals that make AI answer engines (ChatGPT, Perplexity, Claude, Google AI Overviews) cite us — especially on the highest-impact prompts below. The live marketing site is WordPress + Rank Math; most fixes live in the WP editor / Rank Math settings, not in this Next.js admin repo.

## Engine scoreboard

${engineLines || '_(no engines ran)_'}

## Funnel-category scoreboard

${categoryLines || '_(no categories scored)_'}

## Competitors winning our queries

${competitorLines || '_(no competitor citations detected)_'}

## What's already working (protect these)

${winLines || '_(no prompts above 80 visibility yet — that’s the goal)_'}

## Highest-impact prompts to fix

Each prompt below shows a query the admissions funnel depends on where our current visibility is low. Impact = priority weight × (100 − visibility).

${opportunityLines || '_(nothing below the opportunity threshold — audit is clean)_'}

## Playbook

For each opportunity prompt, in priority order:

1. **Search the prompt in all four engines** and read what they cite today. The competitor pages that win will tell you the content shape the engines trust (list format? Q&A? table? long explainer?).
2. **Publish or improve a canonical page on ${input.site}** that answers that exact question, in the shape the engines reward:
   - Use the exact query as an H2 on the page (answer engines match on heading text).
   - Lead with a direct 40-80 word answer *immediately* under the heading — this is the chunk an AIO block will lift.
   - Follow with a structured breakdown (list, table, or labeled sub-sections).
   - Cite authoritative sources (SAMHSA, NIDA, ASAM, peer-reviewed journals) — engines prefer answers that chain to primary sources.
3. **Tighten on-page schema.** Organization + MedicalBusiness on the homepage is already in place (SEO audit is 100/100 on structured data). For each answer page, add **FAQPage** schema covering the query + 2-4 follow-ups, and **MedicalWebPage** schema with \`specialty\`, \`about\`, and \`audience\` fields. Both are in Rank Math's schema builder.
4. **Build topical authority around the insurance prompts.** Each accepted payer (Aetna, BCBS, Cigna, Tricare, UHC, Humana) should have a dedicated "/insurance/<payer>" page with a clear "yes, we accept" answer, typical out-of-pocket ranges, and a VOB form CTA. These answer questions that are highly extractive.
5. **Brand + modality moat.** For "equine therapy rehab", "rehabs with horses", and "trauma-informed rehab in Arizona", we should be the first citation — publish a long-form page per modality with Q&A-friendly sub-headings ("What does equine therapy treat?", "How long is an equine session?", etc.).
6. **Re-run the audit** at \`/app/geo/audit\` after each batch of pages ships and paste the new score in the next message. Expect a 2-4 week lag: engines need to crawl + ingest + re-index before citations shift.

## Rules

1. **Do not invent file paths in this repo.** The marketing site is WordPress — edits happen in the WP editor / Rank Math, not \`src/app\`. If you're tempted to edit a Next.js page file, stop and confirm with the user first.
2. **Smallest change that moves the query.** Don't rewrite entire pages when adding an H2 + answer paragraph would close the gap.
3. **Do not stuff keywords.** Engines penalize obvious SEO-bait. Write in the same register a thoughtful clinician would.
4. **Preserve wins.** Prompts listed under "What's already working" are citation-worthy today — any change to those pages should be additive.
5. **Publish authoritative sources.** Every factual claim should link to a primary source (SAMHSA, NIDA, ASAM, peer-reviewed journals) — engines treat these as trust signals.

## Stop conditions

- Overall score **>= 85** OR
- The five highest-impact prompts are all at visibility **>= 80** OR
- Three consecutive prompts are blocked by external constraints (e.g. an answer engine refuses to cite any rehab) — summarize and ask before continuing.
`;
}
