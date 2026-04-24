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
