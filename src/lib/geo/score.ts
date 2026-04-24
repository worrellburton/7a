// GEO score aggregator.
//
// Converts MentionResult[] into a weighted 0-100 score. The scoring
// philosophy (what we reward / penalize):
//
//   Per-prompt visibility (0-100):
//     ERROR / no answer              → 0
//     Answered, no SA presence       → 10  (absence is mild penalty)
//     Competitors cited but not us   → 0   (worst — we lost the answer)
//     Mentioned in text, not cited   → 40
//     Cited at position 6+           → 60
//     Cited at position 3-5          → 75
//     Cited at position 2            → 88
//     Cited at position 1            → 100
//     +5 for every repeat mention beyond the first (cap at +10)
//
//   Per-engine score:
//     Weighted average of per-prompt scores, weighted by prompt priority
//     (priority 1 = 3x, priority 2 = 2x, priority 3 = 1x).
//
//   Overall score:
//     Simple average of per-engine scores. Skipped engines don't count.
//
// This puts a hard ceiling on scores when competitors dominate our
// high-priority queries and rewards citation *position* since top cites
// drive clicks / UX much more than being mention #7.

import type { MentionResult } from './detector';
import type { EngineId } from './engines/types';
import type { GeoPrompt, PromptCategory } from './prompts';

const PRIORITY_WEIGHT: Record<1 | 2 | 3, number> = { 1: 3, 2: 2, 3: 1 };

export function promptVisibility(r: MentionResult): number {
  if (!r.answered || r.error) return 0;
  if (r.brandCited) {
    const pos = r.brandCitationPosition ?? 999;
    let base: number;
    if (pos === 0) base = 100;
    else if (pos === 1) base = 88;
    else if (pos <= 4) base = 75;
    else if (pos <= 9) base = 60;
    else base = 50;
    // Bonus for repeated mentions in the answer text.
    const bonus = Math.min(10, Math.max(0, r.brandMentionCount - 1) * 5);
    return Math.min(100, base + bonus);
  }
  if (r.brandMentioned) return 40;
  // Answered but no brand — harsher if competitors dominate.
  if (r.competitorsCited.length > 0) return 0;
  if (r.competitorsMentioned.length > 0) return 5;
  return 10;
}

export interface EngineScore {
  engine: EngineId;
  /** 0-100 weighted-average visibility across prompts. */
  score: number;
  /** Count of prompts evaluated. */
  total: number;
  /** Count where brand was cited. */
  cited: number;
  /** Count where brand was mentioned (in answer text). */
  mentioned: number;
  /** Count where we lost (competitor cited but we weren't). */
  lostToCompetitor: number;
  /** Count of hard errors. */
  errors: number;
}

export interface CategoryScore {
  category: PromptCategory;
  score: number;
  total: number;
  cited: number;
  mentioned: number;
}

export interface GeoScore {
  /** 0-100 overall visibility score. */
  score: number;
  grade: 'F' | 'D' | 'C' | 'B' | 'A' | 'A+';
  headline: string;
  engines: EngineScore[];
  categories: CategoryScore[];
  /** Competitor name -> how many answers they were cited in. */
  competitorCitations: { name: string; count: number }[];
  /** Prompts ranked by opportunity (worst-performing high-priority prompts first). */
  opportunityPrompts: {
    promptId: string;
    text: string;
    category: PromptCategory;
    priority: 1 | 2 | 3;
    /** Average visibility across engines for this prompt. */
    visibility: number;
    /** Impact weight = priority weight × (100 - visibility). */
    impact: number;
  }[];
  /** Prompts where we're dominating (avg visibility >= 80). */
  wins: {
    promptId: string;
    text: string;
    category: PromptCategory;
    priority: 1 | 2 | 3;
    visibility: number;
  }[];
}

function bandFor(score: number): GeoScore['grade'] {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function headlineFor(score: number, grade: string): string {
  if (score >= 85) return `Dominant (${grade}). AI answer engines cite us first on most tracked queries.`;
  if (score >= 70) return `Strong (${grade}). We show up consistently; a few high-priority queries need work.`;
  if (score >= 55) return `Mixed (${grade}). Cited on some engines, invisible on others — audit the gaps below.`;
  if (score >= 35) return `Weak (${grade}). Competitors dominate most answers. Focus on the highest-impact opportunities first.`;
  return `Invisible (${grade}). AI answer engines are directing prospects to competitors. This is the top priority.`;
}

export interface AggregateInput {
  results: MentionResult[];
  prompts: GeoPrompt[];
  engines: EngineId[];
}

export function aggregate(input: AggregateInput): GeoScore {
  const promptById = new Map(input.prompts.map((p) => [p.id, p]));

  // Per-engine weighted scores.
  const engineScores: EngineScore[] = [];
  for (const engine of input.engines) {
    const rows = input.results.filter((r) => r.engine === engine);
    let weighted = 0;
    let totalWeight = 0;
    let cited = 0;
    let mentioned = 0;
    let lost = 0;
    let errors = 0;
    for (const r of rows) {
      const prompt = promptById.get(r.promptId);
      const w = PRIORITY_WEIGHT[prompt?.priority ?? 3];
      weighted += promptVisibility(r) * w;
      totalWeight += w;
      if (r.brandCited) cited += 1;
      if (r.brandMentioned) mentioned += 1;
      if (!r.brandCited && !r.brandMentioned && r.competitorsCited.length > 0) lost += 1;
      if (r.error) errors += 1;
    }
    engineScores.push({
      engine,
      score: totalWeight === 0 ? 0 : Math.round(weighted / totalWeight),
      total: rows.length,
      cited,
      mentioned,
      lostToCompetitor: lost,
      errors,
    });
  }

  // Overall = simple mean of engine scores (engines weigh equally —
  // none of them is so much more influential than another that an
  // engine-level weight makes sense for an unfunded audit).
  const overall =
    engineScores.length === 0
      ? 0
      : Math.round(
          engineScores.reduce((s, e) => s + e.score, 0) / engineScores.length,
        );

  // Per-category rollup (average across all results in the category).
  const byCategory = new Map<PromptCategory, MentionResult[]>();
  for (const r of input.results) {
    const prompt = promptById.get(r.promptId);
    if (!prompt) continue;
    const bucket = byCategory.get(prompt.category) ?? [];
    bucket.push(r);
    byCategory.set(prompt.category, bucket);
  }
  const categoryScores: CategoryScore[] = [];
  for (const [cat, rows] of byCategory) {
    const visibilities = rows.map(promptVisibility);
    const avg =
      visibilities.length === 0
        ? 0
        : Math.round(visibilities.reduce((s, v) => s + v, 0) / visibilities.length);
    categoryScores.push({
      category: cat,
      score: avg,
      total: rows.length,
      cited: rows.filter((r) => r.brandCited).length,
      mentioned: rows.filter((r) => r.brandMentioned).length,
    });
  }

  // Prompts — average across engines so the opportunity view is
  // engine-agnostic.
  interface PromptAgg {
    prompt: GeoPrompt;
    visibility: number;
  }
  const promptAggs: PromptAgg[] = [];
  for (const prompt of input.prompts) {
    const rows = input.results.filter((r) => r.promptId === prompt.id);
    if (rows.length === 0) continue;
    const visibilities = rows.map(promptVisibility);
    const avg = visibilities.reduce((s, v) => s + v, 0) / visibilities.length;
    promptAggs.push({ prompt, visibility: Math.round(avg) });
  }

  const opportunityPrompts = promptAggs
    .map(({ prompt, visibility }) => ({
      promptId: prompt.id,
      text: prompt.text,
      category: prompt.category,
      priority: prompt.priority,
      visibility,
      impact: Math.round(PRIORITY_WEIGHT[prompt.priority] * (100 - visibility)),
    }))
    .filter((p) => p.visibility < 80)
    .sort((a, b) => b.impact - a.impact);

  const wins = promptAggs
    .filter(({ visibility }) => visibility >= 80)
    .map(({ prompt, visibility }) => ({
      promptId: prompt.id,
      text: prompt.text,
      category: prompt.category,
      priority: prompt.priority,
      visibility,
    }))
    .sort((a, b) => b.visibility - a.visibility);

  // Competitor rollup.
  const compMap = new Map<string, number>();
  for (const r of input.results) {
    for (const c of r.competitorsCited) {
      compMap.set(c, (compMap.get(c) ?? 0) + 1);
    }
  }
  const competitorCitations = Array.from(compMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const grade = bandFor(overall);
  return {
    score: overall,
    grade,
    headline: headlineFor(overall, grade),
    engines: engineScores,
    categories: categoryScores,
    competitorCitations,
    opportunityPrompts,
    wins,
  };
}
