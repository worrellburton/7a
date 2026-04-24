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
