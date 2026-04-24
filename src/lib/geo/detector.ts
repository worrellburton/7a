// Mention detector.
//
// Given an EngineAnswer, decide whether Seven Arrows Recovery was
// mentioned in the answer text, whether any seven-arrows URL was
// cited, what position that citation held (first cites score higher),
// and which competitor brands showed up instead. Phase 10 turns these
// signals into a per-prompt visibility score.
//
// Both the answer text and citation titles are searched for brand
// mentions — citation titles often contain the business name when the
// page itself is about the brand.

import type { EngineAnswer, EngineId } from './engines/types';

const BRAND_ALIASES = [
  'seven arrows recovery',
  'sevenarrowsrecovery',
  'seven arrows az',
  'seven arrows arizona',
  'seven arrows',
];

const BRAND_DOMAINS = [
  'sevenarrowsrecoveryarizona.com',
  'sevenarrowsrecovery.com',
];

export interface MentionResult {
  engine: EngineId;
  promptId: string;
  prompt: string;
  ok: boolean;
  /** Engine returned an answer (vs. errored). */
  answered: boolean;
  /** Brand name appeared in the answer text or a citation title. */
  brandMentioned: boolean;
  /** Number of distinct brand mentions across answer + citation titles. */
  brandMentionCount: number;
  /** At least one brand-domain URL appeared in the citations array. */
  brandCited: boolean;
  /** 0-based position of the first brand citation, or null if not cited. */
  brandCitationPosition: number | null;
  /** Total citations returned by the engine. */
  totalCitations: number;
  /** Competitor brand names mentioned in the answer text. */
  competitorsMentioned: string[];
  /** Competitor brands cited (matched loosely by name appearing in the
   *  citation title — domain matching is hard because each competitor
   *  has many URLs). */
  competitorsCited: string[];
  /** Verbatim for UI + persistence. */
  answer: string;
  citations: { url: string; title: string | null; position: number }[];
  warnings: string[];
  error: string | null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countMatches(text: string, needle: string): number {
  if (!text || !needle) return 0;
  const re = new RegExp(`\\b${escapeRegExp(needle)}\\b`, 'gi');
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function isBrandUrl(url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return BRAND_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

function firstBrandMatch(text: string): boolean {
  for (const alias of BRAND_ALIASES) {
    if (countMatches(text, alias) > 0) return true;
  }
  return false;
}

function totalBrandCount(text: string): number {
  // Take the max across aliases rather than summing — "Seven Arrows
  // Recovery" also contains "Seven Arrows", so summing double-counts.
  let max = 0;
  for (const alias of BRAND_ALIASES) {
    const n = countMatches(text, alias);
    if (n > max) max = n;
  }
  return max;
}

export function detectMentions(
  answer: EngineAnswer,
  options: { competitors: string[] },
): MentionResult {
  const result: MentionResult = {
    engine: answer.engine,
    promptId: answer.promptId,
    prompt: answer.prompt,
    ok: answer.ok && !answer.error,
    answered: answer.ok,
    brandMentioned: false,
    brandMentionCount: 0,
    brandCited: false,
    brandCitationPosition: null,
    totalCitations: answer.citations.length,
    competitorsMentioned: [],
    competitorsCited: [],
    answer: answer.answer,
    citations: answer.citations,
    warnings: answer.warnings,
    error: answer.error,
  };

  // Brand mentions across answer text + citation titles.
  const titleBag = answer.citations
    .map((c) => c.title ?? '')
    .join(' \n ');
  const haystack = `${answer.answer}\n${titleBag}`;
  result.brandMentioned = firstBrandMatch(haystack);
  result.brandMentionCount = totalBrandCount(haystack);

  // Brand citation — domain match wins over title match, but either
  // counts as "cited".
  for (let i = 0; i < answer.citations.length; i += 1) {
    const c = answer.citations[i];
    if (isBrandUrl(c.url)) {
      result.brandCited = true;
      if (result.brandCitationPosition == null) {
        result.brandCitationPosition = i;
      }
      break;
    }
  }
  // Fallback: if the domain check didn't land but the title mentions
  // the brand, count it as a soft citation (and take position from the
  // first matching citation).
  if (!result.brandCited) {
    for (let i = 0; i < answer.citations.length; i += 1) {
      const c = answer.citations[i];
      if (c.title && firstBrandMatch(c.title)) {
        result.brandCited = true;
        result.brandCitationPosition = i;
        break;
      }
    }
  }

  // Competitors — mention means the brand name shows up in the answer
  // text; cited means it shows up in a citation title (cheap proxy
  // without needing to hardcode every competitor's domain).
  const mentioned = new Set<string>();
  const cited = new Set<string>();
  for (const comp of options.competitors) {
    if (!comp) continue;
    if (countMatches(answer.answer, comp) > 0) mentioned.add(comp);
    for (const c of answer.citations) {
      if (c.title && countMatches(c.title, comp) > 0) {
        cited.add(comp);
        break;
      }
    }
  }
  result.competitorsMentioned = Array.from(mentioned);
  result.competitorsCited = Array.from(cited);

  return result;
}
