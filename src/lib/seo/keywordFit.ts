// Compute how well a live page targets a given keyword.
//
// Signals, weighted:
//   H1 exact match      — 40 pts
//   H1 contains all words — 25 pts  (falls back if no exact match)
//   Title tag match     — 20/12 pts (same exact-vs-contains tiering)
//   URL slug words      — 12 pts (all words appear as slug chunks)
//   Any H2 contains all — 10 pts
//   Meta description    — 8 pts
//   Body contains 3x+   — 5 pts (capped; prevents keyword stuffing padding)
//
// Max per-page score = ~100. We return the highest-scoring page across
// the crawl as the site's "current fit" for that keyword.
//
// Tokenisation is intentionally loose: we lowercase + strip punctuation,
// split on whitespace, drop stop words, and require every remaining
// token to be present. "drug rehab arizona" and "rehab in arizona" both
// score the same against a page whose copy says "our Arizona drug
// rehab program" — that is what an SEO lead would expect.

import type { CrawledPage } from './crawl';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or',
  'is', 'are', 'with', 'by', 'from',
]);

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function tokens(s: string): string[] {
  return normalise(s).split(' ').filter((t) => t && !STOP_WORDS.has(t));
}

function allWordsPresent(haystack: string, words: string[]): boolean {
  if (words.length === 0) return false;
  const h = normalise(haystack);
  return words.every((w) => h.includes(w));
}

function exactPhraseMatch(haystack: string, phrase: string): boolean {
  return normalise(haystack).includes(normalise(phrase));
}

function countOccurrences(haystack: string, phrase: string): number {
  const h = normalise(haystack);
  const p = normalise(phrase);
  if (!p) return 0;
  let count = 0;
  let idx = 0;
  while (true) {
    const found = h.indexOf(p, idx);
    if (found < 0) break;
    count += 1;
    idx = found + p.length;
  }
  return count;
}

function urlSlugWords(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.replace(/\//g, ' ').replace(/-/g, ' ');
  } catch {
    return url.replace(/\//g, ' ').replace(/-/g, ' ');
  }
}

export interface FitBreakdown {
  h1_points: number;
  title_points: number;
  h2_points: number;
  url_points: number;
  meta_points: number;
  body_points: number;
  matched: {
    h1_exact: boolean;
    h1_contains: boolean;
    title_exact: boolean;
    title_contains: boolean;
    h2_hit: string | null;
    url_hit: boolean;
    meta_hit: boolean;
    body_occurrences: number;
  };
}

export interface PageFit {
  url: string;
  score: number;
  breakdown: FitBreakdown;
  h1: string | null;
  title: string | null;
}

export interface KeywordFit {
  keyword_id: string;
  keyword_text: string;
  score: number;
  bucket: FitBucket;
  best_url: string | null;
  best_h1: string | null;
  best_title: string | null;
  breakdown: FitBreakdown | null;
  pages_checked: number;
}

export type FitBucket = 'strong' | 'good' | 'partial' | 'weak' | 'none';

export function bucketFor(score: number): FitBucket {
  if (score >= 80) return 'strong';
  if (score >= 60) return 'good';
  if (score >= 40) return 'partial';
  if (score >= 20) return 'weak';
  return 'none';
}

function scorePageForKeyword(page: CrawledPage, keyword: string): PageFit {
  const phraseWords = tokens(keyword);
  const breakdown: FitBreakdown = {
    h1_points: 0, title_points: 0, h2_points: 0,
    url_points: 0, meta_points: 0, body_points: 0,
    matched: {
      h1_exact: false, h1_contains: false,
      title_exact: false, title_contains: false,
      h2_hit: null, url_hit: false, meta_hit: false,
      body_occurrences: 0,
    },
  };

  const h1s = page.h1 ?? [];
  for (const h of h1s) {
    if (exactPhraseMatch(h, keyword)) {
      breakdown.h1_points = 40;
      breakdown.matched.h1_exact = true;
      break;
    }
    if (allWordsPresent(h, phraseWords)) {
      breakdown.h1_points = Math.max(breakdown.h1_points, 25);
      breakdown.matched.h1_contains = true;
    }
  }

  if (page.title) {
    if (exactPhraseMatch(page.title, keyword)) {
      breakdown.title_points = 20;
      breakdown.matched.title_exact = true;
    } else if (allWordsPresent(page.title, phraseWords)) {
      breakdown.title_points = 12;
      breakdown.matched.title_contains = true;
    }
  }

  const slug = urlSlugWords(page.finalUrl || page.url);
  if (allWordsPresent(slug, phraseWords)) {
    breakdown.url_points = 12;
    breakdown.matched.url_hit = true;
  }

  for (const h of page.h2 ?? []) {
    if (allWordsPresent(h, phraseWords)) {
      breakdown.h2_points = 10;
      breakdown.matched.h2_hit = h.slice(0, 120);
      break;
    }
  }

  if (page.metaDescription && allWordsPresent(page.metaDescription, phraseWords)) {
    breakdown.meta_points = 8;
    breakdown.matched.meta_hit = true;
  }

  if (page.html) {
    const stripped = page.html.replace(/<[^>]+>/g, ' ');
    const occurrences = countOccurrences(stripped, keyword);
    breakdown.matched.body_occurrences = occurrences;
    if (occurrences >= 3) breakdown.body_points = 5;
    else if (occurrences >= 1) breakdown.body_points = 3;
  }

  const score =
    breakdown.h1_points +
    breakdown.title_points +
    breakdown.h2_points +
    breakdown.url_points +
    breakdown.meta_points +
    breakdown.body_points;

  return {
    url: page.finalUrl || page.url,
    score,
    breakdown,
    h1: h1s[0] ?? null,
    title: page.title,
  };
}

export interface FitSuggestion {
  /** Short heading the modal shows as the suggestion title. */
  title: string;
  /** One-sentence action the admin can take. */
  detail: string;
  /** Point value this suggestion would unlock (0 if already claimed). */
  points: number;
  /** True when the keyword already earns this signal's points. */
  done: boolean;
  /** Signal bucket for grouping / icon selection in the UI. */
  signal: 'h1' | 'title' | 'url' | 'h2' | 'meta' | 'body';
}

export interface SuggestionInput {
  keyword_text: string;
  breakdown: FitBreakdown | null;
  best_url: string | null;
  best_h1: string | null;
  best_title: string | null;
}

/**
 * Turn a stored fit breakdown into an ordered list of concrete
 * suggestions the admin can action. Every signal surfaces exactly one
 * row: either a "done" checkmark with the points you've already
 * banked, or an un-done row showing the points you'd gain by fixing
 * it. The list is sorted by potential-gain desc so the biggest wins
 * sit at the top of the modal.
 */
export interface PromptInput {
  keyword_text: string;
  score: number;
  bucket: FitBucket;
  breakdown: FitBreakdown | null;
  best_url: string | null;
  best_h1: string | null;
  best_title: string | null;
  suggestions: FitSuggestion[];
}

/**
 * Given a marketing URL on the public site, guess the Next.js file
 * path the admin will need to edit. The convention here is the
 * (site) route group under src/app — all public pages live under
 * src/app/(site)/<pathname>/page.tsx. This is a hint, not a
 * guarantee: dynamic routes and redirects can still put the real
 * page elsewhere, so the generated prompt asks Claude to confirm.
 */
function filePathHint(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\//, '').replace(/\/$/, '');
    if (!path) return 'src/app/(site)/page.tsx';
    return `src/app/(site)/${path}/page.tsx`;
  } catch {
    return null;
  }
}

/**
 * Produce a Claude Code prompt that, pasted into a `claude code`
 * session in this repo, walks the assistant through the exact
 * changes needed to move the keyword's fit score to 100. Includes
 * the current signal breakdown, the un-done actions with their
 * point values, a file-path hint, project conventions, and
 * acceptance criteria.
 */
export function buildClaudeCodePrompt(input: PromptInput): string {
  const { keyword_text, score, bucket, breakdown, best_url, best_h1, best_title, suggestions } = input;
  const gap = Math.max(0, 100 - score);
  const undone = suggestions.filter((s) => !s.done);
  const done = suggestions.filter((s) => s.done);
  const guess = filePathHint(best_url);

  const lines: string[] = [];
  lines.push(`Raise the SEO "Current fit" score to 100 for the keyword "${keyword_text}".`);
  lines.push('');
  lines.push(`Current score: ${score}/100 (${bucket}). Gap to 100: ${gap} pts.`);
  lines.push('');
  lines.push('## Target page');
  if (best_url) {
    lines.push(`- URL: ${best_url}`);
  } else {
    lines.push(`- URL: (none — no page on the site currently scores for this keyword; pick the most topically relevant page or create a new one)`);
  }
  if (guess) lines.push(`- Likely file: \`${guess}\` (confirm — dynamic routes and route groups can move it)`);
  if (best_h1) lines.push(`- Current H1: "${best_h1}"`);
  if (best_title) lines.push(`- Current <title>: "${best_title}"`);
  lines.push('');

  lines.push('## Signal scoreboard (earned / max)');
  if (breakdown) {
    lines.push(`- H1 heading:      ${breakdown.h1_points}/40`);
    lines.push(`- Title tag:       ${breakdown.title_points}/20`);
    lines.push(`- URL slug:        ${breakdown.url_points}/12`);
    lines.push(`- H2 heading:      ${breakdown.h2_points}/10`);
    lines.push(`- Meta description:${breakdown.meta_points}/8`);
    lines.push(`- Body mentions:   ${breakdown.body_points}/5`);
  } else {
    lines.push('- No scan data yet; run `Scan site fit` from /app/seo first if you can.');
  }
  lines.push('');

  if (undone.length > 0) {
    lines.push('## Changes to make (biggest wins first)');
    undone.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.title} (+${s.points} pts) — ${s.detail}`);
    });
    lines.push('');
  } else {
    lines.push('## Changes to make');
    lines.push('- Every signal is already at max. The score should already be 100; if it is not, re-run the fit scan.');
    lines.push('');
  }

  if (done.length > 0) {
    lines.push('## Already passing (do not break)');
    done.forEach((s) => {
      lines.push(`- ${s.title} (+${s.points} earned)`);
    });
    lines.push('');
  }

  lines.push('## Project conventions');
  lines.push('- This is a Next.js 16 App Router codebase. Public pages live under `src/app/(site)/**/page.tsx`.');
  lines.push('- The `<title>` and meta description are set via `export const metadata = { title, description }` at the top of each page.tsx (or its layout).');
  lines.push('- The H1 is the first `<h1>` in the page JSX. There should be exactly one.');
  lines.push('- Route paths map to folder names; to change the URL slug, rename the folder and let middleware/301 redirects catch the old URL (see `/app/seo/redirects`).');
  lines.push('- Run `npx tsc --noEmit` after edits to catch regressions.');
  lines.push('- Deploy workflow: commit on the current feature branch, merge into `main`, then into `master` (the live deploy branch). Never force-push.');
  lines.push('');

  lines.push('## Acceptance criteria');
  lines.push(`- Every signal in the breakdown scores at its maximum for keyword "${keyword_text}".`);
  lines.push('- Copy reads naturally — no keyword stuffing. Humans should not notice the phrase was added on purpose.');
  lines.push('- Existing page structure and design are preserved; only headings, meta, slug, and body text change.');
  lines.push('- After pushing, re-run `Scan site fit` at /app/seo to confirm the pill flips to STRONG (score ≥ 80, ideally 95+).');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Blog idea generator (Road to Recovery / Recovery Roadmap style)
// ---------------------------------------------------------------------------

export type BlogAngle =
  | 'what_happens'
  | 'decision_guide'
  | 'myths_vs_reality'
  | 'first_time'
  | 'who_its_for'
  | 'why_it_works';

export interface BlogIdea {
  angle: BlogAngle;
  title: string;
  subtitle: string;
  slug: string;
}

export type KeywordCategoryForIdeas =
  | 'location' | 'modality' | 'insurance' | 'substance' | 'brand' | 'decision';

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function titleCase(s: string): string {
  const small = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'with', 'by', 'from', 'as']);
  return s
    .split(/\s+/)
    .map((w, i) => (i > 0 && small.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/**
 * Four-idea Road to Recovery pack for a keyword. Angles are chosen
 * to match whichever category the keyword belongs to: decision
 * queries lean on step-by-step guides, modality queries lean on
 * "what actually happens", location queries lean on "why here",
 * substance queries lean on "first time" and "myths vs reality".
 *
 * All titles embed the keyword verbatim so the generated article
 * will naturally score the H1 / title / URL / body signals.
 */
export function ideasForKeyword(keyword_text: string, category?: KeywordCategoryForIdeas): BlogIdea[] {
  const kw = keyword_text.trim();
  const kwTitle = titleCase(kw);
  const cat = category ?? 'modality';

  const pool: Record<BlogAngle, BlogIdea> = {
    what_happens: {
      angle: 'what_happens',
      title: `What Actually Happens in ${kwTitle}`,
      subtitle: `The honest, minute-by-minute version of ${kw} — no marketing gloss.`,
      slug: toSlug(`what-actually-happens-in-${kw}`),
    },
    decision_guide: {
      angle: 'decision_guide',
      title: `Choosing ${kwTitle}: A Step-by-Step Honest Guide`,
      subtitle: `How to evaluate ${kw} without getting lost in brochures — a checklist you can actually use.`,
      slug: toSlug(`choosing-${kw}-guide`),
    },
    myths_vs_reality: {
      angle: 'myths_vs_reality',
      title: `${kwTitle}: Myths vs. Reality`,
      subtitle: `Five things people expect from ${kw}, and what really happens on day three, day seven, and month three.`,
      slug: toSlug(`${kw}-myths-vs-reality`),
    },
    first_time: {
      angle: 'first_time',
      title: `The First 72 Hours of ${kwTitle}`,
      subtitle: `What the first three days of ${kw} feel like — the fear, the body, the first breath that lands.`,
      slug: toSlug(`first-72-hours-${kw}`),
    },
    who_its_for: {
      angle: 'who_its_for',
      title: `Who ${kwTitle} Is Actually For`,
      subtitle: `Not everyone benefits the same way from ${kw}. Here is who does, who doesn't, and how to tell.`,
      slug: toSlug(`who-${kw}-is-for`),
    },
    why_it_works: {
      angle: 'why_it_works',
      title: `Why ${kwTitle} Works When Other Things Haven't`,
      subtitle: `The mechanisms behind ${kw} — the trauma science, the body response, the community piece.`,
      slug: toSlug(`why-${kw}-works`),
    },
  };

  // Per-category selection of four angles that fit best.
  const byCategory: Record<KeywordCategoryForIdeas, BlogAngle[]> = {
    location:  ['why_it_works', 'what_happens', 'decision_guide', 'who_its_for'],
    modality:  ['what_happens', 'why_it_works', 'who_its_for', 'myths_vs_reality'],
    insurance: ['decision_guide', 'what_happens', 'myths_vs_reality', 'who_its_for'],
    substance: ['first_time', 'myths_vs_reality', 'what_happens', 'who_its_for'],
    brand:     ['why_it_works', 'what_happens', 'first_time', 'decision_guide'],
    decision:  ['decision_guide', 'myths_vs_reality', 'what_happens', 'first_time'],
  };

  return byCategory[cat].map((a) => pool[a]);
}

export interface BlogPromptInput {
  keyword_text: string;
  idea: BlogIdea;
}

/**
 * A Claude Code prompt that, pasted into a `claude code` session in
 * this repo, produces a full Recovery Roadmap episode at
 * src/app/(site)/who-we-are/blog/<slug>/. The prompt embeds the
 * Road to Recovery voice (second person, trauma-informed, warm,
 * ~1,800 words, H2-driven) plus the Next.js conventions the
 * episode needs to land in the route tree.
 */
export function buildBlogCreationPrompt({ keyword_text, idea }: BlogPromptInput): string {
  const lines: string[] = [];
  lines.push(`Write a new Recovery Roadmap blog episode targeting the SEO keyword "${keyword_text}".`);
  lines.push('');
  lines.push('## Article');
  lines.push(`- Title: ${idea.title}`);
  lines.push(`- Subtitle / hook: ${idea.subtitle}`);
  lines.push(`- Slug: ${idea.slug}`);
  lines.push(`- Target keyword (must appear in H1, <title>, URL slug, meta description, and 3+ times in body): "${keyword_text}"`);
  lines.push('');
  lines.push('## Where it lives');
  lines.push(`- Create the route folder: \`src/app/(site)/who-we-are/blog/${idea.slug}/\``);
  lines.push('- Add two files in that folder:');
  lines.push('  - `page.tsx`: server component, exports \`metadata\` with title + description (both containing the keyword), renders a `<Content />` client component.');
  lines.push('  - `content.tsx`: \'use client\' component with the actual article JSX.');
  lines.push('- Add the new episode to the hub at `/home/user/7a/src/app/(site)/who-we-are/recovery-roadmap/page.tsx` as an episode card (copy the existing card pattern: kicker "Episode N — The Recovery Roadmap", title, 1-sentence description, "Read Episode" link pointing to the new slug).');
  lines.push('');
  lines.push('## Voice and format (Road to Recovery house style)');
  lines.push('- Second person, conversational, trauma-informed, evidence-based, warm. Not clinical, not marketing, no clickbait.');
  lines.push('- Open with a vulnerable human scenario that the reader recognises ("If you\'re reading this, there\'s a good chance …").');
  lines.push('- Build the narrative: personal hook → context / data → honest specifics → empowerment.');
  lines.push('- H2-driven sections (no numbered list of sections). ~6–9 H2 blocks total.');
  lines.push('- Signature framing phrases are fine: "the real, human version", "not your fault, but what you do next is within your power", "the truth, told with compassion".');
  lines.push('- Target ~1,800 words of body copy. Short paragraphs. No filler.');
  lines.push('- Where it helps, include one or two simple animated / interactive elements from the existing pattern library (intersection-observer reveals, a small SVG diagram, a checklist). Match the style of the two existing episodes.');
  lines.push('- Close with a direct call to action to `/admissions` or `/contact` — warm, not sales-y.');
  lines.push('');
  lines.push('## Reference episodes to match style');
  lines.push('- `src/app/(site)/who-we-are/blog/when-drinking-stops-working/` (page.tsx + content.tsx)');
  lines.push('- `src/app/(site)/who-we-are/blog/what-happens-first-week/` (page.tsx + content.tsx)');
  lines.push('Skim both before drafting; copy their hero + metadata patterns verbatim, then replace the content.');
  lines.push('');
  lines.push('## Acceptance criteria');
  lines.push(`- The finished episode's "Current fit" score for "${keyword_text}" reaches 100 on a re-scan at /app/seo.`);
  lines.push('- The episode card appears on `/who-we-are/recovery-roadmap` with the correct kicker number, title, and link.');
  lines.push('- `npx tsc --noEmit` is clean.');
  lines.push('- Copy reads naturally to a human. The target keyword is present but not stuffed.');
  lines.push('- Deploy workflow: commit on the current feature branch, merge to `main`, then merge `main` into `master` (the live deploy branch). Push each.');
  return lines.join('\n');
}

export function suggestionsForFit(input: SuggestionInput): FitSuggestion[] {
  const { keyword_text, breakdown } = input;
  const q = `"${keyword_text}"`;
  const out: FitSuggestion[] = [];

  // H1 — 40 pts
  if (!breakdown || breakdown.matched.h1_exact) {
    out.push({
      title: breakdown?.matched.h1_exact ? 'H1 nails it' : 'Add H1 exact match',
      detail: breakdown?.matched.h1_exact
        ? `An H1 on-site already reads exactly "${input.best_h1 ?? keyword_text}". Keep it.`
        : `Publish a page whose H1 is exactly ${q}. That single line is worth the most SEO weight on the page.`,
      points: breakdown?.matched.h1_exact ? 40 : 40,
      done: !!breakdown?.matched.h1_exact,
      signal: 'h1',
    });
  } else if (breakdown.matched.h1_contains) {
    out.push({
      title: 'Tighten H1 to exact phrase',
      detail: `Your best H1 contains every word of ${q} but not as a phrase. Rewriting it to include ${q} contiguously unlocks +15 pts.`,
      points: 15,
      done: false,
      signal: 'h1',
    });
  } else {
    out.push({
      title: 'Add H1 exact match',
      detail: `No H1 across the site matches ${q}. Put it at the top of a relevant page as the sole H1 — +40 pts.`,
      points: 40,
      done: false,
      signal: 'h1',
    });
  }

  // Title tag — 20 pts
  if (!breakdown) {
    out.push({ title: 'Add to <title> tag', detail: `Put ${q} inside the page <title>.`, points: 20, done: false, signal: 'title' });
  } else if (breakdown.matched.title_exact) {
    out.push({ title: 'Title tag matches', detail: `Page <title> contains ${q} as a phrase.`, points: 20, done: true, signal: 'title' });
  } else if (breakdown.matched.title_contains) {
    out.push({
      title: 'Tighten title to exact phrase',
      detail: `Title contains the words of ${q} but not as a phrase. Rewrite to include ${q} contiguously — +8 pts.`,
      points: 8,
      done: false,
      signal: 'title',
    });
  } else {
    out.push({
      title: 'Add to <title> tag',
      detail: `Page <title> has no match for ${q}. Edit the title tag (the one that shows in the browser tab + Google results) to include ${q} — +20 pts.`,
      points: 20,
      done: false,
      signal: 'title',
    });
  }

  // URL slug — 12 pts
  if (!breakdown) {
    out.push({ title: 'Use in URL slug', detail: `Slugify ${q} in the path.`, points: 12, done: false, signal: 'url' });
  } else if (breakdown.matched.url_hit) {
    out.push({ title: 'URL slug matches', detail: `The best page's slug contains all words of ${q}.`, points: 12, done: true, signal: 'url' });
  } else {
    out.push({
      title: 'Use in URL slug',
      detail: `Add ${q} to the page URL — e.g. /${keyword_text.toLowerCase().replace(/\s+/g, '-')}. +12 pts.`,
      points: 12,
      done: false,
      signal: 'url',
    });
  }

  // H2 — 10 pts
  if (!breakdown) {
    out.push({ title: 'Add a supporting H2', detail: `Include ${q} in at least one H2 heading.`, points: 10, done: false, signal: 'h2' });
  } else if (breakdown.matched.h2_hit) {
    out.push({ title: 'H2 supports the keyword', detail: `An H2 on the best page contains ${q}.`, points: 10, done: true, signal: 'h2' });
  } else {
    out.push({
      title: 'Add a supporting H2',
      detail: `No H2 on the best page contains the phrase. Add one sub-head that uses ${q} to reinforce topical focus — +10 pts.`,
      points: 10,
      done: false,
      signal: 'h2',
    });
  }

  // Meta description — 8 pts
  if (!breakdown) {
    out.push({ title: 'Work into meta description', detail: `Mention ${q} in the 150–160 char meta description.`, points: 8, done: false, signal: 'meta' });
  } else if (breakdown.matched.meta_hit) {
    out.push({ title: 'Meta description hits', detail: `Meta description contains ${q}.`, points: 8, done: true, signal: 'meta' });
  } else {
    out.push({
      title: 'Work into meta description',
      detail: `Meta description on the best page doesn't mention ${q}. Rewrite the 150–160 char snippet to include it naturally — +8 pts.`,
      points: 8,
      done: false,
      signal: 'meta',
    });
  }

  // Body — up to 5 pts
  const occ = breakdown?.matched.body_occurrences ?? 0;
  if (occ >= 3) {
    out.push({ title: 'Body mentions look good', detail: `${q} appears ${occ} times in body copy.`, points: 5, done: true, signal: 'body' });
  } else if (occ >= 1) {
    out.push({
      title: 'Bump body mentions to 3+',
      detail: `${q} appears ${occ === 1 ? '1 time' : `${occ} times`} in body copy. Work it in a couple more times naturally to earn the full +5 — currently +3.`,
      points: 2,
      done: false,
      signal: 'body',
    });
  } else {
    out.push({
      title: 'Mention in body copy',
      detail: `Body copy never says ${q}. Use it 3+ times naturally — +5 pts.`,
      points: 5,
      done: false,
      signal: 'body',
    });
  }

  return out.sort((a, b) => {
    // Un-done first, then by point value desc.
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.points - a.points;
  });
}

export interface FitForKeywordArgs {
  keyword_id: string;
  keyword_text: string;
  pages: CrawledPage[];
}

export function fitForKeyword({ keyword_id, keyword_text, pages }: FitForKeywordArgs): KeywordFit {
  let best: PageFit | null = null;
  let checked = 0;
  for (const p of pages) {
    if (!p.ok || p.status >= 400) continue;
    checked += 1;
    const pf = scorePageForKeyword(p, keyword_text);
    if (!best || pf.score > best.score) best = pf;
  }
  const score = best?.score ?? 0;
  return {
    keyword_id,
    keyword_text,
    score,
    bucket: bucketFor(score),
    best_url: best?.url ?? null,
    best_h1: best?.h1 ?? null,
    best_title: best?.title ?? null,
    breakdown: best?.breakdown ?? null,
    pages_checked: checked,
  };
}
