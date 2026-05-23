import type { SupabaseClient } from '@supabase/supabase-js';

// Kaizen scan generator. Calls Claude with a structured brief
// describing the two areas (Website, Feather) and the five
// categories per area, and asks it to return a JSON array of 10
// recommendations — five per area. Each recommendation includes a
// ready-to-paste copy_prompt that drops cleanly into Claude Code
// so the super admin can act on it in one click + paste.
//
// Required env: ANTHROPIC_API_KEY
// Optional env: ANTHROPIC_MODEL (defaults to claude-opus-4-7)

const DEFAULT_MODEL = 'claude-opus-4-7';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

export type KaizenArea = 'website' | 'feather';
export type KaizenCategory = 'features' | 'codebase' | 'growth' | 'ux' | 'performance' | 'design';
export type KaizenSeoGeo = 'none' | 'seo' | 'geo' | 'both';
export type KaizenTargetKind = 'existing' | 'new' | 'global';

export interface KaizenRecommendation {
  area: KaizenArea;
  category: KaizenCategory;
  seo_geo: KaizenSeoGeo;
  title: string;
  description: string;
  copy_prompt: string;
  /** 1 = critical → 5 = wishlist. */
  priority: number;
  /** 1 = safe → 5 = touches auth/billing/send pipeline. */
  risk_score: number;
  /** 1 = mostly cosmetic → 5 = step-change business value. */
  value_score: number;
  /** Where the change lands. */
  target_kind: KaizenTargetKind;
  /** Route path of the target page (empty when target_kind=global). */
  target_path: string | null;
  /** Optional human-friendly label for the target. */
  target_label: string | null;
  /** Self-contained HTML preview for design-category rows. */
  design_preview_html?: string | null;
}

const SYSTEM_PROMPT = `You are the senior product engineer for Seven Arrows Recovery, an addiction-treatment ranch in Arizona. You audit two codebases:

  · Website  — the public marketing site at sevenarrowsrecoveryarizona.com.
    Drives admissions inquiries from family + clinical referrers. SEO matters.
    Built on Next.js (App Router), Tailwind, Supabase.

  · Feather  — the internal CMS / CRM / admissions ops platform at /app.
    Used by the marketing, admissions, clinical, and ops teams. Maps to the
    same Next.js app under /app/app/*. ~60 internal surfaces.

Every day at 6 AM you run a kaizen scan: a short, opinionated list of
recommendations that, if shipped, would move the business forward. Your
output is action-ready — each recommendation lands on a super admin's
dashboard with a "copy" button that pastes copy_prompt into Claude Code to
implement the change.

You MUST return EXACTLY ten recommendations: five for Website and five for
Feather. Within each area's five, every recommendation should map to one of
the five categories below. Try to cover a mix of categories rather than
five of the same kind.

CATEGORIES (use these exact slugs in the JSON):
  features    — new functionality that doesn't exist yet
  codebase    — refactors, types, tests, monitoring, observability
  growth      — marketing tactics, conversion levers, copy, calls to action
  ux          — visual / interaction / accessibility / mobile polish
  performance — speed, bundle size, caching, Core Web Vitals
  design      — a SPECIFIC visual / layout / component design change.
                When you pick this category you MUST also fill the
                "design_preview_html" field (see below).

SEO_GEO TAG (use these exact slugs):
  none — not SEO-relevant and not geo-relevant
  seo  — improves search ranking or crawlability
  geo  — improves geographic visibility (local SEO, GBP, location pages, citations)
  both — does both

For each recommendation, write:
  · title         — under 80 chars, action-oriented, sentence case
  · description   — 2 to 4 sentences explaining what + why. No hedging,
                    no "consider", no "perhaps". State the recommendation
                    directly. Reference real file paths or surfaces where
                    relevant.
  · copy_prompt   — a self-contained prompt the super admin pastes into
                    Claude Code. Should read like a real ticket: what to
                    do, where to do it, what to verify before shipping.
                    Should NOT reference "you" or "I"; it's an instruction
                    addressed to a future engineer (Claude Code). Should
                    end with a single sentence telling Claude Code to ship
                    on the live deploy branch (master) once typecheck passes.

PRIORITY (impact / value):
  1 = critical (security, user-blocking bug, conversion-killer)
  2 = high (meaningful business / engineering win this quarter)
  3 = medium (a good day's work, worth doing soon)
  4 = nice to have
  5 = wishlist

VALUE_SCORE (business value if shipped, independent of priority):
  1 = mostly cosmetic — barely moves anything
  2 = nice to have
  3 = solid roll-of-the-dice
  4 = high — meaningful quarter-impacting win
  5 = step-change — new revenue lever, conversion unblock, or
      eliminates a recurring ops cost
A high VALUE_SCORE means shipping it produces a big return. The
dashboard will use VALUE_SCORE / RISK_SCORE to sort "biggest bang
for the buck" wins from "risky rewrites".

TARGET_KIND + TARGET_PATH + TARGET_LABEL (where the change lands):
  target_kind = "existing" — modifies a page or surface that
                exists today. Set target_path to the route
                (e.g. "/admissions", "/app/admissions/leads/[id]")
                and target_label to a 1-3 word friendly name
                (e.g. "Admissions hero", "Lead detail header").
  target_kind = "new" — introduces a brand-new page or surface.
                Set target_path to the route you propose
                (e.g. "/insurance/cost-calculator"). Label is
                still useful ("Insurance cost calculator").
  target_kind = "global" — cross-cutting change with no single
                target page (shared header, build config, lib
                refactor). Leave target_path null; label optional.

RISK_SCORE (likelihood of destabilising the site if shipped):
  1 = safe — pure UI tweak, no data path touched
  2 = low — additive feature, no migrations, no auth touched
  3 = moderate — touches an API route or adds a non-destructive migration
  4 = high — schema change with backfill, RLS rewrite, mutates existing rows
  5 = critical — auth flow, billing, send pipeline, payment, data destruction
You score risk separately from priority. A P1 critical conversion lever
can still be risk=1 if it's a copy tweak. A P5 wishlist refactor can be
risk=5 if it touches every API route.

DESIGN_PREVIEW_HTML (required ONLY when category='design', absent otherwise):
  A self-contained HTML snippet, 200 to 600 characters total. Renders
  inside a sandboxed iframe at 320px wide so the super admin can see
  a preview of the proposed change. Use inline styles only. Use the
  brand palette (sand #faf6f1, ink #2c1810, copper #b87333, sage
  #7a8b6f, desert dusk #2e2418). Body should be padding:16px and
  background:#faf6f1. No <html>/<head>/<body> wrappers — just the
  content. No <script>. No external assets. The preview should make
  the proposed visual choice obvious in two seconds.

OUTPUT FORMAT — return ONE JSON array of exactly 10 objects, no preamble,
no markdown fences, no extra text. Each object has the keys:

  { "area": "website"|"feather",
    "category": "...",
    "seo_geo": "...",
    "title": "...",
    "description": "...",
    "copy_prompt": "...",
    "priority": 1-5,
    "risk_score": 1-5,
    "value_score": 1-5,
    "target_kind": "existing"|"new"|"global",
    "target_path": "/admissions"|"/app/.../leads/[id]"|null,
    "target_label": "Admissions hero"|null,
    "design_preview_html": "..."  // only when category=design
  }

The first 5 elements are area=website, the next 5 are area=feather, in
that order. Within each area, vary the categories.

Never recommend the same change twice across scans (you can't know prior
history from inside one prompt, but vary the angle — focus on freshness).
Avoid generic platitudes like "improve accessibility" — be concrete:
"Add aria-current to active sidebar item so screen readers announce
location."`;

const USER_PROMPT = `Run today's kaizen scan. Return the JSON array of 10
recommendations as specified. Categories should vary within each area.`;

interface ClaudeResponse {
  content?: Array<{ type: string; text?: string }>;
}

function parseClaudeJson(raw: string): KaizenRecommendation[] | null {
  const trimmed = raw
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  // Try direct parse first.
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // Fall back to brace-balanced substring extraction.
    const start = trimmed.indexOf('[');
    const end = trimmed.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      parsed = JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed)) return null;
  const out: KaizenRecommendation[] = [];
  for (const r of parsed) {
    if (!r || typeof r !== 'object') continue;
    const rec = r as Record<string, unknown>;
    const area = rec.area === 'website' || rec.area === 'feather' ? (rec.area as KaizenArea) : null;
    const category = ['features', 'codebase', 'growth', 'ux', 'performance', 'design'].includes(rec.category as string)
      ? (rec.category as KaizenCategory)
      : null;
    const seo_geo = ['none', 'seo', 'geo', 'both'].includes(rec.seo_geo as string)
      ? (rec.seo_geo as KaizenSeoGeo)
      : 'none';
    const title = typeof rec.title === 'string' ? rec.title.trim() : '';
    const description = typeof rec.description === 'string' ? rec.description.trim() : '';
    const copy_prompt = typeof rec.copy_prompt === 'string' ? rec.copy_prompt.trim() : '';
    const priorityRaw = typeof rec.priority === 'number' ? rec.priority : Number(rec.priority);
    const priority = Number.isFinite(priorityRaw) && priorityRaw >= 1 && priorityRaw <= 5 ? Math.round(priorityRaw) : 3;
    const riskRaw = typeof rec.risk_score === 'number' ? rec.risk_score : Number(rec.risk_score);
    const risk_score = Number.isFinite(riskRaw) && riskRaw >= 1 && riskRaw <= 5 ? Math.round(riskRaw) : 2;
    const valueRaw = typeof rec.value_score === 'number' ? rec.value_score : Number(rec.value_score);
    const value_score = Number.isFinite(valueRaw) && valueRaw >= 1 && valueRaw <= 5 ? Math.round(valueRaw) : 3;
    const target_kind: KaizenTargetKind = (['existing', 'new', 'global'].includes(rec.target_kind as string)
      ? (rec.target_kind as KaizenTargetKind)
      : 'global');
    const target_path = typeof rec.target_path === 'string' && rec.target_path.trim() ? rec.target_path.trim().slice(0, 200) : null;
    const target_label = typeof rec.target_label === 'string' && rec.target_label.trim() ? rec.target_label.trim().slice(0, 80) : null;
    const previewRaw = typeof rec.design_preview_html === 'string' ? rec.design_preview_html.trim() : '';
    const design_preview_html = category === 'design' && previewRaw ? previewRaw.slice(0, 4000) : null;
    if (!area || !category || !title || !description || !copy_prompt) continue;
    out.push({
      area, category, seo_geo, title, description, copy_prompt,
      priority, risk_score, value_score,
      target_kind, target_path, target_label,
      design_preview_html,
    });
  }
  return out;
}

interface RunOpts {
  /** Override the default Claude model. */
  model?: string;
  /** User id who triggered the scan (null for cron). */
  triggeredBy?: string | null;
}

export interface ScanResult {
  scanId: string;
  status: 'completed' | 'failed';
  recommendationCount: number;
  error?: string;
}

/**
 * Runs a kaizen scan end-to-end: creates the scan row, calls Claude,
 * parses the JSON, inserts recommendations, flips status. Returns a
 * ScanResult with the id + outcome so the caller can show it.
 */
export async function runKaizenScan(
  admin: SupabaseClient,
  opts: RunOpts = {},
): Promise<ScanResult> {
  const model = opts.model || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const { data: scanRow, error: scanErr } = await admin
    .from('kaizen_scans')
    .insert({
      status: 'running',
      model,
      triggered_by: opts.triggeredBy ?? null,
    })
    .select('id')
    .maybeSingle();
  if (scanErr || !scanRow) {
    return { scanId: '', status: 'failed', recommendationCount: 0, error: scanErr?.message ?? 'failed to create scan row' };
  }
  const scanId = scanRow.id as string;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await admin.from('kaizen_scans').update({
      status: 'failed',
      error_message: 'ANTHROPIC_API_KEY is not configured.',
    }).eq('id', scanId);
    return { scanId, status: 'failed', recommendationCount: 0, error: 'ANTHROPIC_API_KEY is not configured.' };
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 6000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: USER_PROMPT }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      const errMsg = `Anthropic API error (${res.status}): ${text.slice(0, 500)}`;
      await admin.from('kaizen_scans').update({ status: 'failed', error_message: errMsg }).eq('id', scanId);
      return { scanId, status: 'failed', recommendationCount: 0, error: errMsg };
    }
    const json = (await res.json()) as ClaudeResponse;
    const raw = (json.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('')
      .trim();
    const recs = parseClaudeJson(raw);
    if (!recs || recs.length === 0) {
      const errMsg = 'Claude returned no parseable recommendations.';
      await admin.from('kaizen_scans').update({ status: 'failed', error_message: errMsg }).eq('id', scanId);
      return { scanId, status: 'failed', recommendationCount: 0, error: errMsg };
    }

    const insertRows = recs.map((r) => ({
      scan_id: scanId,
      area: r.area,
      category: r.category,
      seo_geo: r.seo_geo,
      title: r.title,
      description: r.description,
      copy_prompt: r.copy_prompt,
      priority: r.priority,
      risk_score: r.risk_score,
      value_score: r.value_score,
      target_kind: r.target_kind,
      target_path: r.target_path,
      target_label: r.target_label,
      design_preview_html: r.design_preview_html,
    }));
    const { error: insErr } = await admin.from('kaizen_recommendations').insert(insertRows);
    if (insErr) {
      await admin.from('kaizen_scans').update({ status: 'failed', error_message: insErr.message }).eq('id', scanId);
      return { scanId, status: 'failed', recommendationCount: 0, error: insErr.message };
    }

    await admin.from('kaizen_scans').update({ status: 'completed', scanned_at: new Date().toISOString() }).eq('id', scanId);
    return { scanId, status: 'completed', recommendationCount: recs.length };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await admin.from('kaizen_scans').update({ status: 'failed', error_message: errMsg }).eq('id', scanId);
    return { scanId, status: 'failed', recommendationCount: 0, error: errMsg };
  }
}
